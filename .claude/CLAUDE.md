# Bivium - Claude Code Context

## Architecture: Hexagonal / DDD / CQRS

This monorepo follows strict layer separation. **Before writing ANY code**, determine which layer it belongs to.

### Quick Layer Decision

> **"If I swap the database, framework, or external provider — does this code break?"**
> - No → Domain or Application
> - Yes → Infrastructure

> **"Can I test this with zero mocks?"**
> - Yes → Domain
> - Yes, but mocking ports → Application
> - No, needs real DB/API → Infrastructure

### Layer Rules

**DOMAIN** (`packages/domain`): Business core, zero external imports.
- Entities, Value Objects, Aggregates, Domain Events, Domain Errors, Repository interfaces (ports), Domain Services.
- If it imports Prisma, Redis, Axios, or any SDK → it does NOT belong here.

**APPLICATION** (`packages/application`): Use case orchestration via CQRS.
- Command Handlers, Query Handlers, Application Services, DTOs, Port interfaces for external services.
- If it instantiates PrismaClient or calls fetch() → it does NOT belong here.

**INFRASTRUCTURE** (`packages/infrastructure`): Concrete implementations.
- Repository implementations, External API clients, Cache adapters, Message queue adapters, Mappers (Prisma↔Domain).
- If it contains business `if` logic (e.g. `if (token.volume > threshold)`) → that logic belongs in Domain.

**PRESENTATION** (`apps/*`): Entry points, zero business logic.
- Controllers, Routes, Middleware, Event handlers (Reactor), Webhook receivers (Watcher).
- If it does more than validate input → call handler → map response → it's doing too much.

### Dependency Rule (NEVER violate)

```
Presentation → Application → Domain
Infrastructure → Domain (implements ports)
Infrastructure → Application (implements ports)

Domain NEVER imports from Application, Infrastructure, or Presentation.
Application NEVER imports from Infrastructure or Presentation.
```

### Smell Tests

- **Domain imports a library?** → Extract to infrastructure, keep interface in domain.
- **Application instantiates a client?** → Use a port.
- **Infrastructure has business conditionals?** → Move rule to domain entity/service.
- **Controller has logic beyond validate/call/map?** → Move to application handler.

---

## Monorepo Structure

```
bivium/
├── apps/
│   ├── api/         # REST API (Express)
│   ├── reactor/     # RabbitMQ event consumer (balance refresh, future: JIT auto-forward)
│   ├── watcher/     # Alchemy webhook receiver — this is the "webhooks" app
│   ├── web/         # Next.js frontend
│   └── contracts/   # Solidity (Foundry) — Bivium Morpho-based contracts
├── packages/
│   ├── domain/         # Entities, repository interfaces, events, errors
│   ├── application/    # Command/Query handlers, DTOs, port interfaces
│   ├── infrastructure/ # Prisma repos, Alchemy client, RabbitMQ, mappers
│   ├── common/         # Shared logger, Api base, middlewares, errors
│   └── ui/             # Shared React components for web
```

---

## Universal Rules

1. **Package manager**: `pnpm` only. Never npm, never yarn.
2. **ESM imports**: Always use `.js` extension in relative imports.
3. **Package aliases**: `@bivium/domain`, `@bivium/application`, `@bivium/infrastructure`, `@bivium/common`.
4. **IoC**: **Inversify v7+** (`^7.10.4`) for ALL dependency injection. No manual instantiation of services. The v7 API differs from v6 — see the "Inversify v7 specifics" section below.
5. **Search first**: Always look for similar existing code before creating new files.
6. **Logger**: `ILogger` lives in `@bivium/common/logger`, NOT in `@bivium/domain`.
7. **Handler decorators**: ALL handlers that extend `BaseUseCase` need `@injectable()` AND `@injectFromBase()`, plus `super()` with no args. The logger is property-injected from the base — DO NOT re-inject it in the child constructor.
8. **Code comments / NatSpec**: English only, even when chatting in Spanish.
9. **Outbox pattern for events**: never publish directly to RabbitMQ from a domain write. Always write `OutboxEvent` in the same `$transaction`, then let `OutboxPollerService` publish.

### Inversify v7 specifics

These are the v7 patterns — using v6 syntax (which the docs/Stack Overflow often show) will give silent runtime failures or type errors.

**`ContainerModule` callback** takes an `options` object, not a `bind` function directly:

```typescript
// ❌ WRONG — v6 syntax. `bind` will be typed as ContainerModuleLoadOptions and TS yells "not callable".
new ContainerModule((bind) => {
  bind(TYPES.X).to(X);
});

// ✅ CORRECT — destructure from the options object.
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";

new ContainerModule(({ bind }: ContainerModuleLoadOptions) => {
  bind(TYPES.X).to(X).inSingletonScope();
});
```

**`@injectFromBase()`** is required on any class extending `BaseUseCase` (or any class with property-injected parents). Without it, the parent's `@inject` decorators are silently ignored and the property is `undefined` at runtime.

```typescript
// ❌ WRONG — this.logger will be undefined at runtime, no error at boot
@injectable()
export class MyHandler extends BaseUseCase<In, Out> {
  constructor(@inject(...) private foo: IFoo) { super(); }
}

// ✅ CORRECT
@injectable()
@injectFromBase()
export class MyHandler extends BaseUseCase<In, Out> {
  constructor(@inject(...) private foo: IFoo) { super(); }
}
```

The child constructor lists ONLY its own dependencies — never re-inject the logger; it comes from the base.

---

## Essential Commands

```bash
pnpm dev                # Start all services
pnpm dev:api            # API only
pnpm dev:watcher        # Watcher only (webhook receiver)
pnpm dev:reactor        # Reactor only
pnpm dev:web            # Web only
pnpm build              # Build monorepo
pnpm test               # Run tests
pnpm typecheck          # Type check
pnpm lint               # Lint with Biome
pnpm prisma:generate    # Generate Prisma client
pnpm db:migrate         # Run migrations
```

---

## Layer-Specific Documentation

Each package/app has its own CLAUDE.md with detailed patterns. **Read your layer's CLAUDE.md before writing any code.**

- `packages/domain/CLAUDE.md` — Entity patterns, repository interfaces, service ports, domain events
- `packages/application/CLAUDE.md` — CQRS handlers, DTOs, BaseUseCase, IoC registration
- `packages/infrastructure/CLAUDE.md` — Prisma repositories, external clients, mappers, outbox impl
- `packages/common/CLAUDE.md` — Shared utilities, Api base, errors, logger, middlewares
- `apps/watcher/CLAUDE.md` — Alchemy webhook receiver, signature verification, outbox runner
- `apps/reactor/CLAUDE.md` — Event handlers, subscriptions, middleware composition
- `apps/api/CLAUDE.md` — Controllers, routes, request validation

---

## Implementation Checklist (after writing code)

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All IoC registrations are in place (types.ts, modules, inversify.config)
- [ ] All exports are in place (index.ts for each package)
- [ ] No domain imports from application/infrastructure/presentation
- [ ] No application imports from infrastructure/presentation
- [ ] No business logic in controllers or repositories
- [ ] All handlers have `@injectable()` + `@injectFromBase()` + `super()`
- [ ] All relative imports use `.js` extension
- [ ] Mappers exist for all Prisma↔Domain conversions
- [ ] Events published via outbox, not directly to RabbitMQ
