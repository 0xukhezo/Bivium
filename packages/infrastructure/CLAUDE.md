# Infrastructure Layer — packages/infrastructure

Implements domain/application ports with concrete technologies. Adapts data between external systems and domain entities. Contains NO business logic.

## Structure

```
packages/infrastructure/src/
├── prisma/                # Prisma schema (modular) + client factory
│   ├── schema/
│   │   ├── base.prisma
│   │   ├── enums.prisma
│   │   ├── user.prisma
│   │   ├── assets.prisma
│   │   ├── balances.prisma
│   │   └── webhooks.prisma
│   └── prisma-client-factory.ts
├── repositories/          # Prisma repository implementations
│   ├── BaseRepository.ts
│   ├── OnchainEventRepository.ts
│   ├── OutboxEventRepository.ts
│   ├── UserRepository.ts
│   ├── UserCurrentBalanceRepository.ts
│   └── AssetRepository.ts
├── clients/               # External API clients
│   └── AlchemyClient.ts
├── services/              # Infrastructure services (impl of app/domain ports)
│   ├── AlchemyBalanceFetcher.ts        # implements IAlchemyBalanceFetcherPort
│   └── PrismaTransactionManager.ts     # implements ITransactionManagerPort
├── messaging/             # RabbitMQ
│   └── RabbitMqEventPublisher.ts       # implements IRabbitMQPublisherPort
                                        # (confirm channel + timeout + auto-reconnect)
├── events/
│   └── OutboxAwareEventPublisher.ts    # implements IEventPublisherPort
├── mappers/               # Prisma ↔ Domain transformation
│   ├── OnchainEventMapper.ts
│   ├── UserMapper.ts
│   ├── AssetMapper.ts
│   └── UserCurrentBalanceMapper.ts
├── container/
│   ├── repositoryModule.ts
│   ├── serviceModule.ts
│   └── portsModule.ts
├── types.ts
└── index.ts
```

## Prisma Client

`getPrismaClient()` is a singleton. Repos call it via constructor (no manual setup):

```typescript
abstract class BaseRepository {
  protected prisma: PrismaClient;
  constructor() { this.prisma = getPrismaClient(); }
}
```

## Repository Implementation

```typescript
import type { IUserRepository, User } from "@bivium/domain";
import { mapPrismaUserToDomain } from "../mappers/UserMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class UserRepository extends BaseRepository implements IUserRepository {
  async findByWalletAddress(address: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });
    return record ? mapPrismaUserToDomain(record) : null;
  }
}
```

## Data Mappers

Transform between Prisma models and domain entities. **Never return Prisma models directly.**

## Outbox Pattern Implementation (Two-Phase)

`OutboxAwareEventPublisher` runs in two phases — **atomic write inside the caller's tx**, then **best-effort direct delivery after commit**.

### Phase 1 — `publish(routingKey, payload, tx)`

Called by command handlers inside their `txManager.runInTransaction(fn)`:

1. Inserts an `OutboxEvent` row (status `PENDING`) inside the caller's tx → atomic with the domain write. If the tx rolls back, no phantom event.
2. Records the row id in the current `outboxFlushContext` (AsyncLocalStorage) so the post-commit hook can find it.

### Phase 2 — `flush(outboxIds)`

Called by `PrismaTransactionManager` **after `prisma.$transaction` commits**:

1. For each id, CAS-claim: `UPDATE outbox_events SET status='PROCESSING' WHERE id=$1 AND status='PENDING'`. If 0 rows returned, the background poller already grabbed it — skip.
2. Publish to RabbitMQ via `IRabbitMQPublisherPort` (the raw publisher).
3. Success → `markPublished`. Failure → `resetToPending` (no `attempts++`; the poller owns retry accounting).

Net result: in the happy path, events are delivered to RabbitMQ in <100ms (no waiting for the poll interval). In the failure path (RabbitMQ down, app crash between commit and direct attempt, slow consumer), the row sits `PENDING` and the background `OutboxPollerService` picks it up on its next tick (default 2s).

### Why both phases

| Concern | Phase 1 (in-tx) | Phase 2 (post-commit) |
|---------|-----------------|------------------------|
| Atomic with domain write | ✅ | n/a |
| Survives RabbitMQ outage | ✅ (row persisted) | (skipped silently) |
| Low latency in happy path | ❌ | ✅ |
| Survives app crash mid-publish | ✅ (row persisted) | falls back to poller |

The `OutboxPollerService` running in the watcher acts as the safety net + delivery for cases where Phase 2 didn't fire.

### Wiring

`OutboxAwareEventPublisher` implements **two ports**: `IEventPublisherPort` (used by handlers in Phase 1) and `IPostCommitFlusherPort` (invoked by `PrismaTransactionManager` in Phase 2). Same singleton instance, aliased via `toService`:

```typescript
bind(APPLICATION_TYPES.EventPublisher).to(OutboxAwareEventPublisher).inSingletonScope();
bind(APPLICATION_TYPES.PostCommitFlusher).toService(APPLICATION_TYPES.EventPublisher);
```

### The flush context (AsyncLocalStorage)

`outboxFlushContext` is a module-level `AsyncLocalStorage<{ids: string[]}>`. The flow:

```typescript
// PrismaTransactionManager.runInTransaction:
return outboxFlushContext.run(async () => {
  const result = await this.prisma.$transaction(fn);   // → inside, publisher.publish records ids
  const ids = outboxFlushContext.drain();
  if (ids.length > 0) await this.postCommitFlusher.flush(ids);
  return result;
});
```

If the publisher is invoked outside a tx (rare — backfill scripts, future use cases), `record()` is a no-op and the row goes to the poller. Safe.

## RabbitMQ Publisher (`RabbitMqEventPublisher`)

Single class implementing `IRabbitMQPublisherPort`. Modelled after onchain-terminal's `RabbitMqEventPublisher`.

**Features:**
- **Confirm channel** (`createConfirmChannel()`) — `publish()` only resolves after the broker acks. No silent drops on the producer side.
- **Per-publish timeout** (default 5s) — a slow/hung broker can't block the caller forever; `publishWithConfirm` rejects with a timeout error so the outbox row goes back to `PENDING` for the poller.
- **Auto-reconnect with exponential backoff** — `close` / `error` events on connection or channel trigger `scheduleReconnect` (5s → 60s cap). Single in-flight reconnect via `isReconnecting`.
- **Lazy connect** — `ensureConnection` opens the connection on the first publish. Side-effect-free constructor.
- **Persistent + JSON envelope** — `contentType: "application/json"`, `persistent: true`, `messageId` (UUID), `timestamp`, `appId` (set per app — `"watcher"` / `"reactor"`).
- **Graceful `close()`** — used by app shutdown; safe to call multiple times.

**Config** is bound per app via `APPLICATION_TYPES.RabbitMQPublisherConfig`:

```typescript
// apps/<app>/src/container/config/configBinding.ts
options
  .bind<RabbitMQPublisherConfig>(APPLICATION_TYPES.RabbitMQPublisherConfig)
  .toConstantValue({
    url: environment.rabbitmqUrl,
    exchangeName: "bivium.events",
    exchangeType: "topic",
    appId: "watcher",   // or "reactor"
  });
```

`OutboxAwareEventPublisher.flush()` and `OutboxPollerService.tick()` are the only callers of this publisher. Domain handlers MUST NOT inject it directly — they go through `IEventPublisherPort` (outbox-aware) instead.

### Concurrency / race with the poller

`OutboxEventRepository` exposes two atomic claim primitives:
- `claimPending(limit)` — used by the poller. Batches with `FOR UPDATE SKIP LOCKED`.
- `tryClaim(id)` — used by the post-commit flusher. Single-row CAS: `UPDATE ... WHERE id=$1 AND status='PENDING'` returning rows. If the poller already moved the row to PROCESSING, CAS returns empty → flusher skips. No double-delivery.

```sql
UPDATE "OutboxEvent" SET status='PROCESSING', "lastAttemptAt"=NOW()
WHERE id IN (
  SELECT id FROM "OutboxEvent"
  WHERE status IN ('PENDING','FAILED') AND attempts < 5
  ORDER BY "createdAt" LIMIT $1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

## IoC Registration — 3 Container Modules

| What you're adding | Register in | Bind against |
|--------------------|-------------|--------------|
| Repository | `repositoryModule.ts` | `DOMAIN_TYPES.[Entity]Repository` |
| Service / Client / Adapter | `serviceModule.ts` | `DOMAIN_TYPES.[Service]` |
| Port implementation (EventPublisher, OutboxEventRepository, TransactionManager) | `portsModule.ts` | `APPLICATION_TYPES.[Port]` |

### Inversify v7 ContainerModule syntax

The callback receives a `ContainerModuleLoadOptions` object — destructure `bind` from it. The v6 signature `(bind) => ...` will TYPE-CHECK against the v7 type as "`bind` is the entire options object" and TS will report **"This expression is not callable. Type 'ContainerModuleLoadOptions' has no call signatures."** when you try to call it.

```typescript
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";

// ✅ CORRECT
export const repositoryModule = new ContainerModule(
  ({ bind }: ContainerModuleLoadOptions) => {
    bind(DOMAIN_TYPES.UserRepository).to(UserRepository).inSingletonScope();
    // ...
  },
);
```

Apps load these modules in their `inversify.config.ts`:

```typescript
container.load(configBindings, repositoryModule, portsModule, applicationModule, controllerBindings);
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Repository | `[Entity]Repository` | `UserRepository`, `OnchainEventRepository` |
| Mapper (to domain) | `mapPrisma[Entity]ToDomain` | `mapPrismaUserToDomain` |
| Mapper (from domain) | `mapDomain[Entity]ToPrisma` | `mapDomainUserToPrisma` |
| Client | `[Service]Client` | `AlchemyClient` |
| Service | `[Feature]Service` / `[Feature]Fetcher` | `AlchemyBalanceFetcher` |

## Critical Rules

1. **NO business logic** — infrastructure adapts data, it doesn't decide.
2. **Always use mappers** — never return Prisma models to application layer.
3. **Implement domain interfaces** — `implements IUserRepository`.
4. **ILogger from common** — `import type { ILogger } from "@bivium/common/logger"` (NOT from `@bivium/domain`).
5. **ESM imports** — always `.js` extension.
6. **Outbox publisher uses tx** — `OutboxAwareEventPublisher.publish` MUST accept and use the caller's `tx` client.

## Pre-Implementation Checklist

- [ ] Does a domain/application interface (port) exist for this?
- [ ] Created mapper functions (both directions if needed)?
- [ ] Repository extends `BaseRepository`?
- [ ] Repository implements the domain interface?
- [ ] Handled null cases properly?
- [ ] Zero business logic in the implementation?
- [ ] ILogger imported from `@bivium/common/logger`?
- [ ] Registered in the correct container module (repository / service / ports)?
