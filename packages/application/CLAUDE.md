# Application Layer — packages/application

This is the MOST CRITICAL layer. ALL business logic orchestration lives here. Follows CQRS: Commands for writes, Queries for reads.

## Structure

```
packages/application/src/
├── base/
│   └── BaseUseCase.ts              # Base class for all handlers
├── container/
│   └── ApplicationModule.ts        # Inversify module bindings
├── ports/                          # Interfaces for external services
│   ├── IEventPublisherPort.ts
│   ├── IRabbitMQPublisherPort.ts
│   ├── IOutboxEventRepository.ts
│   ├── ITransactionManagerPort.ts
│   └── IAlchemyBalanceFetcherPort.ts
├── usecases/
│   ├── webhooks/
│   │   ├── commands/
│   │   │   └── SaveOnchainEventsCommandHandler.ts
│   │   └── dtos/
│   ├── balances/
│   │   ├── commands/
│   │   │   └── UpdateBalanceHistoryCommandHandler.ts
│   │   └── dtos/
│   └── outbox/
│       └── services/
│           └── OutboxPollerService.ts
├── types.ts                        # Centralized APPLICATION_TYPES
└── index.ts                        # Re-exports
```

## CQRS Pattern

- **Commands** (writes): `SaveOnchainEventsCommandHandler`, `UpdateBalanceHistoryCommandHandler`
- **Queries** (reads): `Get[X]QueryHandler`, `List[X]QueryHandler`

## Creating a Handler — Full Flow

### 1. Create DTOs (single file, input + output)

```typescript
// usecases/webhooks/dtos/SaveOnchainEventsCommandDto.ts
export type SaveOnchainEventsCommandInputDto = {
  events: Array<Omit<OnchainEvent, "id">>;
};

export type SaveOnchainEventsCommandOutputDto = {
  savedCount: number;
};
```

### 2. Implement Handler

The handler extends `BaseUseCase`. **Do NOT inject the logger** in the child constructor — it's already property-injected on the base. Just `@injectable()` + `@injectFromBase()` + `super()` (no args) and use `this.logger` directly inside `execute`.

```typescript
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import { DOMAIN_TYPES } from "@bivium/domain";
import type { IOnchainEventRepository } from "@bivium/domain";
import { APPLICATION_TYPES } from "../../../types.js";
import type { IEventPublisherPort } from "../../../ports/IEventPublisherPort.js";
import type { ITransactionManagerPort } from "../../../ports/ITransactionManagerPort.js";

@injectable()
@injectFromBase()  // CRITICAL: without this, this.logger is undefined at runtime!
export class SaveOnchainEventsCommandHandler extends BaseUseCase<
  SaveOnchainEventsCommandInputDto,
  SaveOnchainEventsCommandOutputDto
> {
  constructor(
    @inject(DOMAIN_TYPES.OnchainEventRepository)
    private onchainEventRepository: IOnchainEventRepository,
    @inject(APPLICATION_TYPES.EventPublisher)
    private eventPublisher: IEventPublisherPort,
    @inject(APPLICATION_TYPES.TransactionManager)
    private tx: ITransactionManagerPort,
  ) {
    super();  // REQUIRED. No args — logger comes from base.
  }

  async execute(input) {
    return this.tx.runInTransaction(async (txClient) => {
      // ... logic ...
      this.logger.info("Done", { savedCount });  // ← inherited from BaseUseCase
      return { savedCount };
    });
  }
}
```

### 3. Register in 5 places

```
1. packages/application/src/usecases/[module]/types.ts   ← Add Symbol
2. packages/application/src/usecases/[module]/index.ts   ← Export handler + DTOs
3. packages/application/src/types.ts                     ← Merge into APPLICATION_TYPES
4. packages/application/src/container/ApplicationModule.ts ← bind(Symbol).to(Handler)
5. packages/application/src/index.ts                     ← Re-export
```

If ANY step is missed, you get Inversify "No matching bindings" at runtime.

## Why `@injectFromBase()` Is Required (Inversify v7)

`BaseUseCase` has a property-injected logger:

```typescript
@injectable()
export abstract class BaseUseCase<TInput, TOutput> {
  @inject(COMMON_TYPES.Logger)
  protected logger!: ILogger;
  abstract execute(input: TInput): Promise<TOutput>;
}
```

In **Inversify v7**, child classes do NOT inherit the parent's `@inject` decorators automatically. You must opt in with `@injectFromBase()`:

```typescript
// ❌ WRONG — this.logger is undefined at runtime; no error at boot, no error at handler resolution.
@injectable()
export class MyHandler extends BaseUseCase { ... }

// ❌ ALSO WRONG — re-injecting the logger in the constructor works but duplicates the contract
// and breaks the purpose of BaseUseCase (which exists precisely so handlers don't re-declare it).
@injectable()
export class MyHandler extends BaseUseCase {
  constructor(@inject(COMMON_TYPES.Logger) logger: ILogger, ...) { super(logger); }  // ← anti-pattern
}

// ✅ CORRECT — child only declares its own dependencies; logger comes from base.
@injectable()
@injectFromBase()
export class MyHandler extends BaseUseCase {
  constructor(@inject(DOMAIN_TYPES.SomeRepo) private repo: IRepo) { super(); }
}
```

**Why this pattern exists:** every use case needs a logger. Without `BaseUseCase` + `@injectFromBase`, every single handler would re-declare it. The base + decorator combo means new handlers only list their domain dependencies, which keeps signatures short and forces a consistent logger binding across the codebase.

**Note**: `OutboxPollerService` is NOT a use case (it doesn't extend `BaseUseCase` — it has `tick()`, not `execute()`), so it injects the logger directly in its constructor.

## Outbox Pattern (Event Publishing)

When a use case needs to emit an event to RabbitMQ, **never** call the bus directly. Always go through `IEventPublisherPort`, which under the hood writes an `OutboxEvent` row in the same DB transaction. A separate `OutboxPollerService` (runs in `apps/watcher`) publishes the row to RabbitMQ and marks it `PUBLISHED`.

```typescript
// Inside a handler — already in tx
await this.eventPublisher.publish(
  "user.balance.refresh",
  { address, chainId: 42161 },
  txClient,  // ← join the same tx as the domain write
);
```

This guarantees zero event loss even if RabbitMQ is down at the moment of the webhook.

## Save vs Process Split (one use case = one responsibility)

When a use case persists data that other parts of the system need to act on, **emit a "created" event with just the id** and put the interpretation logic in a separate handler that the reactor invokes. Do NOT combine persistence + interpretation in the same handler.

**Concrete example — onchain events:**

| Step | Handler | Responsibility |
|------|---------|----------------|
| 1 | `SaveOnchainEventsCommandHandler` | INSERT into `onchain_events` + emit `onchain.event.created` (just the row id). NO payload interpretation. |
| 2 | `ProcessOnchainEventCommandHandler` | `findById` → check `processed` (idempotency) → provider-specific interpretation (extract wallets, decode logs, etc.) → emit follow-up events → `markProcessed`. ALL in one tx. |
| 3 | `UpdateBalanceHistoryCommandHandler` | Acts on the follow-up event (e.g. `user.balance.refresh`). |

**Why split it:**
- The webhook responder stays minimal — fast 200 OK, no payload decoding on the hot path.
- Adding a new provider (Helius, custom relayer) means a new branch inside `ProcessOnchainEventCommandHandler` (or a new dedicated processor), not touching the persistence handler.
- Replay/retry is natural: if `ProcessOnchainEvent` fails, the row stays `processed=false` and the reactor delivery retries.
- Single-responsibility — each handler is easy to test in isolation.

**Anti-pattern (do NOT do this):**

```typescript
// ❌ WRONG — one handler doing two jobs
class SaveOnchainEventsCommandHandler {
  async execute(input) {
    return tx.runInTransaction(async (tx) => {
      await repo.createInTransaction(tx, event);
      const wallets = OnchainEvent.extractAffectedWallets(event.payload);  // ← interpretation
      for (const w of wallets) {
        await publisher.publish("user.balance.refresh", { address: w }, tx);  // ← follow-up
      }
    });
  }
}
```

```typescript
// ✅ CORRECT — Save only persists + announces; Process interprets in a separate use case.
class SaveOnchainEventsCommandHandler {
  async execute(input) {
    return tx.runInTransaction(async (tx) => {
      const saved = await repo.createInTransaction(tx, event);
      await publisher.publish("onchain.event.created", { onchainEventId: saved.id }, tx);
    });
  }
}

class ProcessOnchainEventCommandHandler {
  async execute({ onchainEventId }) {
    const event = await repo.findById(onchainEventId);
    if (event.processed) return { skipped: true };
    return tx.runInTransaction(async (tx) => {
      // provider-specific interpretation + follow-up events here
      await repo.markProcessedInTransaction(tx, event.id);
    });
  }
}
```

The general rule: **if a use case writes a row AND emits domain-meaningful follow-up events derived from that row's payload, split into two handlers and bridge them with a `<entity>.created` event.**

## Critical Rules

1. **Both decorators ALWAYS**: `@injectable()` + `@injectFromBase()` + `super()`.
2. **Logger via BaseUseCase**: use `this.logger`, never inject logger in constructor.
3. **One handler = one responsibility**. For complex flows, compose handlers.
4. **Handler-specific DTOs**: NEVER share DTOs between handlers.
5. **ALL business logic HERE**: Controllers only call handlers.
6. **Depend on ports only**: never import concrete implementations.
7. **Single DTO file per handler**: Input + Output DTOs in one `[HandlerName]Dto.ts`.
8. **Events via outbox**: always publish through `IEventPublisherPort` inside a tx.

## Pre-Implementation Checklist

- [ ] Is this a Command (write) or Query (read)?
- [ ] Does a similar handler already exist?
- [ ] Created DTOs in a single file (input + output)?
- [ ] Handler extends `BaseUseCase`?
- [ ] Added BOTH `@injectable()` AND `@injectFromBase()`?
- [ ] Called `super()` in constructor?
- [ ] Added to module `types.ts`?
- [ ] Exported from module `index.ts`?
- [ ] Updated central `types.ts`?
- [ ] Registered in `ApplicationModule.ts`?
- [ ] If publishing events: using outbox via `IEventPublisherPort` with current tx?
