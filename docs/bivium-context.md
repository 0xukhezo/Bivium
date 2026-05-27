# Bivium — Project Context

**Name:** Bivium
**Etymology:** Latin *bivium*, "a place where two paths meet" (from *bi-* "two" + *via* "way/path"). The pre-pool model of lending: two parties, one meeting point, no aggregation.
**Short tagline:** *Be your own Aave.*
**Alternate tagline:** *Two paths. One loan. No pool.*
**Market-structure tagline:** *Lending as an orderbook. Wallets are the makers.*
**Long tagline:** Turn your EOA into a personal lending protocol. Your wallet is the venue. Your identity is the brand. Your terms are the law.
**Proprietary vocabulary:** a **bivium** = a single-lender lending venue. Plural: **bivia**. "Browse bivia", "open your bivium", "borrow from cobie's bivium".
**Orderbook vocabulary:** each bivium is also a **resting limit order** in the credit orderbook — priced by the lender's rate, sized by their wallet balance. Borrowing is a **market order** that walks the book and fills against one or many bivia atomically.

---

## 1. The problem

### 1.1 The structural failure of pooled lending

The dominant lending model in DeFi (Aave, Compound) is the *aggregated pool*: many depositors put the same asset into a common pool, and many borrowers borrow against that common pool using various collateral types. A centralized governance (DAO) decides which collaterals are accepted, with which LTVs, with which oracles, with which caps.

This has a modal failure that became publicly visible with the **rsETH/Kelp DAO incident of April 2026**:

- The attacker exploited the Kelp DAO LayerZero bridge to mint ~116,500 rsETH with no backing.
- They deposited those rsETH into Aave as collateral on Ethereum and Arbitrum.
- They borrowed ~$190M in legitimate WETH against that broken collateral.
- Aave lost **$15.1B of TVL in 3.5 days**. Aave's contracts worked exactly as designed — the problem wasn't a bug. The problem was structural.

The structural consequences that did the damage:

1. **Forced risk socialization.** A depositor who put WETH into Aave to earn yield discovered that their WETH was financing positions against rsETH — an exposure they had never approved. Governance made that connection on their behalf when it listed rsETH as collateral.

2. **Collapse of the liquidation mechanism.** Aave hit 100% utilization in the WETH market. In that state, liquidators paying WETH to take rsETH received "locked pool receipts" instead of real WETH, removing the economic incentive. Liquidatable positions went unliquidated. Bad debt: $123M–$230M depending on how Kelp resolves the shortfall.

3. **Run on the bank.** Once confidence was lost, depositors fled. $1.3B moved to SparkLend within days. But many couldn't exit because their liquidity was locked in positions that couldn't be liquidated.

4. **Coordinated bailout.** Aave had to organize "DeFi United" — a 75,081 ETH bailout funded by Lido, EtherFi, LayerZero, and others. De facto centralization: socialized losses require socialized rescues.

### 1.2 The structural lesson

> Pooled lending forces passive depositors to accept risk decisions they never signed off on. Once something goes wrong, the blast radius is the protocol's entire TVL, not the specific position that failed.

This is not an argument against Aave as a product — it's an argument against **a single architecture** for lending. And it opens space for an alternative.

---

## 2. The idea

### 2.1 Pitch in one sentence

**Bivium** is a lending primitive where **each personal wallet (EOA) can become a single-lender lending protocol**, with its own terms, its own risk config, its own on-chain identity, with no governance, no aggregated pool, no forced loss socialization.

### 2.2 90-second pitch

> Three weeks ago Aave lost $6.6B of TVL in 72 hours. Not because a contract failed — its contracts worked exactly as designed. It lost that TVL because WETH depositors discovered that their WETH was financing positions against rsETH, an exposure they had never approved. Governance had put them into that trade.
>
> That's the failure of pooled lending: your risk is not your decision.
>
> I built this: a primitive where **your wallet is the protocol**. Your personal EOA — with your ENS, your history, your on-chain reputation — becomes a single-lender lending venue. You sign which collaterals you accept. You sign which LTV. You sign which rate. Borrowers see `jesus.eth` offering USDC against WBTC at 7% APR, not an anonymous pool.
>
> When rsETH-2 happens — and it will happen — the damage stays with the lenders who actively accepted it. Not with bystanders.
>
> This is only possible now thanks to ERC-7702. Before, you needed a new smart wallet, you lost your address, your history, your identity. With 7702 your personal EOA becomes programmable while keeping everything intact. The lender identity lives in the wallet, not beside it.

### 2.3 The primitive

**Bivium** introduces a new concept to DeFi lending: the **sovereign lender**. Each sovereign lender operates a *bivium* — their own lending venue. A sovereign lender is:

- **An on-chain identity** (an EOA, with its address, ENS, history, attestations).
- **With a personal risk config** (which collaterals it accepts, with which LTVs, oracles, rates, caps).
- **Without external governance** (no one can change its terms without its signature).
- **Without aggregated pool** (its exposure is exclusively to the terms it signed).
- **Composable** (other protocols can integrate with it as they would with any lending venue).
- **Revocable** (it can exit the business by withdrawing funds and revoking the 7702 delegation).

The name **Bivium** comes from Latin *bivium*: the place where two paths meet. It's the oldest form of lending — before banks, before pools — two parties meeting at a point to agree on a loan. Bivium reclaims that model on-chain with public identity and programmable terms.

### 2.4 The dual model: lending venue *and* orderbook

A bivium is two things at the same time, and which lens you use depends on who's looking:

- **From the lender's side**, a bivium is a *venue*: my wallet, my terms, my collateral whitelist, my rate.
- **From the borrower's side**, every active bivium is a **resting limit order** on the credit orderbook. The price is the lender's `ratePerSecond`. The size is the lender's live wallet balance. When the borrower borrows, they submit a **market order**: "give me X USDC against Y WBTC, max average rate Z%". A stateless router walks the book, fills greedily against the best-priced lenders, and either covers the full request honoring the slippage and health-factor bounds or reverts atomically.

The two framings describe the same on-chain state. The "venue" framing is what the lender experiences day-to-day. The "orderbook" framing is what the borrower experiences when they want to borrow, and is what the indexer sees: a list of makers sorted by rate per `(loanToken, collateralToken)` pair, with each maker's available size readable from `balanceOf`. There is no matching engine on-chain — the borrower picks which makers to consume off-chain via the indexer and submits a single transaction; the router enforces the bounds.

This isn't a re-architecture — it's the right lens. The code was already a one-sided orderbook (`fulfillBorrow` is literally a "fill"; the router was already designed for multi-lender atomic borrows). Naming it correctly unlocks a much cleaner UX and a much sharper pitch.

---

## 3. Why now: ERC-7702

### 3.1 What 7702 does

**EIP-7702**, activated in the Ethereum Pectra hardfork (May 2025), allows an EOA to temporarily delegate its execution to a smart contract. Mechanics:

- The EOA owner signs a *delegation* stating "my address will execute the code of this contract".
- From that moment on, when someone calls the EOA, the delegated contract's code is executed.
- The EOA's private key remains sovereign — the owner can revoke the delegation by signing another delegation (or replacing the delegate).
- The EOA's address does not change. Its history is not lost. Its assets do not move.

### 3.2 Why 7702 is the wedge

Without 7702, "turn your wallet into a lending protocol" required:

- **Creating a new smart wallet** (ERC-4337). New address. Loss of history, associated ENS, reputation, attestations. Asset migration.
- **Using a Safe multisig**. Works but requires migrating assets. And a Safe is not *your* personal wallet — it's a vault next to your wallet.
- **Token-bound accounts (ERC-6551)**. Account tied to an NFT. Works technically but the lender identity lives in the NFT, not in your wallet.

With 7702:

- **Your pre-existing EOA** (with all its history) becomes a programmable contract.
- **The lender identity is your personal identity.** When Bob borrows from `jesus.eth`, he sees *jesus.eth* — the same wallet that appears on Twitter, on his Farcaster profile, in his contributions to other protocols.
- **If you exit the business, you revoke.** No migration, no smart-wallet liquidation, no stranded assets.

### 3.3 The social narrative

There's a second-order effect that the pitch can exploit: **lending as a reputational statement**.

Today, when Bob borrows on Aave, he borrows from *Aave*. An anonymous aggregated entity. Tomorrow, with Bivium, Bob could borrow from `cobie.eth`, `vitalik.eth`, or `jesus.eth`. The lender's identity is information — about the lender's economic thesis (which collaterals they accept), about their seriousness (their on-chain track record), about the terms they offer (their rate).

This turns lending into something closer to the traditional credit-lines model or peer-to-peer lending, but with the programmability and permissionless-ness of DeFi.

---

## 4. Differentiation

### 4.1 Vs Aave / Compound

| | Aave/Compound | Bivium |
|---|---|---|
| Model | Aggregated pool | Pool-per-lender |
| Governance | DAO decides collaterals/LTVs | Lender signs their terms |
| Lender identity | Anonymous (pool depositor) | Public (EOA with identity) |
| Risk | Socialized across depositors | Isolated to the specific lender |
| Exit | Dependent on pool utilization | Direct when no active loans |
| Rates | Dynamic curve | Lender-defined (fixed or simple curve) |

### 4.2 Vs Morpho Blue

Morpho Blue already solved most of the architectural problem: isolated markets, no core governance, minimal primitive of ~650 lines. **But** Morpho Blue has no concept of "sovereign lender with identity". In Morpho, the suppliers of a given market are fungible with each other — their capital is mingled. The lender's identity does not exist at the protocol level.

**Bivium positions itself as a lender-identity layer on top of Morpho Blue**, not as a competitor:

- Morpho Blue provides the lending engine (audited, formal-verified, battle-tested).
- Bivium provides the identity layer (each lender is an EOA with their personal market).
- The combination is: *Morpho Blue is the economic primitive. Bivium is the social primitive.*

### 4.3 Vs Morpho V2 (intents)

Morpho V2 introduces lending intents and fixed-term loans. This is conceptually close to what Bivium does, but it is still lender-identity-agnostic. The key difference: in Morpho V2, intents can be fulfilled by any solver/curator. In Bivium, intents are fulfilled by a specific EOA with its persistent config — the lender is the primitive, not an anonymous actor.

### 4.4 Vs traditional P2P lending (Aave Lend, etc.)

Traditional P2P lending requires manual matching between lender and borrower. Bivium is programmatic and instant: the lender defines its terms once, and any borrower who meets them can borrow without manual lender intervention.

### 4.5 Vs orderbook DEXs (Hyperliquid, Vertex, Aevo)

The closest market-structure analogue to Bivium is a one-sided spot orderbook with **best-effort liquidity** (think RFQ or OTC programmatic, not a matching engine with locked size). Differences worth being honest about up front:

- **One-sided.** Only lenders post resting orders; borrowers always come as takers (market orders). No bid/ask symmetry.
- **Size is indicative, not locked.** A maker's quoted size is `balanceOf(lender)` at quote time. Between quote and execution it can change (the lender can move funds to Pendle, etc.). The router tolerates this with a per-fill `try/catch`: a failed fill is skipped, the next-best candidate is consumed instead, and the whole tx still reverts atomically if the aggregate fails coverage, slippage, or health-factor bounds. This is the same posture as RFQ desks, not the same posture as Binance's matching engine.
- **No on-chain matching engine.** Matching is off-chain (indexer + frontend). On-chain we just have an executor + bound checks. The lack of time-priority is a deliberate choice for v1.
- **Lending semantics carry over.** Each fill leaves a debt position between the borrower and the specific maker, with health-factor and liquidation rules — unlike a spot orderbook where post-fill the counterparty doesn't matter.

---

## 5. The wedge over the Aave/rsETH incident

The rsETH incident is the perfect pedagogical use case for the pitch. **But framing matters**:

### 5.1 What CAN be claimed honestly

- **Blast radius containment.** If Alice as a sovereign lender did not accept rsETH as collateral, Alice eats none of the rsETH bad debt. Damage stays contained to the lenders who signed that exposure.
- **No forced socialization.** A WETH depositor who never wanted rsETH exposure would never have had it. In Aave, governance put them into that trade.
- **The liquidation mechanism doesn't collapse.** In Aave, liquidators didn't act at 100% utilization because they were paid in locked pool receipts instead of real WETH. In a pool-per-lender architecture, the specific lender's WETH is available to be swapped for the specific borrower's collateral. There's no race condition over aggregated liquidity.
- **Flight to safety would work.** Post-incident, $1.3B moved from Aave to SparkLend within days — but many depositors couldn't exit because their liquidity was locked. In a pool-per-lender architecture, lenders who didn't accept rsETH keep working normally and can withdraw freely.

### 5.2 What CANNOT be claimed (and an adversarial jury will catch)

- **"We would have prevented the hack."** False. If a sovereign lender had accepted rsETH at 90% LTV with the same oracle, they'd have eaten it just the same. The exploit was Kelp's bridge, not Aave's.
- **"We detect broken collaterals."** False. The architecture detects nothing that an oracle doesn't detect.
- **"It's safer in aggregate."** Debatable. Distributing bad debt across many lenders isn't necessarily "safer" overall — it's different. What is true is that the risk is **consensual**: each lender signed off on their exposure.

### 5.3 Key pitch line

> Pooled lending socializes risk. Pool-per-lender individualizes it. Your exposure is your signature, not the DAO's.

---

## 6. Tech stack

### 6.1 Base layer

- **EVM (Ethereum + L2s).** Initial deployment on **Arbitrum** because of the hackathon sponsor and because Arbitrum has been pushing the "finance-native execution layer" thesis for years.
- **ERC-7702** for EOA → smart contract delegation.
- **ERC-7715** (request permissions) — optional but powerful — so borrowers can pre-sign intents and delegates execute autonomously.

### 6.2 Lending engine

- **Morpho Blue (minimal fork)** as the base. For the reasons in section 4.2. We forked it because we changed the IRM model (see below) and because the auto-forward of idle supply back to the lender's EOA after every repay/liquidation is not in vanilla Morpho — it's what closes the JIT loop.
- Each market is uniquely keyed by `(loanToken, collateralToken, oracle, ratePerSecond, lltv, creator)`. A single lender (the `creator`) can have many markets across collateral pairs and rates.
- The rate is **inline** as `ratePerSecond` inside `MarketParams`. There is **no external IRM contract** — no factory, no per-lender IRM deployment. This was the right simplification: a lender changing rate doesn't deploy anything; the existing markets at the old rate keep running (immutable by design); new fills at the new rate create a new market on demand.
- `oracle` and `lltv` are **curated by the Bivium owner** via `tokenConfigs[collateralToken]`, not chosen per-lender. Lenders pick the rate; the protocol picks the oracle/LLTV for each whitelisted collateral. This keeps rogue oracles out without forcing centralized governance on rates.

### 6.3 Own layer (what we build during the hackathon)

**Contracts (current state, all under `apps/contracts/src/`):**

1. **`Bivium.sol`** (~500 lines, fork of Morpho Blue).
   The lending engine. Supply / borrow / repay / liquidate / accrue. Two material differences vs vanilla Morpho:
   - Inline `ratePerSecond` per market (no IRM contract).
   - **Auto-forward**: after every `repay` and `liquidate`, idle supply is transferred to the market's `creator` EOA. This means lender capital never sits trapped in the protocol — the JIT loop closes automatically.

2. **`BiviumProfile.sol`** (~300 lines, the ERC-7702 delegate template).
   The contract the lender's EOA delegates to via 7702. Storage: `rates[loanToken]`, `allowedCollaterals[]`, `paused` flag. Public API: `setRate`, `setAllowedCollaterals`, `addAllowedCollateral`, `removeAllowedCollateral`, `pause`, `unpause`. The router calls `fulfillBorrow(params, amount)` on it during a borrow; the Profile validates the rate / pause state / collateral whitelist, creates the market on demand if it doesn't exist, gives a transient approve to Bivium, supplies on behalf of the lender, then resets the approve. No persistent approvals are ever issued. Funds live in the EOA between fills.

3. **`BiviumRouter.sol`** (~150 lines, the orderbook executor).
   Stateless entry point for borrowers. The borrow API takes a single `BorrowOrder` containing `loanToken`, `collateralToken`, `loanAmount`, `collateralAmount`, `maxAvgRatePerSecond` (slippage), `minHealthFactor` (collateral buffer), and a `BorrowFill[]` array of candidate lenders sorted by rate ascending. The router:
   - Pre-checks the health factor against the live oracle price *before* pulling collateral.
   - Walks the candidates in order; for each, reads `balanceOf(creator)`, takes `min(balance, remaining)`, attempts `fulfillBorrow → supplyCollateral → borrow` inside a `try/catch`. Failed fills (paused lender, stale rate, balance moved away) are skipped silently and the loop continues with the next candidate.
   - At the end, reverts if coverage incomplete (`InsufficientLiquidity`), if the realized weighted-average rate exceeds the cap (`SlippageExceeded`), or refunds dust + zeros the allowance otherwise.
   - Emits `Fill` per individual fill (lender-facing view) and `OrderFilled` once with the aggregate (borrower-facing view).
   The router also exposes `repay` and `closePosition` flows (atomic multi-market repay + collateral withdraw).

4. **`BiviumEventEmitter.sol`** (~80 lines, centralized event surface).
   Gated by `EXTCODEHASH` so only EOAs delegated to the canonical `BiviumProfile` template can emit. Plays the role of "lender registry" by emitting `LenderRegistered`, `RateSet`, `AllowedCollateralsSet/Added/Removed`, `MarketCreated`, `Paused`, `Unpaused`. The indexer listens to one address, not a dynamic factory-spawned set.

**What we explicitly did NOT build (decisions made):**

- **No `FixedRateIRMFactory` / `FixedRateIRM`.** The rate is inline; this whole layer was unnecessary.
- **No on-chain registry contract.** The EventEmitter + the indexer cover discovery cheaper than a queryable on-chain registry.
- **No `IntentMatcher`.** The router already does multi-fill atomic borrows. Off-chain quoting (indexer) + on-chain execution (router with slippage and HF guards) is the same shape as an intent system without the extra contract.

**Frontend to build:**

- **Borrower view**: orderbook table per `(loanToken, collateralToken)` pair sorted by rate ascending, with each row showing the lender's identity (ENS), indicative size (`balanceOf`), and rate. The borrow form is a market order: loan amount, target health factor (slider), slippage tolerance. The frontend computes `collateralAmount`, `maxAvgRatePerSecond`, and the `BorrowFill[]` depth and sends a single `BorrowOrder` to the router.
- **Lender view**: two panels — *Open Offer* (current rate, collateral whitelist, indicative size, pause switch) and *Active Positions* (live debts owed to this lender, with health factor per borrower). It must be visually clear that pausing or changing rate **cancels the open offer** but does **not** unwind existing positions (they continue to accrue and remain liquidatable).
- **ENS resolution** everywhere so `jesus.eth` shows instead of `0x…`.

---

## 7. Open design decisions / to discuss

### 7.1 Where do the lender's funds live?

**Decision made (reversed from the original draft): in the lender's EOA, supplied JIT (Just-In-Time) into Bivium only at the moment a borrow fires.**

The original draft of this doc chose the opposite — funds custodied by Morpho Blue — because of one objection: "an EOA with 7702 can sign normal transactions that bypass the delegate, so the lender can drain their funds at any time, even mid-borrow; the promise 'these USDC are available to be borrowed' doesn't hold while funds live in a sovereign EOA." That objection is correct *technically* but resolves cleanly once we accept that **Bivium is OTC-programmatic, not pooled-guaranteed liquidity**:

- The size a lender shows in the orderbook is **indicative**, sourced from `balanceOf(lender)`. It is not locked.
- If a lender moves their funds out between quote and execution, the specific fill against them reverts; the router's `try/catch` skips it and consumes the next candidate. Atomicity is preserved at the order level.
- Reputation is the enforcement mechanism. A lender who repeatedly disappears burns their on-chain brand. This is the same posture as an OTC desk: the maker's credit and consistency are the product.

In exchange we get the property that makes Bivium meaningful in the first place: **lender capital is never trapped**. While idle, it sits in the EOA and can be put to work elsewhere (sweeps to Pendle, yield aggregators, the lender's market-making book). When a borrow fires, the Profile pulls only the exact loan amount, supplies it to Bivium, the borrower receives it, and `auto-forward` returns repaid principal directly to the EOA on every repay. Zero idle capital in the protocol. Zero persistent approvals.

The framing that resolves this in the pitch: *"Bivium is to lending what RFQ is to spot — indicative quotes, atomically enforced fills, reputation-backed liquidity. Not a pool."*

### 7.2 One market per lender or shared markets?

**Decision made: 1 market per `(creator, loanToken, collateralToken, ratePerSecond)` tuple.**

A single lender can have many markets simultaneously — one per loan token they offer × per collateral they accept × per rate they've offered historically. Markets are immutable: when a lender changes rate, the existing markets at the old rate keep running until repaid; new fills create a new market on demand. From the borrower's perspective each market is a distinct order. From the lender's perspective their "current offer" is the most recent rate per loan token; the older markets are legacy positions.

Cost: market creation is ~50k gas, lazy (only created when first borrowed against). Benefit: total isolation between lenders + total isolation across rate changes by the same lender.

### 7.3 Fixed rate or curve?

**Decision made: fixed `ratePerSecond` inline. No IRM contract.**

The original draft proposed a `FixedRateIRMFactory` deploying one IRM per lender. We dropped it: a `uint256 ratePerSecond` field inside `MarketParams` is functionally identical at 0 deployment gas and 0 added complexity. The lender's "rate" is mutable per loan token via `Profile.setRate(token, newRate)`; existing markets keep the rate that was inlined into their `Id`. A future curve variant (kinked utilization curve, time-decaying rate) would require reintroducing an IRM contract — possible for v2, not needed for v1.

### 7.4 Permissionless or reputation-gated?

**Decision made: permissionless by default, reputation-gating as optional variant.**

By default, anyone can borrow from any lender if they meet the terms. Optional variant: the lender can sign a borrower whitelist or require attestations (Gitcoin Passport, ERC-8004 scores). This stays as "v2" but gets mentioned in the pitch to open the conversation with reputation infrastructure.

### 7.5 Liquidations — own or delegated to Morpho?

**Decision made: delegated to Morpho Blue.**

Morpho Blue already has an audited liquidation mechanism. External liquidators (keepers, MEV searchers) are already operating against Morpho markets. We reuse that infrastructure. We don't need to run bots or convince anyone to liquidate.

### 7.6 Borrower also delegated via 7702?

**Decision made: borrower is a normal EOA interacting with Bivium directly via the Router.**

The borrower authorizes the Router once on Bivium (`setAuthorization`), approves the Router for the collateral token, and then can submit `BorrowOrder` market orders. No delegate needed. Keeps the flow simple. A future version could introduce a BorrowerDelegate for auto-repay, auto-collateral-top-up on price drops, etc., but that's out of the initial scope.

### 7.7 Borrower-side guards: slippage and health factor

**Decision made: both bounds enforced on-chain inside the Router, mirroring Uniswap-style swap protections.**

The router accepts two borrower-controlled bounds on every `BorrowOrder`:

- `maxAvgRatePerSecond` — the maximum *weighted-average* rate the borrower is willing to pay across all fills. Mirrors the `minAmountOut` of a spot swap. If transient liquidity disappears (a maker moves funds away, pauses, or changes rate between quote and execution), the router consumes worse-priced candidates from the depth array; if the realized weighted average exceeds the cap, the whole tx reverts.
- `minHealthFactor` — the minimum HF the resulting position must satisfy *given the borrower's chosen collateral*. Validated against the live oracle price **before** pulling collateral, so a stale quote can't trap funds. The check is performed once at the aggregate level (not per fill): because all markets sharing the same collateral share the same `lltv` and `oracle`, and collateral is distributed proportionally across fills, per-market HF is identical to aggregate HF — one check protects all of them.

These two guards together turn the router from a "trustful executor of the frontend's plan" into a "smart order router" with bounded worst-case outcomes. The frontend can ship buggy quotes and the borrower is still safe: at worst the tx reverts.

Both bounds are *enforced in the contract*, not just shown in the UI, for defense-in-depth and so that integrators calling the router directly (without our frontend) get the same protection.

### 7.8 Failed fills: skip vs revert?

**Decision made: skip silently on `fulfillBorrow` failure, continue with the next candidate.**

The router wraps only `fulfillBorrow` (the JIT supply step on the lender's Profile) in `try/catch`. If it reverts — for any reason: paused lender, rate changed between quote and execution, balance moved to Pendle, collateral newly removed from the whitelist — the router skips that candidate and tries the next one. If `fulfillBorrow` succeeds, the subsequent `supplyCollateral` and `borrow` calls are guaranteed to succeed for that fill (any revert from them would indicate a contract-level bug and must propagate).

The alternative — revert the whole order on any failure — was rejected because it makes the orderbook fragile to normal lender behavior (a single paused lender in a candidates array would brick the whole borrow). The frontend just needs to pass enough depth in the array (e.g. ~10× the requested amount) so transient failures don't run out the runway.

---

## 8. Roadmap

### 8.1 Hackathon (3 weeks, May 25 – June 14, 2026)

> **Note:** the bullets below are the *original* week-by-week plan from v1.1. The contract architecture shipped differently — see §6.3 for the contracts actually built (`Bivium` fork, `BiviumProfile`, `BiviumRouter`, `BiviumEventEmitter`; no `FixedRateIRMFactory`, no separate `LenderRegistry` contract).

**Week 1:**
- Repo setup (Foundry).
- Deep dive on Morpho Blue. Understand the exact supply / borrow / liquidate flow.
- Fork Morpho Blue into `Bivium.sol` with inline `ratePerSecond` and auto-forward of idle supply.
- Design the `BiviumProfile` storage (ERC-7702 delegate).
- Frontend base setup (Next.js + viem + wagmi + shadcn).

**Week 2:**
- Write `BiviumProfile` with all core functions (`setRate`, `setAllowedCollaterals`, `pause`, `fulfillBorrow`).
- Write `BiviumRouter` with orderbook semantics (`BorrowOrder` with slippage + HF guards, multi-fill `try/catch`).
- Write `BiviumEventEmitter` (centralized event surface for the indexer, gated by `EXTCODEHASH`).
- Integration tests: full flow lender activation → borrower market-order borrow → repay → withdraw.
- Frontend: lender orderbook view + lender configuration view.
- Deploy to Arbitrum Sepolia.

**Week 3:**
- Full frontend (borrower flow, positions, ENS resolution).
- End-to-end demo flow with two demo lenders and one demo borrower.
- Polish: animations, edge-case handling, clear error messages.
- Pitch video (2-3 minutes).
- Extensive README explaining the primitive, the rsETH/Aave angle, design decisions.
- Submission to Colosseum / Arbitrum buildathon.

### 8.2 Post-hackathon (if it wins or we want to continue)

- **Audits.** Even though Morpho Blue is audited, our `Bivium` fork, `BiviumProfile`, and `BiviumRouter` are not. For real production this is blocking.
- **Multi-chain.** Deploy to Base, mainnet, and other L2s where Morpho Blue is present.
- **Parallel yields.** When a lender has unlent funds (because they're waiting for borrowers), those funds sit in Morpho Blue earning 0% (they don't auto-lend to anyone). We could integrate a sweep to a yield aggregator (Yearn, etc.) so the lender earns base yield while waiting for borrowers, and auto-withdraws when demand arrives. Trickier, but an important differentiator.
- **Reputation layer.** Integration with ERC-8004 or similar systems for reputation-gated lending.
- **Cross-lender aggregator frontend.** A frontend that discovers borrowers and automatically matches them with the optimal lender (best available rate, lowest delay, etc.). This is what turns the primitive into a market.
- **Packaged as SDK.** So other frontends (DeFi dashboards, wallets) can integrate Bivium and show "borrowing from `jesus.eth`" as a native option.

---

## 9. Hackathon fit

### 9.1 Arbitrum Open House London Buildathon

- **Dates:** May 25 – June 14, 2026 (3 weeks online).
- **Prizes:** $115K total. Top 3 share $70K. AI agentic category separate, $15K.
- **Top 3** includes a reserved slot for Robinhood Chain.
- **Top winners** get access to the Founder House IRL in London ($300K additional).
- **Main sponsor:** Arbitrum Foundation + Robinhood Chain.
- **Mentor partners:** Pendle, Variational, IOSG, Horizen Labs.

### 9.2 Why it fits

- **Arbitrum "programmable economy" narrative:** programmable lending at the individual level is exactly that.
- **Tokenized assets:** Morpho markets are composable.
- **ERC-7702 + ERC-7715:** Arbitrum is actively pushing them. 7715 is already live on Arbitrum.
- **Robinhood Chain retail angle:** "lend to your followers" or "borrow from verified creators" fits their retail focus.
- **AI agentic category** ($15K extra): the BiviumProfile + Router already behave as a permissionless intent system — borrowers submit a `BorrowOrder` intent and the Router fulfills it atomically across multiple sovereign-lender Profiles, each acting as an autonomous economic agent that decides whether to fill based on its own configured rules.

### 9.3 Why it can win (not just participate)

- **A new primitive, not an improved clone.** Most hackathon projects are "X better than existing Y". Bivium introduces a new concept: the lender as on-chain identity, the bivium as venue.
- **Justified technical wedge.** ERC-7702 is the technology the sponsor is pushing, and without it Bivium doesn't exist. The sponsor has an incentive to highlight it because it validates their narrative.
- **Perfect timing.** The Aave/rsETH incident is 5 weeks old. The wound is fresh. The pitch resonates.
- **Memorable pitch.** "Your wallet is Aave" + the Latin name create a sticky moment.

---

## 10. Risks and anticipated objections

### 10.1 Technical risks

- **Bug in `BiviumProfile` or `BiviumRouter`.** Even though Morpho Blue is audited, our Profile (the 7702 delegate) and Router are not. If the Profile has a bug, the lender loses funds; if the Router has a bug, the borrower loses funds. Mitigation: exhaustive tests, no persistent approvals (Profile uses only transient approves), stateless Router (zero balance invariant between calls), minimal surface area.
- **Oracle staleness.** If the market's oracle fails, liquidations don't happen on time. Mitigation: only allow Chainlink oracles (or verified equivalents) in the initial factory.
- **MEV on liquidations.** Inherited from Morpho — not a new problem.
- **Gas cost to activate as a lender.** No contract deployment per lender — the rate is inline in `MarketParams` and the Profile is a shared template the EOA delegates to via 7702. Activation is just: one 7702 delegation tx + `setRate` + `setAllowedCollaterals`. Total: well under $1 on Arbitrum. The lender's first market is created lazily on first borrow (~50k gas, paid in that tx).

### 10.2 Anticipated Q&A objections

**"Why not Morpho Blue directly with MetaMorpho vaults?"**
> MetaMorpho introduces curators who manage capital from many depositors. It's still aggregation. Bivium goes to the opposite extreme: 1 lender = 1 venue. The identity is the minimum unit, not the curator.

**"Doesn't this fragment liquidity?"**
> Yes, consciously. Fragmentation is a feature, not a bug. Each lender has total control over their risk. What's needed on top is an *aggregator frontend* that automatically discovers the best borrowing option across all active lenders. That's UI work, not protocol work.

**"Who's going to be a sovereign lender? Most people prefer to deposit in Aave and forget about it."**
> True for passive retail. Bivium is not for passive retail — that's what Aave/Morpho Vaults are for. It's for *professional lenders*: trading firms, market makers, family offices, creators with capital, DAOs that want to lend treasury with custom terms. Estimate: the TAM is not "all DeFi depositors" but "all entities that want to offer credit with specific terms" — which today they do via OTC desks or Maple Finance.

**"How does discovery scale if each lender is a market?"**
> Aggregator frontends index all lenders and offer "borrow from the best available terms." The protocol is the primitive. Discovery is UI. The two scale independently.

**"Isn't this just Morpho V2 with extra steps?"**
> Morpho V2 is intent-based but agnostic about identity. Any solver can fulfill. In Bivium, the fulfiller's identity (the lender) is part of the product. Borrowers choose to borrow from Alice because they know Alice, not from an anonymous solver. It's the difference between anonymous OTC and OTC with a known counterparty.

**"And regulation?"**
> Peer-to-peer lending can trigger money-transmitter laws in the US and MiFID II in the EU for production. For the hackathon this is irrelevant. For productization: offshore incorporation, opt-in KYC for professional lenders, or geographic restriction via the frontend. Not blocking at the protocol level (the protocol is permissionless), blocking at the interface level.

---

## 11. Success metrics

### 11.1 Hackathon

- Complete submission with a working demo on testnet.
- Top 3 would be the reasonable target. Top 10 is the acceptable minimum.
- AI agentic category ($15K extra) leveraging the Profile-as-intent-fulfiller framing (each Profile is an autonomous on-chain agent that decides whether to fill a borrow intent based on its configured rules).

### 11.2 Post-hackathon

- 10 active sovereign lenders on mainnet in 6 months.
- $5M TVL in 12 months.
- Integration with at least 1 external aggregator frontend.
- One completed audit of `Bivium`, `BiviumProfile`, and `BiviumRouter` before TVL >$1M.

---

## 12. Appendix: quick glossary

- **EOA (Externally Owned Account):** a wallet with a private key, not a contract. Example: a MetaMask wallet.
- **ERC-7702:** standard that lets an EOA delegate its execution to a smart contract without losing its address.
- **ERC-7715:** standard for a user to grant limited permissions to another entity to act on their behalf (request permissions).
- **LLTV (Liquidation Loan-To-Value):** the maximum LTV before a position is liquidatable.
- **LIF (Liquidation Incentive Factor):** the bonus the liquidator takes.
- **IRM (Interest Rate Model):** the function that calculates the interest rate in a market.
- **Aggregated pool:** model where many depositors mingle funds in a common pool.
- **Pool-per-lender:** Bivium's model — each lender has their own individual pool (their *bivium*).
- **Blast radius:** the area of damage when something goes wrong. Aggregated pool = huge blast radius. Pool-per-lender = contained blast radius.
- **Bad debt:** debt in a protocol that cannot be repaid (typically because the collateral fell below the loan value and liquidation didn't execute in time).
- **Risk socialization:** when losses are distributed across all participants of a pool, including those who didn't approve the exposure that caused the loss.
- **Maker / taker:** orderbook terminology. In Bivium, lenders are *makers* posting resting offers; borrowers are *takers* placing market orders.
- **Fill:** a single match between a taker's order and one maker's resting order. A Bivium borrow can produce multiple fills atomically.
- **Market order:** a borrower's `BorrowOrder` walks the book greedily from the best rate up until the requested amount is covered (or reverts). Equivalent to a Uniswap-style swap.
- **Limit order (resting):** a lender's open offer — defined by `(loanToken, allowedCollaterals[], ratePerSecond, paused?)` on their Profile, sized indicatively by `balanceOf(lender)`.
- **Slippage (`maxAvgRatePerSecond`):** the borrower's maximum tolerated weighted-average rate. Equivalent to `minAmountOut` in spot swaps.
- **Indicative liquidity:** size shown in the orderbook is `balanceOf(maker)` at quote time, not locked. Fills are atomically enforced — if the size isn't there at execution, the router skips and the next candidate is consumed. Same posture as RFQ desks.
- **JIT supply (Just-In-Time):** lender capital lives in the lender's EOA; it flows into Bivium only at the moment a borrow fires, and `auto-forward` returns it on every repay. No idle capital trapped in the protocol.

---

*Context document v1.2 — basis for discussions, pitch, README, and any other derived documentation. v1.1 → v1.2 changes: added the orderbook framing (taglines, dual model in §2.4, vs orderbook DEXs in §4.5), realigned the tech-stack sections (§6.2–6.3) to the actual contracts (`Bivium`, `BiviumProfile`, `BiviumRouter`, `BiviumEventEmitter` — no IRM factory, no LenderRegistry contract), reversed §7.1 to reflect the JIT funds model, added §7.7 (slippage and HF guards in the Router) and §7.8 (failed-fill skip semantics), updated §7.2–7.3 to inline-rate semantics, and extended the glossary with orderbook terminology. Last edited: May 2026. Official name: Bivium.*
