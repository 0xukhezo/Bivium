# Indexer Layer — apps/indexer (Ponder)

Ponder-based event indexer for Bivium on Arbitrum mainnet. Listens to three
single-address contracts (`Bivium`, `BiviumEventEmitter`, `BiviumRouter`) and
projects every state-changing event into a Postgres schema (`indexer`) that
the rest of the monorepo reads.

**This is an isolated bounded context.** It does NOT follow the hexagonal /
DDD / CQRS rules that govern the rest of the repo. It does NOT import from
`@bivium/domain`, `@bivium/application`, `@bivium/infrastructure`, or
`@bivium/common`. The indexer is intentionally a presentation+infra fusion —
that's the right shape for a stateful indexer and forcing ports on it would
add code without value.

The contract from the rest of the monorepo's perspective is: **"the `indexer`
Postgres schema is read-only, eventually consistent, and reorg-safe."**

## Structure

```
apps/indexer/
├── README.md                # Operator-facing: how to run, env vars
├── CLAUDE.md                # This file — the why
├── .env.example
├── package.json             # @bivium/indexer — workspace package
├── tsconfig.json            # strict, noEmit, NodeNext ESM
├── ponder.config.ts         # chains + contracts + database
├── ponder.schema.ts         # All 15 tables (onchainTable)
├── abis/                    # Auto-extracted from apps/contracts/out/
│   ├── BiviumAbi.ts
│   ├── BiviumEventEmitterAbi.ts
│   └── BiviumRouterAbi.ts
└── src/
    ├── index.ts             # Registers all handler modules
    ├── emitter.ts           # BiviumEventEmitter:* handlers
    ├── bivium.ts            # Bivium:* handlers
    ├── router.ts            # BiviumRouter:* handlers
    └── lib/
        └── ids.ts           # lower() helper for address normalization
```

## Why Ponder (not the alternatives)

The decision was made on these axes — recorded here so it's not relitigated
every time someone wonders:

| Option | Why rejected |
|---|---|
| Extend `apps/watcher` with Alchemy webhooks + custom backfill | Webhooks don't backfill; reorg handling, checkpointing, retries become ~1 week of plumbing. Ponder gives all of that for free. |
| The Graph / Subgraph | GraphQL-only, no Prisma read-side, slow deploy iteration. |
| Envio (HyperIndex) | Faster benchmarks but smaller ecosystem; DX with our TS/Node stack is rougher. |
| Custom viem + Prisma indexer | Full control, ~1 week of reorg/checkpoint plumbing for v1. Not worth it for the hackathon. |

The trade-off accepted: **the indexer uses Drizzle (Ponder's ORM), not
Prisma.** Prisma stays on the `public` schema; the indexer writes to its own
schema; Prisma reads back via multi-schema introspection (wired up in a later
iteration, not this one).

## Database sharing strategy

Single Postgres cluster, three logical schemas:

```
public      ← Prisma owns (migrations, writes, reads)
indexer_*   ← Ponder owns (per-deploy private schema for indexing + reorgs)
indexer     ← Stable views schema (external apps read from here)
```

Ponder's blue/green pattern:
1. New deploy starts → Ponder writes to a fresh `indexer_<sha>` schema.
2. Backfill completes → Ponder atomically renames views in `indexer` to point
   at the new schema.
3. External readers (future `apps/api` / `apps/web` via Prisma) see a clean
   cut-over; no partial state.

`DATABASE_SCHEMA` and `DATABASE_VIEWS_SCHEMA` env vars control this. See
[`.env.example`](./.env.example).

**Prisma migrations must never touch `indexer*` schemas.** When the read-side
lands, the Prisma config will be:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "indexer"]
}
```

And the indexer-schema models are tagged with `@@schema("indexer")` and
marked as read-only by convention (no `save`/`update`/`delete` repos).

## Schema design — the decisions that matter

The schema lives in [`ponder.schema.ts`](./ponder.schema.ts). Tables fall
into four groups:

### A. Lender identity + configuration

| Table | Source | Why this shape |
|---|---|---|
| `lenders` | `LenderRegistered`, `Paused`, `Unpaused` | One row per delegated EOA. Current pause state, no history. |
| `lender_rates` | `RateSet` | PK `(lender, loanToken)`. **Only current state** — no history table. Past rates are recoverable from on-chain logs if ever needed. |
| `lender_collaterals` | `AllowedCollateralsSet`, `AllowedCollateralAdded`, `AllowedCollateralRemoved` | Flat membership table. PK `(lender, collateral)`. `AllowedCollateralsSet` is a **bulk replace** — see handler note below. |
| `tokens` | `TokenConfigSet`, `TokenConfigRemoved` | Protocol-curated whitelist. `active=false` rows are kept (existing markets still reference the old `(oracle, lltv)`). |

### B. Markets + positions (mutable derived state)

| Table | Source | Why this shape |
|---|---|---|
| `markets` | `CreateMarket` + all balance-changing events | PK = bytes32 market id. `total*` fields kept in sync by handlers; `lastAccrualTimestamp` lets API compute accrued interest without RPC. |
| `positions` | `Borrow`, `Repay`, `SupplyCollateral`, `WithdrawCollateral`, `Liquidate` | PK `(marketId, borrower)`. **Health factor is NOT stored** — requires live oracle price and goes stale instantly. |

### C. Orderbook activity (Router)

| Table | Source | Why this shape |
|---|---|---|
| `orders` | `OrderFilled` | One row per successful BorrowOrder. Borrower-facing view. |
| `fills` | `Fill` | N rows per parent order, same tx. `orderTxHash` is the join key back to `orders` (not a real FK — Ponder doesn't model FKs). |

### D. Per-event activity logs

Eight tables, one per `Bivium` event type: `borrows`, `repays`, `supplies`,
`withdrawals`, `supply_collaterals`, `withdraw_collaterals`, `liquidations`,
`auto_forwards`. All keyed `(txHash, logIndex)` for reorg safety. Used by:
- per-market history charts
- per-user activity feed
- the lender's "principal returned" view (`auto_forwards` filtered by
  `creator`)

`AccrueInterest` is the one event that does NOT get its own log table — only
the derived `markets.total*` update. Logging every accrual would be very
noisy and adds nothing the API can't compute from market state.

### Things intentionally NOT stored

- **Health factor.** Live oracle price required → computed on demand by API.
- **Token decimals.** Frontend reads `ERC20.decimals()` directly via RPC.
- **Indicative orderbook size (`balanceOf(lender)`).** Live read from frontend.
- **Rate history.** Only current state; on-chain logs are the audit trail.
- **`SetOwner`, `SetAuthorization`, `IncrementNonce`, `FlashLoan`.** Not used by any frontend view.
- **`Initialized` (Emitter).** One-time deploy event.

## Events intentionally NOT indexed from the Emitter

Three Emitter events are **redundant** with `Bivium` events emitted in the
same transaction — we always use the Bivium one as canonical:

| Emitter event (ignored) | Canonical equivalent | Why redundant |
|---|---|---|
| `MarketCreated` | `Bivium:CreateMarket` | Same tx, but Bivium's carries the full `MarketParams` tuple. |
| `FulfilledBorrow` | `Bivium:Supply` | Same tx; `Supply.onBehalf == lender` by invariant. |
| `WithdrawnFromMarket` | `Bivium:Withdraw` | Same tx; escape-hatch path. |

Indexing them twice would create divergence risk. If you find yourself
tempted to add a handler for one of these, ask why before doing it.

## Handler pattern

Every handler follows the same shape:

```typescript
ponder.on("Contract:EventName", async ({ event, context }) => {
  // 1. Normalize addresses defensively.
  const someAddr = lower(event.args.someAddr);

  // 2. (Optional) Update derived state — markets, positions.
  await context.db.update(markets, { id: event.args.id }).set((row) => ({
    totalBorrowAssets: row.totalBorrowAssets + event.args.assets,
  }));

  // 3. Insert the activity-log row.
  await context.db.insert(borrows).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    /* ... */
  });
});
```

Three things to know:

1. **`context.db` is the Store API.** Use `insert/update/find/delete` keyed by
   PK. For compound PKs pass the full key object: `db.find(positions, { marketId, borrower })`.
2. **`onConflictDoUpdate((row) => ({...}))`** for upserts where the new value
   depends on the existing row.
3. **`context.db.sql`** is the Drizzle escape hatch for bulk operations the
   Store API can't express (e.g. "update all rows for this lender"). Required
   for `AllowedCollateralsSet` only; avoid otherwise.

## The bulk-replace handler (`AllowedCollateralsSet`)

This is the one handler that uses raw Drizzle, because the contract emits a
single event that replaces the lender's entire whitelist:

```typescript
await context.db.sql
  .update(lenderCollaterals)
  .set({ allowed: false, updatedAtBlock: event.block.number })
  .where(eq(lenderCollaterals.lender, lender));

for (const collateral of event.args.collaterals) {
  await context.db.insert(lenderCollaterals).values({
    lender, collateral: lower(collateral), allowed: true,
    updatedAtBlock: event.block.number,
  }).onConflictDoUpdate(() => ({ allowed: true, updatedAtBlock: event.block.number }));
}
```

If this stops working (Ponder ships a Drizzle major bump, `context.db.sql`
moves), the fallback is to store the whitelist as an array column on
`lenders` instead — accept the slightly more awkward query in exchange for a
simpler handler. **Do not** silently break the bulk-replace semantics by
upserting the new set without resetting the old (collaterals would leak as
`allowed=true` forever).

## Updating ABIs after contract changes

ABIs in [`abis/`](./abis/) are extracted from Foundry build artifacts. After
`forge build` in `apps/contracts/`, regenerate with the script documented in
[README.md](./README.md#updating-abis-after-contract-changes).

If a new event is added to a contract:
1. Re-extract ABIs.
2. Add a corresponding `onchainTable` in `ponder.schema.ts` (or update an
   existing one if it's a state change to an existing entity).
3. Add a `ponder.on(...)` handler in the appropriate `src/<contract>.ts`.
4. Run `pnpm typecheck` — Ponder's codegen will produce the typed event
   shape; tsc will fail loudly if the handler's `event.args` don't match.

## Critical rules

1. **ZERO `@bivium/*` imports.** The indexer is a bounded context. Don't
   import domain, application, infrastructure, or common. If you find
   yourself wanting to, you're probably trying to put business logic here —
   stop.

2. **ZERO business logic.** Handlers must do: normalize addresses → update
   derived state → insert log row. Anything that requires a business rule
   (HF computation, eligibility scoring, rate validation) belongs in the API
   layer, not here.

3. **Lowercase every address** via `lower(...)` from `src/lib/ids.ts`
   before writing it. Event args sometimes arrive checksummed depending on
   source; case-sensitive PK lookups would silently miss.

4. **Reorg-safe row keys.** Every log table uses `(txHash, logIndex)` as PK.
   Never use auto-increment IDs or block numbers as PK — they break Ponder's
   reorg replay.

5. **Never index a redundant event.** If two events fire in the same tx with
   overlapping info, pick the canonical one (the one with the richest typed
   payload) and document the rejected one in the "intentionally NOT indexed"
   table above.

6. **Never store derived state that needs live data.** HF, decimals,
   `balanceOf` orderbook size — all live reads. Indexer = chain history,
   nothing more.

7. **Schema changes are migrations.** When you change `ponder.schema.ts`,
   Ponder must reindex from `startBlock` against a fresh `DATABASE_SCHEMA`.
   The published `indexer` views flip atomically when ready. Never edit the
   indexer's tables directly via psql/Prisma — they're owned by Ponder.

8. **The indexer is allowed to be eventually consistent.** Don't write code
   in the API or frontend that assumes the indexer has caught up to the
   latest block. Use `event.block.number` from indexed rows + the API's
   awareness of head block to surface staleness if needed.

## Pre-Implementation Checklist

When adding a new event handler or table:

- [ ] Have you confirmed the event isn't already indexed (or its canonical equivalent)?
- [ ] If it's a state change to an existing entity, are you updating the right table — not creating a parallel one?
- [ ] If it's a new entity, does the PK choice survive reorgs (`(txHash, logIndex)` for logs, deterministic id for entities)?
- [ ] Did you add indices for the queries the frontend / API will run?
- [ ] Are all addresses normalized via `lower(...)`?
- [ ] Did you `pnpm typecheck` (runs `ponder codegen && tsc --noEmit`)?
- [ ] Did you `pnpm lint`?
- [ ] If the change is non-additive (column type change, PK change), did you note that operators need to reindex (fresh `DATABASE_SCHEMA`)?

## Running

See [README.md](./README.md). Short version from monorepo root:

```bash
pnpm dev:indexer        # hot-reload dev
pnpm start:indexer      # production
```

## Out of scope for this app (handled elsewhere)

- **API endpoints exposing indexed data** → future `apps/api` work via Prisma.
- **Health factor service** → future `apps/api` or a dedicated service reading from the `indexer` schema + live oracle.
- **Real-time WebSocket push** → not the indexer's job; subscribe to Postgres `LISTEN/NOTIFY` from the API layer or use Ponder's GraphQL subscriptions on the read-side.
- **Cross-chain support** → v2. Adding it will require migrating PKs to `(chainId, ...)`.
