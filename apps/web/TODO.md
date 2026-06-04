# Bivium web — what's missing

Punch list of everything between today's state and a production-ready beta.
Tiered by impact, with file references where useful. Use the checkboxes to
track progress.

> Snapshot date: 2026-05-29.
> Currently on-chain: **wallet balances**, **EIP-7702 activation**, **lender
> preference writes** (rate / collateral / pause), **repay** (wired but will
> revert without real `MarketParams`). Everything else reads from `MOCK_*`.

---

## Tier 1 — Hard blockers

The product does not function without these.

### Borrow flow

- [ ] **Wire `BorrowModal` to `BiviumRouter.borrow`.**
  `components/market/BorrowModal.tsx` is on a mock `setTimeout(1400ms)`. The
  headline feature (borrow against collateral) does nothing on-chain.
- [ ] Add a `useBorrow()` hook on `BiviumRouter.borrow(MarketParams, assets,
  minHealthFactor, maxRatePerSecond, recipient, ...)` in
  `hooks/useBiviumRouterWrite.ts`. Match the ABI signature exactly.
- [ ] Surface **slippage cap** (max weighted-average rate) and **HF guard**
  (minimum health factor) as user-configurable inputs in the borrow form.
  The Router enforces both on-chain; without them in the UI we trap borrowers
  at unfavourable fills.
- [ ] Build the **collateral-deposit step** that has to precede borrow. Today
  the UI has no way to send collateral to the Router. Either inline it into
  `BorrowModal` as a 2-step (Approve → Supply + Borrow) or build a separate
  "Supply collateral" entry point on the market detail page.

### ERC-20 approvals

- [ ] Add **`useTokenAllowance(token, spender)`** read hook and
  **`useApprove(token, spender, amount)`** write hook in `hooks/`.
- [ ] Inline approval step in `RepayModal` (loan token → Router) and
  `BorrowModal` (collateral token → Router) — pre-flight check that runs
  before the main tx. Without it, every real repay/borrow reverts before
  reaching `BiviumRouter`.
- [ ] Decide on the unlimited-vs-exact-amount approval policy (recommend:
  exact-amount default with a "Don't ask again" toggle that bumps to
  `type(uint256).max`).

### Indexer data wire-up

- [x] **Backend API client** at `lib/api/client.ts` (`API_BASE`, env-overridable
  via `NEXT_PUBLIC_BIVIUM_API_URL`).
- [x] **Markets list** wired to `/api/v1/markets` via
  `lib/api/markets.ts` + `hooks/useMarkets.ts`. `MarketTable` now renders
  live markets, with skeleton-row loading, error + retry, and "no markets
  created yet" empty states. Number → bigint conversion lives in the
  adapter; consumers still see the existing `Market` shape.
- [ ] **Market detail page** (`app/(app)/market/[pair]/page.tsx`) still
  reads from `MOCK_MARKETS` via `getMarketByPair`. Either await
  `fetchMarkets()` server-side or add a `/markets/:pair` detail endpoint
  that returns the full `MarketParams` (oracle + creator), then update
  `getMarketByPair` to fetch.
- [ ] Replace `MOCK_LENDER_MARKETS` (`lib/lender.ts`) with a query that joins
  `markets` ⋈ aggregated `positions.collateral` filtered by `creator == self`.
  Drives `MyMarketsCard`.
- [ ] Replace `MOCK_LENDER_PREFERENCES` with real reads. **`useLenderProfile`
  and `useLenderRates` already exist in `hooks/useLenderProfile.ts` but
  `LendingAssetsCard` and `CollateralAssetsCard` still don't consume them.**
- [ ] Replace `MOCK_BORROWER_LOANS` (`lib/borrower.ts`) with a positions query
  filtered by `borrower == self`, joined to `markets`. Drives `BorrowerView`.
- [x] **Loading skeletons** for the markets list. Apply the same
  `SkeletonTable` pattern to remaining tables (`MyMarketsCard`,
  `MyLoansCard`) as they switch to live data.
- [x] **Empty states** for the markets list (no-markets vs no-filter-matches
  are now distinct). Carry the same pattern to the remaining lists.

### Number → bigint migration

- [ ] Every `lib/markets.ts`, `lib/lender.ts`, `lib/borrower.ts` field carries
  a `TODO: 1e18 bigint tomorrow` comment. Today's JS-number types lose
  precision on real on-chain amounts (USDC 6 dp is fine, ETH/WBTC at
  18/8 dp plus USD math is not).
- [ ] Rewrite formatters in `lib/utils.ts` to be bigint-aware variants:
  `formatBaseUnits(value: bigint, decimals: number)`, etc.
- [ ] Sweep every consumer of `ratePerSecond` / `lltv` / `amount` /
  `borrowShares` / `totalSupplyAssets` etc.
- [ ] Specifically: the `RepayItem.assets` conversion in `BorrowerView`
  (`BigInt(Math.round(amount * 10**decimals))`) breaks above ~9 quadrillion
  base units. Once amounts are bigint end-to-end this disappears.

### Real `MarketParams`, not placeholders

- [ ] `BorrowerView.tsx` and any future borrow call use
  `ORACLE_PLACEHOLDER = 0x0000…`. Since the on-chain market id is
  `keccak(MarketParams)`, every real tx reverts at the engine. Blocked on
  the indexer wire-up (above) — once positions carry their oracle + creator,
  `buildRepayItem` / `buildBorrowItem` use real fields and the
  `TODO(indexer-wire-up)` comment in `BorrowerView.tsx` can be removed.

---

## Tier 2 — UX-blocking gaps

### Per-pair pause misrepresents reality

- [ ] `MyMarketsCard` flips one row's status, but `setRate(loanToken, 0)`
  actually pauses **every** market the lender runs against that loan token.
  Two markets sharing USDC pause/resume together — the row UI lies. Either:
  - [ ] Keep per-row UI + add a clear "this affects all USDC markets"
    warning in `MarketStatusModal`, **or**
  - [ ] Collapse the table to per-loan-token rows once real data is in
    (more honest).
- [ ] Or unblock by adding a true per-market kill-switch on
  `BiviumProfile.sol` — backend work, out of scope here.

### Tx-hash receipts

- [ ] Every successful write toast should include
  `action: { label: "View on Arbiscan", onClick: () => window.open(\`https://arbiscan.io/tx/${hash}\`) }`.
  The toast system already supports it; just thread the `hash` through.
  Touches: `MyMarketsCard`, `LendingAssetsCard`, `CollateralAssetsCard`,
  `BorrowerView`, `OnboardingModal`.

### Chain-switching UX

- [ ] If the wallet's `chainId !== 42161`, every write fails with a cryptic
  wagmi error. Add a guard banner: *"You're on Ethereum mainnet. Switch to
  Arbitrum to continue."* with a `switchChain` call-to-action.
- [ ] Apply globally (in `AppHeader` or a layout-level component) so it
  appears on `/market`, `/dashboard`, `/market/[pair]` consistently.

### EIP-7702 revocation

- [ ] Marked out of scope in the original onboarding plan. Users have no way
  to undelegate today.
- [ ] Add a "Deactivate my bivium" button (likely in a settings dropdown or
  a Lender-tab footer) that signs an authorization for `address(0)` via
  the existing 7702 plumbing.

### Borrower deposit / withdraw collateral

- [ ] `BiviumProfile.sol` exposes `withdrawFromMarket(MarketParams, amount)`.
  No UI surfaces this.
- [ ] Router likely has `supplyCollateral` / `withdrawCollateral` (Morpho
  pattern). Neither is exposed.
- [ ] A borrower with an open position needs a "Top up collateral" action
  on each loan row in `MyLoansCard` to lift HF.

### Mobile responsiveness

- [ ] Every table is `min-w-[720px]` to `min-w-[820px]` — forces horizontal
  scroll on mobile rather than collapsing to cards.
- [ ] Cards on `/dashboard` stack but tables inside them still scroll.
  Rewrite tables to flip to a card-per-row layout under `md`.

### Loading + empty states

- [ ] With mocks they're instant. With real data, every table needs a
  skeleton-row state.
- [ ] Empty-state copy + illustration for: no markets created, no loans, no
  positions yet, no preferences saved. Today there's only the
  "No markets match the current filter" empty.

### Error boundaries

- [ ] No global `error.tsx` in `app/`. A thrown error in any client component
  takes down the page with the default Next overlay in dev / white screen
  in prod.
- [ ] Add `app/error.tsx` + per-route boundaries
  (`app/(app)/market/error.tsx`, `app/(app)/dashboard/error.tsx`).

---

## Tier 3 — Web3 polish

- [ ] **Persisted pending-tx tracker.** If the user closes the modal mid-tx
  or refreshes, the pending tx is forgotten. A small `localStorage`-backed
  panel (*"3 transactions pending: setRate USDC, setRate WBTC,
  setAllowedCollaterals"*) would survive reloads.
- [ ] **Live HF + utilization.** `RepayModal` recomputes HF locally as the
  user types (good), but the displayed HF on `MyLoansCard` is the static
  `loan.healthFactor` from mock data. With real oracles HF moves; the
  dashboard should subscribe to oracle price updates and re-derive HF live.
- [ ] **`LenderOrderbook` + market detail chart from real data.**
  `LenderOrderbook` shows mock depth; `ChartPlaceholder` is hard-coded SVG.
  Both need indexer-sourced data (positions sliced by rate; market totals
  over time).
- [ ] **`BorrowFlowSankey` real data.** `components/market/BorrowFlowSankey.tsx`
  exists; verify it isn't using mocks too.

---

## Tier 4 — Production readiness

### Testing

- [ ] **Unit tests** for pure utilities:
  - `annualRateToRatePerSecond`, `ratePerSecondToAnnual` in `lib/utils.ts`
  - `healthBand` in `lib/borrower.ts`
  - `getMarketSlug`, `getMarketByPair` in `lib/markets.ts`
  - All formatters (`formatCompact`, `formatUsd`, `formatPercent`)
- [ ] **E2E (Playwright)** for critical flows:
  - Connect → activate → set rate → save preferences → pause → resume
  - Borrow → repay
  - Approve token → write → confirm
- [ ] Set up CI that runs typecheck + lint + tests + build on every PR.

### Observability

- [ ] **Sentry / error tracking** for client-side. Today a wallet error or
  revert lives in the console and nowhere else.
- [ ] Surface a request id / tx hash in error toasts so support can correlate.

### Security headers

- [ ] `next.config.mjs` is web3-tuned but has no CSP / X-Frame-Options /
  Strict-Transport-Security headers. Pre-launch checklist.

### SEO / link unfurls

- [ ] `metadata.openGraph` and `metadata.twitter` are unset in
  `app/layout.tsx`. No OG image asset.
- [ ] Twitter / Discord link previews today are plain text.
- [ ] Add `public/og-image.png` (1200×630) and wire it.

### Sitemap + robots.txt

- [ ] Both missing. Add `app/sitemap.ts` and `public/robots.txt`.

### Lighthouse pass

- [ ] Haven't run. The 3D diagram in `BorrowFlowDiagram.tsx` has client-side
  perspective math + mousemove parallax — likely a hit on CLS / LCP if not
  measured. Aim for >= 90 on Performance, Accessibility, Best Practices, SEO.

---

## Tier 5 — Polish that'd elevate it

- [ ] **Tooltips on technical terms.** LLTV, HF, ratePerSecond → annualized
  — no in-context explanations. Add a `Tooltip` primitive and `?` icons
  next to those labels. One-day task with outsized impact for non-crypto
  borrowers.
- [ ] **First-run tour for the dashboard.** After activation, the Lender
  tab shows three cards with no introduction. A 3-step coachmarks pass
  (*"Set your rates" → "Pick collateral" → "Create markets"*) would carry
  first-time users.
- [ ] **Onboarding for unconnected visitors on the dashboard.** Pre-explain
  *"Bivium delegates your wallet via EIP-7702 — here's what that means"*
  before they click Connect.
- [ ] **`ThemeToggle` on the landing.** Currently only in `AppHeader`; some
  landing visitors want light mode immediately.
- [ ] **Optimistic UI + stale-while-revalidate** from React Query so the
  user never sees an empty table after navigation.

---

## Honest milestone plan

Roughly 4–5 weeks of focused work from today to "production-ready beta":

1. **Borrow flow + approvals** (~1 week) — Router.borrow wired, inline
   approval step in `RepayModal` and `BorrowModal`. Unblocks demoing the
   actual product.
2. **Indexer wire-up + bigint migration** (~1–2 weeks) — replaces every
   `MOCK_*` and makes the math safe.
3. **Tx-hash receipts, chain-switch guard, error boundary** (~2 days) —
   basic polish that removes the worst rough edges.
4. **Mobile + empty/loading + tooltips** (~3 days) — the "works well"
   finishing pass.
5. **Tests + observability + SEO** (~1 week) — pre-launch checklist.

Half the lift is the indexer / bigint migration; the other half is borrow
+ approvals. Once Tier 1 ships the app is structurally complete — Tiers 2–5
are increments on a working product.
