# Bivium

> **Be your own Aave.** Two paths. One loan. No pool.
>
> *Lending as an orderbook. Wallets are the makers.*

Bivium is a lending primitive where **any personal wallet (EOA) becomes a single-lender lending venue** — with its own terms, its own risk config, and its own on-chain identity. No governance, no aggregated pool, no forced loss socialization.

Built for the **[Arbitrum Open House](https://openhouse.arbitrum.io/) London Buildathon** (May–June 2026).

---

## The idea in 30 seconds

Pooled lending (Aave, Compound) forces passive depositors to inherit risk decisions they never signed off on. When the rsETH/Kelp incident hit in April 2026, WETH depositors discovered their funds had been financing rsETH positions they never approved — and the blast radius was the protocol's *entire* TVL.

Bivium flips the model:

- **Your wallet is the protocol.** Your EOA — with its ENS, history, and reputation — becomes a single-lender venue (a *bivium*).
- **You sign your terms.** Which collaterals you accept, which rate, which LTV. No DAO decides for you.
- **Risk is consensual.** When something breaks, the damage stays with the lenders who actively signed that exposure — not with bystanders.
- **Lending becomes an orderbook.** Each active bivium is a resting limit order priced by the lender's rate and sized by their wallet balance. Borrowing is a market order that walks the book and fills against one or many lenders atomically.

This is only possible now thanks to **ERC-7702** (Pectra, May 2025): an EOA can delegate its execution to a smart contract *without* changing its address, losing its history, or moving its assets. The lender identity lives **in** the wallet, not beside it.

> Full product context, design decisions, and the pitch live in [`docs/bivium-context.md`](docs/bivium-context.md).

---

## Architecture

Bivium is a **pnpm + Turborepo monorepo** following strict **hexagonal / DDD / CQRS** layering (see [`.claude/CLAUDE.md`](.claude/CLAUDE.md)). On-chain state flows through a real-time pipeline that keeps the orderbook, balances, and lender registry continuously fresh:

```
            ┌────────────────────────────────────────────────────────────┐
            │                Arbitrum (Bivium contracts)                   │
            │   Bivium.sol · BiviumProfile.sol · BiviumRouter.sol          │
            │   BiviumEventEmitter.sol                                     │
            └───────────────┬───────────────────────────┬────────────────┘
                            │ contract events           │ wallet activity
                            ▼                            ▼
                    ┌───────────────┐            ┌────────────────┐
                    │   indexer     │            │    watcher     │
                    │   (Ponder)    │            │ Alchemy webhook│
                    │               │            │   receiver     │
                    │ lenders,      │            │                │
                    │ profiles,     │            │ writes raw     │
                    │ markets,      │            │ OnchainEvent   │
                    │ fills, the    │            │ + outbox       │
                    │ orderbook     │            └───────┬────────┘
                    └───────┬───────┘                    │ RabbitMQ
                            │                            ▼
                            │   ┌──────────────┐  ┌────────────────┐
                            │   │     jobs     │  │    reactor     │
                            │   │  schedulers  │  │ event consumer │
                            │   │              │  │                │
                            │   │ sync lender  │  │ refresh wallet │
                            │   │ addrs into   │  │ balances →     │
                            │   │ Alchemy      │  │ live orderbook │
                            │   │ webhook,     │  │ size           │
                            │   │ price feeds  │  └────────────────┘
                            │   └──────────────┘
                            ▼
                    ┌───────────────┐            ┌────────────────┐
                    │     api       │ ─────────▶ │      web       │
                    │  REST (read)  │            │   Next.js UI   │
                    └───────────────┘            └────────────────┘
```

---

## Applications (`apps/`)

| App | Stack | Responsibility |
|---|---|---|
| **`contracts`** | Solidity · Foundry | The on-chain primitive. A minimal Morpho Blue fork plus the ERC-7702 delegate, the orderbook router, and the event surface. |
| **`indexer`** | Ponder | Real-time event indexer. Captures **every lender, profile, market, and fill** the moment it happens and projects it into the `indexer` Postgres schema. This is the source of truth for the orderbook and the lender registry. |
| **`watcher`** | Express | Alchemy **webhook receiver**. Validates the HMAC signature, persists the raw on-chain event, and writes an outbox row in the same transaction. Runs the outbox poller that ships events to RabbitMQ. |
| **`jobs`** | node-schedule | Background schedulers. **Syncs indexed lender addresses into the Alchemy address-activity webhook** (so the watcher gets notified about lender wallet movements) and refreshes asset price feeds. |
| **`reactor`** | RabbitMQ consumer | Reacts to events published by the watcher. **Refreshes wallet balances** so the orderbook always shows each lender's live indicative size (`balanceOf`). Future home of the JIT auto-forward loop. |
| **`api`** | Express | REST read API consumed by the frontend — markets, lenders, borrowers, and market-depth endpoints. |
| **`web`** | Next.js 14 · wagmi/viem | The frontend. Borrower orderbook view, lender configuration dashboard, repay/borrow flows, ENS resolution. |

### Why webhooks + an indexer (and not just one)

The two ingestion paths serve different needs and complement each other:

- **The indexer (Ponder)** captures **contract events** — lender registrations, profile config changes, market creation, fills. It backfills, handles reorgs, and checkpoints for free. This is how Bivium knows *who the lenders are*, *what terms they offer*, and *what the orderbook looks like* in real time.
- **The watcher (Alchemy webhooks)** captures **wallet activity** — value moving in and out of lender EOAs. Because a lender's orderbook size is `balanceOf(lender)` (indicative, not locked), balances must update the instant funds move. Webhooks push that change immediately; the reactor consumes it and refreshes the balance so the displayed depth never goes stale.

The **jobs** app is the bridge: it feeds freshly-indexed lender addresses into the Alchemy webhook subscription so newly-activated lenders are watched automatically.

---

## Packages (`packages/`)

Hexagonal layers, strict dependency rule (`Presentation → Application → Domain`, `Infrastructure → Domain/Application`):

| Package | Layer | Contents |
|---|---|---|
| **`domain`** | Domain | Entities, value objects, domain events, errors, repository interfaces (ports). Zero external imports. |
| **`application`** | Application | CQRS command/query handlers, DTOs, port interfaces. Orchestration only. |
| **`infrastructure`** | Infrastructure | Prisma repositories, Alchemy client, RabbitMQ adapters, mappers, outbox implementation. |
| **`common`** | Shared | Logger, API base, middlewares, shared errors. |
| **`ui`** | Shared | React components shared by the web app. |

---

## Smart contracts

Four contracts under `apps/contracts/src/` (see [`docs/bivium-context.md` §6.3](docs/bivium-context.md)):

- **`Bivium.sol`** — minimal Morpho Blue fork. Inline `ratePerSecond` per market (no external IRM) and **auto-forward** of idle supply back to the lender's EOA after every repay/liquidation, so lender capital is never trapped.
- **`BiviumProfile.sol`** — the ERC-7702 delegate template. Holds the lender's rate, collateral whitelist, and pause flag; performs JIT supply (`fulfillBorrow`) with only transient approvals.
- **`BiviumRouter.sol`** — the stateless orderbook executor. A borrower submits one `BorrowOrder` (loan/collateral amounts, slippage cap, min health factor, candidate lenders). The router walks the book, fills greedily inside a `try/catch`, and reverts atomically if coverage, slippage, or health-factor bounds aren't met.
- **`BiviumEventEmitter.sol`** — centralized event surface (gated by `EXTCODEHASH`) so the indexer listens to one address instead of a dynamic factory.

---

## Tech stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript (ESM, `.js` import extensions), Solidity (Foundry)
- **Architecture:** Hexagonal / DDD / CQRS, Inversify v7 for DI
- **Data:** PostgreSQL, Prisma (`public` schema), Drizzle via Ponder (`indexer` schema)
- **Messaging:** RabbitMQ (transactional outbox pattern)
- **On-chain:** Arbitrum, ERC-7702, Alchemy (RPC + webhooks), Morpho Blue (forked)
- **Frontend:** Next.js 14, React 18, wagmi / viem / ethers, Tailwind CSS
- **Tooling:** Biome (lint/format), Vitest

---

## Getting started

Requires Node ≥ 20, pnpm 10, Docker (for local Postgres + RabbitMQ), and Foundry (for contracts).

```bash
# Install dependencies
pnpm install

# Start local infra (Postgres + RabbitMQ)
docker compose -f docker-compose-local.yml up -d

# Configure environment
cp .env.example .env   # fill in the values

# Generate Prisma client + run migrations
pnpm prisma:generate
pnpm db:migrate

# Run everything
pnpm dev
```

### Per-service dev

```bash
pnpm dev:api        # REST API
pnpm dev:watcher    # Alchemy webhook receiver
pnpm dev:reactor    # RabbitMQ consumer
pnpm dev:jobs       # schedulers
pnpm dev:indexer    # Ponder indexer
pnpm dev:web        # Next.js frontend
```

### Quality gates

```bash
pnpm typecheck      # type-check the monorepo
pnpm lint           # Biome
pnpm test           # Vitest
pnpm build          # build all
```

---

## Project structure

```
bivium/
├── apps/
│   ├── api/         # REST read API (Express)
│   ├── reactor/     # RabbitMQ consumer — balance refresh, JIT loop
│   ├── watcher/     # Alchemy webhook receiver
│   ├── jobs/        # Schedulers — lender→webhook sync, price feeds
│   ├── indexer/     # Ponder event indexer (isolated bounded context)
│   ├── web/         # Next.js frontend
│   └── contracts/   # Solidity (Foundry) — Morpho-based contracts
├── packages/
│   ├── domain/         # Entities, ports, events, errors
│   ├── application/    # CQRS handlers, DTOs
│   ├── infrastructure/ # Prisma repos, Alchemy, RabbitMQ, mappers
│   ├── common/         # Logger, API base, middlewares
│   └── ui/             # Shared React components
└── docs/
    ├── bivium-context.md   # Full product context & pitch
    └── DESIGN_SYSTEM.md
```

---

## Hackathon

Bivium was built for the [Arbitrum Open House](https://openhouse.arbitrum.io/) London Buildathon (May–June 2026).
