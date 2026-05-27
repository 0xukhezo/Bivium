# Bivium Web App

Frontend for **Bivium** — single-lender DeFi venues on Arbitrum ("be your own Aave"). A lender opens markets, sets fixed rates per asset, and chooses accepted collateral; a borrower draws loans against collateral and repays them.

> **Most important fact:** the backend and smart contracts are **not wired yet**. Every value on screen comes from deterministic mocks in `lib/`. Every write action is a simulated transaction. See [Mock data](#mock-data) and [Write actions](#write-actions-mock-tx-pattern).

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS v3 · wagmi / viem / ethers · next-themes · @tanstack/react-query · lucide-react · @nivo/sankey · Geist fonts.

## Commands

Run from `apps/web` (or via the root Turbo scripts):

```bash
pnpm dev        # next dev
pnpm build      # next build
pnpm start      # next start
pnpm lint       # next lint
pnpm typecheck  # tsc --noEmit
```

- **Restart the dev server after editing `tailwind.config.ts`** — config changes don't hot-reload.
- Env (in `apps/web/.env.local`): `NEXT_PUBLIC_WC_PROJECT_ID` (WalletConnect), `NEXT_PUBLIC_ALCHEMY_KEY` (optional RPC).

## Directory map

```
app/
  (app)/            route group — authed shell (AppHeader)
    market/         MarketTable
    dashboard/      DashboardView (Lender / Borrower tabs)
  layout.tsx        Geist fonts, metadata
  providers.tsx     Theme + Wagmi + Query providers
  globals.css       design tokens (canonical) + base layer
components/
  ui/               primitives — Button, Badge, Card, Input, IconButton, Modal, SortableHeader
  market/           MarketTable, TokenFilterDropdown
  dashboard/        DashboardView, MyMarketsCard, MyLoansCard, Lending/CollateralAssetsCard, RepayModal, MarketStatusModal, BorrowerSummary, BorrowerView
  layout/           AppHeader, LandingHeader, MobileDrawer, NavLink, Logo
  wallet/           ConnectButton, ConnectModal
lib/                utils + tokens + mock data (markets, lender, borrower) + wagmi/ethers/chains config
hooks/              useMounted, useReducedMotion
```

Path alias: `@/*` → `./*` (e.g. `@/components/ui/Button`, `@/lib/utils`). Defined in `tsconfig.json`.

## Design system

`app/globals.css` is the **canonical source of design tokens** (CSS custom properties), and `tailwind.config.ts` maps them to utility classes. (Note: globals.css has a stale header comment pointing at a `DESIGN_SYSTEM.md` that no longer exists — ignore it; globals.css *is* the source.)

### Colors — never hardcode hex

Use the **semantic Tailwind classes**, which resolve to CSS vars and switch with the theme:

| Class group | Purpose |
|---|---|
| `bg`, `bg-elevated`, `bg-sunken` | page / card / inset surfaces |
| `border` | all borders & dividers |
| `text-primary`, `text-secondary`, `text-muted` | text hierarchy |
| `accent`, `accent-hover` | primary actions, links, active states |
| `success`, `warn`, `danger` | status (supports opacity: `bg-success/10`, `border-warn/30`) |

- **Theming**: light/dark via `[data-theme]` (next-themes, `attribute="data-theme"`, default `dark`). Both themes define every semantic token, so semantic classes "just work" in both.
- `success` / `warn` / `danger` are stored as **RGB triplets** so opacity modifiers work, and they get **darker in light mode** (emerald/amber/red-700) for contrast. Always use `text-danger` / `bg-success/10` etc. — never a raw color — so health badges and status pills stay legible in both themes.
- **Brand seeds** (`arb-blue`, `arb-deep`, `arb-midnight`, `arb-cyan`, `arb-white`) are literals for rare one-off accents only.

### Radii, shadow, motion, type

- Radii: `rounded-{sm,md,lg,xl,pill}`. Shadow: `shadow-card`, `shadow-glow-cyan`.
- Motion: `duration-{fast,base,slow}` = 120 / 200 / 360 ms, easing `ease-out-expo`. Standard transition: `transition-colors duration-base ease-out-expo`. Theme switching is intentionally instant (no transition). `prefers-reduced-motion` is handled globally.
- Type: Geist Sans (`font-sans`) / Geist Mono (`font-mono`, used for addresses). Sizes `text-xs … text-6xl`.
- **`tabular-nums` is mandatory on every numeric / token-amount value** so columns align.
- Don't remove focus outlines — there's a global `:focus-visible` ring.

## Component primitives (`components/ui/`)

Reuse these; don't hand-roll equivalents.

- **`Button`** — `variant`: `primary | secondary | ghost | danger`; `size`: `sm | md | lg`.
- **`Badge`** — `variant`: `neutral | accent | success | warn | danger`. Pill, tabular-nums.
- **`Card`** + `CardHeader` / `CardTitle` / `CardLabel` — props `interactive` (hover lift), `dense` (p-4 vs p-6).
- **`Input`** — label-wrapper field with `prefixSlot` / `suffixSlot`. (For free-form numeric entry see [number inputs](#number-inputs).)
- **`IconButton`** — square pill icon button; **`aria-label` is required** (enforced by types).
- **`Modal`** — **renders via `createPortal` to `document.body` behind a `mounted` guard.** This escapes the header's `backdrop-filter` containing block (a plain `fixed` child would mis-position) and is SSR-safe. Handles Escape, backdrop click, and body scroll lock. **All overlays must use this** — don't build ad-hoc fixed-position dialogs.
- **`SortableHeader`** + **`nextSort`** — generic `SortState<K extends string>`; `nextSort` cycles unsorted → asc → desc → unsorted (a different column resets to asc). Used by `MarketTable`, `MyMarketsCard`, `MyLoansCard`.

## Conventions & patterns

### className composition

Always merge classes with **`cn()`** from `lib/utils.ts` (`twMerge(clsx(...))`). Never concatenate Tailwind via template strings — `cn` resolves conflicts (this is why consumer overrides like `!h-12` win over a primitive's base `h-11`).

### Formatting (`lib/utils.ts`)

Use these — don't reinvent number formatting:

- `formatCompact(n)` — full number with 2 decimals **below 100,000**; `K`/`M`/`B` notation **at/above 100,000**.
- `formatUsd(n)` — `$` + `formatCompact`.
- `formatPercent(n, decimals = 2)` — `n` is a 0–1 fraction → `"5.25%"`.
- `truncateAddress(addr, chars = 4)` — `0x1234…5678`.

### Tokens (`lib/tokens.ts`)

`Token` type, `ARBITRUM_TOKENS` (WBTC / ETH-as-WETH / USDC), `SUPPORTED_TOKENS` array, `getTokenByAddress` (case-insensitive). **The address is the source of truth** — filter/compare by lowercased `address`; symbol/name/`iconUrl` are derived. Icons come from the TrustWallet CDN via `token.iconUrl`.

### Token icons

Render with a plain `<img>` (not `next/image`) to avoid remote-domain config and to support data-URI wallet icons:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={token.iconUrl} alt="" aria-hidden="true" width={24} height={24}
     className="h-6 w-6 shrink-0 rounded-full object-contain" />
```

### Mock data

All in `lib/`, **deterministic** (seeded by index) so SSR and client hydration match — never randomize at module load:

- `lib/markets.ts` → `Market`, `MOCK_MARKETS` (+ a reference price map for USD).
- `lib/lender.ts` → `LenderMarket`, `LenderPreferences`, `MOCK_LENDER_MARKETS`, `MOCK_LENDER_PREFERENCES`, `AVAILABLE_LEND_ASSETS`, `AVAILABLE_COLLATERAL_ASSETS`.
- `lib/borrower.ts` → `BorrowerLoan`, `MOCK_BORROWER_LOANS`, `MOCK_WALLET_BALANCES` / `walletBalanceOf`, and the **single source of health thresholds**: `HF_SAFE` (1.5), `HF_WARN` (1.2), `healthBand(hf)` → `"safe" | "warn" | "danger"`. Map the band to a Badge variant; don't scatter magic numbers.

### Write actions (mock tx pattern)

Every state-changing action simulates a chain call:

```tsx
const confirm = async () => {
  setSubmitting(true);
  // replace with wagmi writeContract once wired
  await new Promise((r) => setTimeout(r, 1200));
  setState(next);           // optimistic local update
  setSubmitting(false);
};
```

Used by pause/resume (`MyMarketsCard` → `MarketStatusModal`), repay (`MyLoansCard` → `RepayModal` → `BorrowerView.repay`), and preference saves. **When wiring chain calls:** swap the `setTimeout` for `useWriteContract` + `useWaitForTransactionReceipt`, and replace the `MOCK_*` reads with data hooks. The button label/disabled states already model pending (`"Confirming…"`).

### Confirmation before writes

State-changing actions open a `Modal`-based dialog that explains the effect and hosts the confirm button (`MarketStatusModal` for pause/resume, `RepayModal` for repay). Follow this for new destructive/on-chain actions rather than acting on the bare row button.

### Editable forms — draft / persisted

`LendingAssetsCard` and `CollateralAssetsCard` keep `persisted` (mock on-chain truth) separate from `draft` (in-progress edits); a `dirty` diff gates the Save button, and Save promotes `draft → persisted` after the mock tx.

### Number inputs

For free-form numeric entry (rate %, repay amount) use a **string-valued state** filtered with `/^\d*\.?\d*$/`, *not* a controlled `value={num.toFixed(2)}`. A formatted controlled number fights the user's keystrokes and surfaces float noise (e.g. `0.055 * 100 → 5.5000…1`). Parse the string to a number only when computing/saving.

### Tables

```
<div className="overflow-hidden rounded-md border border-border">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-sm">
      <thead className="border-b border-border bg-bg-sunken text-xs tracking-wider text-text-muted"> …
```

- **No `uppercase` on `<thead>`** — Tailwind preflight resets `<button>` `text-transform: none`, so sortable-header buttons wouldn't match a plain `<th>`; case mismatch results. Keep headers in their authored case.
- Give action-cell buttons a **fixed width** (`w-28`) so swapping labels (Pause ↔ Resume) doesn't reflow the column.
- Row actions share one neutral style: `border border-border bg-bg text-text-secondary hover:border-accent hover:text-text-primary`.

## Web3 setup

- `app/providers.tsx` layers `ThemeProvider` (next-themes) → `WagmiProvider` → `QueryClientProvider`; the `QueryClient` is created in a `useState` initializer (don't recreate per render).
- `lib/wagmi.ts` exports `wagmiConfig` (Arbitrum + Arbitrum Sepolia + mainnet; injected / Coinbase / WalletConnect connectors). `lib/chains.ts` and `lib/ethers.ts` hold chain + provider helpers.
- `next.config.mjs` sets web3-specific webpack `fallback`s and `externals` (`pino-pretty`, `lokijs`, `encoding`) — don't remove them or viem/ethers builds break.
- Wallet connect UI: `ConnectButton` → `ConnectModal` (uses EIP-6963 `connector.icon` with a lucide fallback).

## Gotchas

- Restart dev server after `tailwind.config.ts` edits.
- Anything `position: fixed` (modals, drawer) must portal to `document.body` — the sticky header creates a containing block via `backdrop-filter`.
- Number inputs: string state + regex filter, never a controlled `toFixed` value.
- No `uppercase` on table headers (button text-transform reset).
- `MobileDrawer` and all modals already portal correctly — reuse them.
