# @bivium/indexer

Ponder-based event indexer for the Bivium protocol on Arbitrum mainnet.

This app is an **isolated bounded context**: it does NOT depend on
`@bivium/domain`, `@bivium/application`, or `@bivium/infrastructure`. It writes
to its own Postgres schema (`indexer`), and the rest of the monorepo reads
from there via Prisma multi-schema (wired up in a later iteration).

## What it indexes

Three contracts, all single-address:

| Contract | Source of truth for |
|---|---|
| `Bivium` | markets, positions, supplies/borrows/repays/liquidations, accrual, auto-forward, curated token registry |
| `BiviumEventEmitter` | lender lifecycle (register, rate set, collateral whitelist, pause/unpause) |
| `BiviumRouter` | `OrderFilled` (aggregate) + `Fill` (per-lender) orderbook activity |

See [`ponder.schema.ts`](./ponder.schema.ts) for the full table list and
[`src/`](./src/) for the per-contract handler files.

## Setup

```bash
# From the monorepo root:
pnpm install

# Copy + edit env vars
cp apps/indexer/.env.example apps/indexer/.env.local

# You need:
#   DATABASE_URL                 → shared Postgres URL (same as Prisma)
#   PONDER_RPC_URL_42161         → Arbitrum mainnet RPC (paid endpoint required)
#   BIVIUM_ADDRESS               → contract address (post-deploy)
#   BIVIUM_EVENT_EMITTER_ADDRESS
#   BIVIUM_ROUTER_ADDRESS
#   BIVIUM_START_BLOCK           → first block of the earliest deploy
```

## Run

```bash
pnpm dev:indexer        # hot-reload dev server (from monorepo root)
pnpm start:indexer      # production mode
```

Once running, Ponder serves:
- `http://localhost:42069/` — GraphQL playground (built-in)
- `http://localhost:42069/ready` — readiness probe (503 during backfill)
- `http://localhost:42069/status` — indexing progress

## Database layout

Ponder writes to a **per-deploy schema** (`DATABASE_SCHEMA`, e.g.
`indexer_dev`) for in-progress indexing and reorg handling, then publishes
stable **views** under `DATABASE_VIEWS_SCHEMA` (e.g. `indexer`) for external
consumers.

Two schemas live in the same database as Prisma's `public` schema. Prisma
migrations must not touch `indexer*` schemas — that's owned by Ponder.

When the read-side comes in a future iteration, Prisma will be configured with
`previewFeatures = ["multiSchema"]` and `schemas = ["public", "indexer"]`,
introspecting the Ponder tables as read-only models.

## Updating ABIs after contract changes

The ABIs in [`abis/`](./abis/) are extracted from Foundry build artifacts.
After `forge build` in `apps/contracts/`, regenerate them with:

```bash
node -e '
const fs = require("fs");
for (const [src, dst] of [
  ["apps/contracts/out/Bivium.sol/Bivium.json", "apps/indexer/abis/BiviumAbi.ts"],
  ["apps/contracts/out/BiviumEventEmitter.sol/BiviumEventEmitter.json", "apps/indexer/abis/BiviumEventEmitterAbi.ts"],
  ["apps/contracts/out/BiviumRouter.sol/BiviumRouter.json", "apps/indexer/abis/BiviumRouterAbi.ts"],
]) {
  const j = JSON.parse(fs.readFileSync(src, "utf8"));
  const name = dst.split("/").pop().replace(".ts", "");
  fs.writeFileSync(dst,
    `// Auto-extracted from apps/contracts/out — do not edit by hand.\nexport const ${name} = ${JSON.stringify(j.abi, null, 2)} as const;\n`
  );
}
'
```

(A proper `regen-abis` script can be added once the ABI surface stabilizes.)

## Design notes

- **What we explicitly don't index from the Emitter**: `MarketCreated`,
  `FulfilledBorrow`, `WithdrawnFromMarket`, `Initialized`. They're redundant
  with their `Bivium` counterparts emitted in the same tx; using the canonical
  source avoids divergence risk.
- **No health factor stored**. HF requires a live oracle price and goes stale
  immediately after indexing. The API layer computes HF on demand from
  `positions` + a fresh oracle read.
- **No token decimals stored**. The frontend reads `ERC20.decimals()` directly
  via RPC — keeps the indexer's responsibility focused on chain events.
- **No multi-chain in v1**. Arbitrum mainnet only. Adding mainnet/Base later
  will require migrating PKs to `(chainId, ...)`.
