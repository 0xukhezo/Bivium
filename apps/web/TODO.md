# Bivium web — what's missing

Punch list of everything between today's state and a production-ready beta.
Tiered by impact, with file references where useful.

> Snapshot date: 2026-06-07.
> Currently on-chain: **wallet balances**, **EIP-7702 activation**, **lender
> preference writes** (rate / collateral / global pause·unpause), **borrow**
> (full approve→borrow flow wired in `BorrowModal`), **repay** (full
> approve→repay flow wired in `RepayModal`, real `MarketParams.oracle`
> from the indexer). Lender markets, borrower loans, market detail, depth
> chart, order book, and Sankey walk all read live from the indexer-backed
> API.

---

## Tier 1 — Hard blockers

The product does not function without these.

- [ ] **Number → bigint migration.** Every `lib/markets.ts`, `lib/lender.ts`,
  `lib/borrower.ts` field carries a `TODO: 1e18 bigint tomorrow` comment.
  JS-number is fine for USDC (6 dp) but lossy on ETH/WBTC at 18/8 dp plus
  USD math.
  - [ ] Rewrite formatters in `lib/utils.ts` as bigint-aware variants
    (`formatBaseUnits(value: bigint, decimals: number)`, etc).
  - [ ] Sweep every consumer of `ratePerSecond` / `lltv` / `amount` /
    `borrowShares` / `totalSupplyAssets`.
  - [ ] Specifically: the `parseUnits(requestedSafe.toString(), ...)` /
    `Math.round(amount * 10**decimals)` conversions in `BorrowModal` and
    `BorrowerView` go away once amounts are bigint end-to-end.

- [ ] **Lender-side market creation.** After a lender saves a rate +
  accepted collateral, no UI calls `Bivium.createMarket(input)`. Without
  it, no `Bivium:CreateMarket` event fires and `MyMarketsCard` stays
  empty — borrowers have nothing to draw from. Either a "Create market"
  button per (lendable × accepted-collateral) pair, or auto-fan-out at the
  end of the activation wizard.

---

## Tier 2 — UX-blocking gaps

- [ ] **Tx-hash receipts.** Every successful write toast should include
  `action: { label: "View on Arbiscan", onClick: () => window.open(\`https://arbiscan.io/tx/${hash}\`) }`.
  The toast system already supports it; just thread the `hash` through.
  Touches: `MyMarketsCard`, `LendingAssetsCard`, `CollateralAssetsCard`,
  `BorrowerView`, `BorrowModal`, `OnboardingModal`.

- [ ] **Global chain-switch guard.** `ChainAwareButton` covers individual
  buttons but there's no app-wide banner. Wrong-chain users on
  `/dashboard` or `/market/[pair]` get cryptic wagmi errors from read
  paths. Add a banner: *"You're on Ethereum mainnet. Switch to Arbitrum to
  continue."* with a `switchChain` CTA in `AppHeader` or a layout-level
  component.

- [ ] **EIP-7702 revocation.** No way to undelegate today. Add a
  "Deactivate my bivium" button (settings dropdown or Lender-tab footer)
  that signs an authorization for `address(0)` via the existing 7702
  plumbing.

- [ ] **Borrower deposit / withdraw collateral.**
  - [ ] `BiviumProfile.sol` exposes `withdrawFromMarket(MarketParams, amount)`
    — no UI.
  - [ ] Router has `supplyCollateral` / `withdrawCollateral` (Morpho pattern)
    — neither is exposed.
  - [ ] A borrower with an open position needs a "Top up collateral" action
    on each loan row in `MyLoansCard` to lift HF.

- [ ] **Mobile responsiveness.** Every table is `min-w-[760px]` to
  `min-w-[860px]` — forces horizontal scroll on phones. Tables should
  collapse to a card-per-row layout under `md`.

- [ ] **Error boundaries.** No global `app/error.tsx`. A thrown error in any
  client component takes down the page with the default Next overlay in
  dev / white screen in prod. Add `app/error.tsx` + per-route boundaries
  (`app/(app)/market/error.tsx`, `app/(app)/dashboard/error.tsx`).

---

## Tier 3 — Web3 polish

- [ ] **Persisted pending-tx tracker.** If the user closes the modal mid-tx
  or refreshes, the pending tx is forgotten. A small `localStorage`-backed
  panel (*"3 transactions pending: setRate USDC, setRate WBTC,
  setAllowedCollaterals"*) would survive reloads.

- [ ] **Live HF + utilization.** `RepayModal` recomputes HF locally as the
  user types (good), but the displayed HF on `MyLoansCard` is the
  indexer-derived `healthFactor` (off-chain price feed, stale by minutes).
  With real oracle prices HF moves; the dashboard should subscribe to
  oracle updates and re-derive HF live.

---

## Tier 4 — Production readiness

### Testing

- [ ] **Unit tests** for pure utilities:
  - `annualRateToRatePerSecond`, `ratePerSecondToAnnual` in `lib/utils.ts`
  - `healthBand` in `lib/borrower.ts`
  - `getMarketSlug` in `lib/markets.ts`
  - All formatters (`formatCompact`, `formatUsd`, `formatPercent`,
    `formatTokenAmount`)
  - `walkDepth` in `BorrowModal`
  - `niceScale` / `niceXTicks` in `DepthChart`
- [ ] **E2E (Playwright)** for critical flows:
  - Connect → activate → set rate → save preferences → pause → resume
  - Approve collateral → borrow → repay
- [ ] CI runs typecheck + lint + tests + build on every PR.

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
- [ ] Add `public/og-image.png` (1200×630) and wire it.
- [ ] Restore dynamic per-market `<title>` on `/market/[pair]`. The page is
  a client component (drove off `useMarkets()`), so the previous
  `generateMetadata` was removed. Either split into a thin server wrapper
  that re-runs `fetchMarkets()` server-side, or add a `/markets/:pair`
  detail endpoint to keep the client component thin.

### Sitemap + robots.txt

- [ ] Both missing. Add `app/sitemap.ts` and `public/robots.txt`.

### Lighthouse pass

- [ ] Haven't run. The 3D diagram in `BorrowFlowDiagram.tsx` has client-side
  perspective math + mousemove parallax — likely a hit on CLS / LCP if not
  measured. Aim for ≥ 90 on Performance, Accessibility, Best Practices, SEO.

---

## Tier 5 — Polish that'd elevate it

- [ ] **Tooltips on technical terms.** LLTV, HF, ratePerSecond → annualised
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

Tier 1 is down to 2 items. Roughly **2 weeks** to "production-ready beta":

1. **Market creation UI** (~1 day) — closes the protocol loop end-to-end
   (lender configures → markets actually exist → borrowers can draw).
2. **Bigint migration** (~3–5 days) — every consumer of amount / rate / HF
   on `bigint`, formatters rewritten. The biggest single chunk left.
3. **Tx-hash receipts, chain-switch banner, error boundary** (~2 days) —
   rough-edge polish.
4. **Mobile + tooltips + dynamic OG title** (~3 days) — "works well"
   finishing pass.
5. **Tests + observability + SEO** (~1 week) — pre-launch checklist.

Once Tier 1 ships the app is structurally complete; Tiers 2–5 are
increments on a working product.
