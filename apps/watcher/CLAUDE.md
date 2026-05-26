# Watcher Layer — apps/watcher (Alchemy webhook receiver)

Receives and validates Alchemy webhook payloads, then delegates persistence + outbox publication to the application layer. Also runs the outbox poller that ships events to RabbitMQ.

This is a **thin presentation layer** — validate signature, parse payload, call handler, respond.

## Structure

```
apps/watcher/src/
├── index.ts                            # Entry point: loads env, creates App, graceful shutdown
├── app.ts                              # Express setup: middleware, routes, Prisma + RabbitMQ + outbox runner
├── inversify.config.ts                 # IoC container (loads all modules)
├── presentation/
│   ├── routes/
│   │   ├── index.ts                    # Main router: mounts at /api/{version}
│   │   └── webhooks.route.ts           # POST /webhooks/alchemy + GET /health
│   ├── controllers/
│   │   └── WebhooksController.ts       # handleAlchemyWebhook
│   └── system/
│       ├── system.route.ts             # GET /health
│       └── SystemController.ts
├── container/
│   ├── types.ts                        # Aggregated types (controller + config)
│   ├── config/
│   │   ├── configBinding.ts            # Logger, env, alchemy config bindings
│   │   └── configTypes.ts
│   └── controller/
│       ├── controllerTypes.ts
│       └── controllerBinding.ts
├── config/
│   └── alchemy.config.ts               # webhookMiddlewareConfig (static signing key)
├── env/
│   └── watcher-environment.ts          # Env vars + Zod validation
├── middleware/
│   └── errorHandler.ts                 # Global error handler (ApiError, ServiceError)
├── outbox/
│   └── OutboxPollerRunner.ts           # setInterval wrapper around OutboxPollerService.tick()
├── types/
│   └── express.d.ts                    # Express Request augmentation (rawBody)
├── logger/
│   └── logger.ts
└── utils/
    └── print-app-info.ts
```

## Webhook Reception Pattern

`POST /webhooks/alchemy`:
1. Middleware `bodySignatureMiddleware(alchemyMiddlewareConfig)` validates `x-alchemy-signature` HMAC-SHA256 against raw body.
2. Controller `WebhooksController.handleAlchemyWebhook`:
   ```typescript
   const events = [OnchainEvent.createFromAlchemyWebhook(req.body)];
   await this.saveOnchainEventsHandler.execute({ events });
   this.send(res, "OK", 200);
   ```
3. `SaveOnchainEventsCommandHandler` opens a `$transaction` that:
   - Inserts the raw `OnchainEvent` row.
   - Writes ONE `OutboxEvent` per saved event with routing key **`onchain.event.created`** (just the `onchainEventId`).
4. The controller does **not** know about the outbox.

**The webhook handler does NOT interpret the payload** (no wallet extraction, no `user.balance.refresh` emission). That's the reactor's job — the reactor consumes `onchain.event.created`, fetches the saved row, and runs `ProcessOnchainEventCommandHandler` which emits the provider-specific follow-up events. See `packages/application/CLAUDE.md` for the rationale (single responsibility + provider extensibility).

## Signature Verification

**Critical**: Raw body capture is essential. The `verify` callback in `express.json()` stores `req.rawBody` before JSON parsing.

```typescript
app.use(express.json({
  verify: (req, _res, buf) => { (req as any).rawBody = buf.toString(); },
}));
```

Signing key strategy: **static** — `getSigningKey: async () => env.ALCHEMY_SIGNING_KEY`. No DB lookup (single-chain).

## Outbox Poller

The poller runs **inside this process** (not in `apps/reactor`), since the watcher is the natural producer of outbox rows and already has DB + RabbitMQ connections.

```typescript
// outbox/OutboxPollerRunner.ts
setInterval(() => poller.tick(), env.OUTBOX_POLL_INTERVAL_MS);
```

Env: `OUTBOX_POLL_INTERVAL_MS` (default 2000), `OUTBOX_BATCH_SIZE` (default 50), `OUTBOX_MAX_ATTEMPTS` (default 5).

Shutdown: `clearInterval` + drain in-flight ticks on SIGTERM/SIGINT.

## IoC Container Setup

Loads modules in order (`inversify.config.ts`):

1. `commonModule` — Logger, environment
2. `configBindings` — Watcher-specific config (alchemy)
3. `portsModule` — Port implementations (OutboxAwareEventPublisher, OutboxEventRepository, TransactionManager, RabbitMQPublisher)
4. `repositoryModule` — Infrastructure repos
5. `serviceModule` — Infrastructure services (AlchemyBalanceFetcher, etc.)
6. `applicationModule` — Command/Query handlers + OutboxPollerService
7. `controllerBindings` — Controller instances

## Error Handling

Global error handler middleware:
- `HttpUnAuthorizedError` (from bad signature) → 401
- `ServiceError` → 400
- `ApiError` → error's statusCode
- Unknown → 500
- Dev/Local: include error message + stack; Production: generic "Internal Server Error".

## Critical Rules

1. **ZERO business logic** — validate signature, parse payload, call handler, respond.
2. **Always validate signatures** — never accept unverified Alchemy payloads.
3. **Raw body must be preserved** — signature verification needs the original bytes before JSON parsing.
4. **Delegate all processing** — the controller calls `handler.execute()`, it does NOT process data.
5. **Wrap handlers in try/catch** — use `next(error)` to delegate to error handler middleware.
6. **Outbox poller lifecycle** — must start AFTER Prisma + RabbitMQ connect, stop on shutdown.

## Pre-Implementation Checklist

- [ ] Does the application handler exist for this webhook?
- [ ] Is signature verification configured?
- [ ] Is `rawBody` being captured in middleware?
- [ ] Is the route registered in `webhooks.route.ts`?
- [ ] Is the controller method following the parse → delegate → respond pattern?
- [ ] Are environment variables added and validated with Zod?
- [ ] Is the controller registered in `controllerBinding.ts`?
- [ ] Is error handling delegated via `next(error)`?
