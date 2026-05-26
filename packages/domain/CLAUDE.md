# Domain Layer — packages/domain

This is the business core. ZERO external dependencies. If you need to import any library, it does NOT belong here.

## Structure

```
packages/domain/src/
├── entities/           # Domain entities
├── value-objects/      # Value objects (data types, domain events)
├── repositories/       # Repository INTERFACES only (ports)
├── services/           # Service INTERFACES only (ports)
├── events/             # Domain events (class-based or discriminated unions)
├── errors/             # Domain-specific errors
├── types.ts            # Inversify injection symbols
└── index.ts            # Public exports
```

## Entities

Entities have identity and contain business validations:

```typescript
export class User {
  public id: string;
  public walletAddress: string;
  public createdAt: Date;

  constructor(props: { id: string; walletAddress: string; createdAt: Date }) {
    this.id = props.id;
    this.walletAddress = props.walletAddress.toLowerCase();
    this.createdAt = props.createdAt;
  }
}
```

## Repository Interfaces (Ports)

Define contracts WITHOUT implementation details. Never reference Prisma, SQL, or any storage technology:

```typescript
export interface IUserRepository {
  findByWalletAddress(address: string): Promise<User | null>;
}
```

## Factory Methods in Entities

Entities can provide static factory methods for construction from external data:

```typescript
export class OnchainEvent {
  static createFromAlchemyWebhook(
    payload: AlchemyWebhookPayload,
  ): Omit<OnchainEvent, "id"> {
    return {
      provider: OnchainEventProvider.ALCHEMY,
      payload: JSON.stringify(payload),
      processed: false,
      error: false,
      timesProcessed: 0,
      lastProcessedAt: null,
      createdAt: new Date(payload.createdAt),
    };
  }
}
```

## Injection Types — 3 Namespaces

`packages/domain/src/types.ts` has 3 separate namespaces:

| Namespace | When to use |
|-----------|-------------|
| `DOMAIN_REPOSITORY_TYPES` | Repository interfaces (`I[Entity]Repository`) |
| `DOMAIN_SERVICE_TYPES` | Service ports (`I[Feature]Service`, `I[Feature]Channel`) |
| `DOMAIN_CONFIG_TYPES` | Config objects injected into infrastructure |

```typescript
export const DOMAIN_TYPES = {
  ...DOMAIN_REPOSITORY_TYPES,
  ...DOMAIN_SERVICE_TYPES,
  ...DOMAIN_CONFIG_TYPES,
};
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity | PascalCase singular | `User`, `OnchainEvent`, `UserCurrentBalance` |
| Repository Interface | Prefix `I` | `IUserRepository`, `IOnchainEventRepository` |
| Service Interface | Prefix `I` | `IEventChannel` |
| Value Object | PascalCase descriptive | `UserBalanceRefreshEvent` |
| Domain Error | Suffix `Error` | `ResourceNotFoundError` |

## Critical Rules

1. **ZERO external imports** — no Prisma, no Redis, no Axios, no Express, no SDK.
2. **Interfaces only for data access** — never implement a repository here.
3. **Business validations only** — `if (amount <= 0)` is OK. `if (!prisma.validate())` is NOT.
4. **ESM imports** — always `.js` extension.
5. **No async for business logic** — synchronous where possible. Async belongs to ports.

## Pre-Implementation Checklist

- [ ] Is this a business concept (entity) or just data (DTO)?
- [ ] Does it have identity (entity) or is it compared by value (value object)?
- [ ] Are ALL validations business rules, not technical?
- [ ] Zero external dependencies?
- [ ] Added to `types.ts`?
- [ ] Exported from `index.ts`?
