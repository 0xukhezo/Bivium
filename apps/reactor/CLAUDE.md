# Reactor Layer — apps/reactor

RabbitMQ event consumer. Handlers are thin: get use case from container, execute, log. **ZERO business logic.**

Subscriptions today:
- `onchain.event.created` (emitted by the watcher after persisting an OnchainEvent) → `ProcessOnchainEventCommandHandler`
- `user.balance.refresh` (emitted by `ProcessOnchainEventCommandHandler` per affected wallet) → `UpdateBalanceHistoryCommandHandler`

## Structure

```
apps/reactor/src/
├── index.ts                                       # Entry point
├── app.ts                                         # Prisma + RabbitMQ + subscriber lifecycle
├── inversify.config.ts
├── env/
│   └── reactor-environment.ts
├── logger/
│   └── logger.ts
├── container/
│   └── config/configBinding.ts
├── messaging/
│   ├── Subscriber.ts                              # Local RabbitMQ subscriber (not in @bivium/infrastructure)
│   ├── types.ts                                   # SubscriptionBinding type
│   ├── registry.ts                                # List of subscriptions to bind on startup
│   └── subscriptions/
│       ├── onchainEventCreated.subscription.ts
│       └── balanceRefresh.subscription.ts
└── handlers/
    ├── onchain-events/
    │   ├── onOnchainEventCreated.ts
    │   └── schema.ts
    └── balance/
        ├── onUserBalanceRefresh.ts
        └── schema.ts
```

## Event Handler Pattern

```typescript
// handlers/onchain-events/onOnchainEventCreated.ts
export async function onOnchainEventCreated(
  rawPayload: unknown,
  logger: ILogger,
): Promise<void> {
  const parsed = OnchainEventCreatedSchema.parse(rawPayload);

  const handler = container.get<ProcessOnchainEventCommandHandler>(
    APPLICATION_TYPES.ProcessOnchainEventCommandHandler,
  );
  await handler.execute({ onchainEventId: parsed.onchainEventId });
}
```

The handler:
1. Parses the raw message with Zod.
2. Resolves the application command handler from the IoC container.
3. Calls `.execute()`. Nothing else.

## Subscription Pattern

```typescript
// messaging/subscriptions/onchainEventCreated.subscription.ts
export const onchainEventCreatedSubscription: SubscriptionBinding = {
  exchange: "bivium.events",
  queue: "bivium.reactor.onchain-events",
  routingKeys: [ONCHAIN_EVENT_CREATED_ROUTING_KEY],   // import from @bivium/domain
  prefetch: 10,
  handler: async (payload) => {
    await onOnchainEventCreated(payload, logger);
  },
};
```

Add new ones to `messaging/registry.ts` so `Subscriber.bind()` picks them up on startup.

## Chain Diagram

```
HTTP webhook → SaveOnchainEvents → outbox(onchain.event.created)
                                       │
                                       ▼
        bivium.reactor.onchain-events queue
                                       │
                                       ▼
            ProcessOnchainEvent (in tx):
              · markProcessed
              · for each wallet → outbox(user.balance.refresh)
                                       │
                                       ▼
        bivium.reactor.balance-refresh queue
                                       │
                                       ▼
              UpdateBalanceHistory (Alchemy RPC + upsert)
```

## Critical Rules

1. **Handlers are thin** — Zod parse → container.get(handler) → handler.execute(). Nothing else.
2. **Routing keys come from `@bivium/domain`** — never hardcode strings; import the `*_ROUTING_KEY` constants. Keeps producer and consumer in sync.
3. **One subscription per routing key** — don't bind multiple keys to a queue that maps to different domain handlers.
4. **ack on success, nack(requeue=false) on failure** — `Subscriber.bind()` already does this. Failed messages go to nowhere unless you bind a DLQ (TODO).
5. **Idempotency belongs to the application handler** — e.g. `ProcessOnchainEventCommandHandler` checks `event.processed` before doing work. The reactor itself is dumb.

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Event Handler | `on[Event]` | `onOnchainEventCreated`, `onUserBalanceRefresh` |
| Schema | `[Event]Schema` | `OnchainEventCreatedSchema` |
| Subscription | `[event]Subscription` | `onchainEventCreatedSubscription` |
| Queue name | `bivium.reactor.[domain]` | `bivium.reactor.onchain-events` |

## Pre-Implementation Checklist

- [ ] Is there a command handler in `@bivium/application` for this work?
- [ ] Is the routing key constant exported from `@bivium/domain/events`?
- [ ] Created the Zod schema for payload validation?
- [ ] Handler is thin (parse → resolve → execute)?
- [ ] Added subscription to `messaging/registry.ts`?
- [ ] Idempotency handled by the application handler (e.g. check `processed` flag)?
