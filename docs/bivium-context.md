# Bivium — Project Context

**Name:** Bivium
**Etymology:** Latin *bivium*, "a place where two paths meet" (from *bi-* "two" + *via* "way/path"). The pre-pool model of lending: two parties, one meeting point, no aggregation.
**Short tagline:** *Be your own Aave.*
**Alternate tagline:** *Two paths. One loan. No pool.*
**Long tagline:** Turn your EOA into a personal lending protocol. Your wallet is the venue. Your identity is the brand. Your terms are the law.
**Proprietary vocabulary:** a **bivium** = a single-lender lending venue. Plural: **bivia**. "Browse bivia", "open your bivium", "borrow from cobie's bivium".

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

- **Morpho Blue** as the base. For the reasons in section 4.2.
- Each lender deploys (or references) **their own market on Morpho** with:
  - `loanToken`: the token they lend (USDC, USDT, WETH).
  - `collateralToken`: the collateral they accept (1 per market).
  - `oracle`: the oracle that validates (Chainlink on mainnet, equivalent oracles on L2s).
  - `irm`: a **custom FixedRateIRM** (factory pattern so each lender has one with a unique address).
  - `lltv`: the LLTV chosen by the lender (within those enabled by Morpho governance).

### 6.3 Own layer (what we build during the hackathon)

**Contracts to write:**

1. **`LenderDelegate.sol`** (core, ~200-300 lines).
   The contract the lender's EOA delegates to via 7702. Responsibilities:
   - Hold the lender's config (active markets, caps, optional blacklists).
   - Function to create the market on Morpho with the params signed by the lender.
   - `topUp(amount)` function so the lender can supply funds to the market.
   - `withdraw(amount)` function to withdraw (Morpho guarantees only the non-lent portion can be withdrawn).
   - `pause()` function to stop accepting new borrows.
   - `revoke()` function to withdraw everything and deactivate.
   - Morpho auth handling via `setAuthorization` or `setAuthorizationWithSig`.

2. **`FixedRateIRMFactory.sol` + `FixedRateIRM.sol`** (~50 lines each).
   Factory that deploys a new FixedRateIRM for each lender that activates. This ensures every market on Morpho has a unique Id even if two lenders offer the same params (same loan/collateral/oracle/LLTV but distinct IRM = distinct market).

3. **`LenderRegistry.sol`** (~150 lines).
   Public registry of active lenders with their configs and stats. Enables discovery. This is what the frontend reads to show "these lenders are accepting borrows right now."

4. **`IntentMatcher.sol`** (optional, ~200 lines if included).
   RFQ-style: borrowers sign intents ("I want to borrow X USDC against Y WBTC at max Z% APR"), lenders with compatible delegates auto-fulfill. This opens the hackathon's "AI agentic" category ($15K separately).

**Frontend to build:**

- Lender directory (browse by collateral, rate, LTV, identity).
- Per-lender view (configure your LenderDelegate via 7702).
- Borrower view (find lender, deposit collateral, borrow).
- Active positions view (lender and borrower).
- Ideally with ENS resolution so `jesus.eth` shows up instead of `0x...`.

---

## 7. Open design decisions / to discuss

### 7.1 Where do the lender's funds live?

**Decision made: in Morpho Blue (custodial-by-Morpho).**

The alternative — "the USDC lives in the lender's EOA until lent" — would be narratively purer but isn't enforceable on-chain: an EOA with 7702 can sign normal transactions that bypass the delegate, so the lender can drain their funds at any time, even mid-borrow. The promise "these USDC are available to be borrowed" doesn't hold while funds live in a sovereign EOA.

So: the lender's USDC goes to Morpho Blue on `topUp`. The lender's EOA is the **position owner** in Morpho, not the physical holder. The narrative adjusts to: *"Your EOA controls a vault that you control exclusively. You sign everything. If you want to exit, you withdraw and revoke."*

### 7.2 One market per lender or shared markets?

**Decision made: 1 market per lender, via unique IRM.**

The IRM factory ensures that each lender, even when offering identical params to another lender, has a separate market on Morpho. Cost: deploy gas (one new IRM per lender, ~150k gas). Benefit: total isolation between lenders, and "this is YOUR market" branding.

### 7.3 Fixed rate or curve?

**Decision made: fixed rate to start. Simple curve optional as a variant.**

Simpler to implement and easier to pitch ("predictable rates, not Aave's rollercoaster"). The FixedRateIRM is 30 lines. A simple kinked curve would be 100. For the hackathon: fixed.

### 7.4 Permissionless or reputation-gated?

**Decision made: permissionless by default, reputation-gating as optional variant.**

By default, anyone can borrow from any lender if they meet the terms. Optional variant: the lender can sign a borrower whitelist or require attestations (Gitcoin Passport, ERC-8004 scores). This stays as "v2" but gets mentioned in the pitch to open the conversation with reputation infrastructure.

### 7.5 Liquidations — own or delegated to Morpho?

**Decision made: delegated to Morpho Blue.**

Morpho Blue already has an audited liquidation mechanism. External liquidators (keepers, MEV searchers) are already operating against Morpho markets. We reuse that infrastructure. We don't need to run bots or convince anyone to liquidate.

### 7.6 Borrower also delegated via 7702?

**Decision made: borrower is a normal EOA interacting with Morpho directly.**

The borrower deposits collateral into Alice's market (via Morpho), borrows against that collateral, repays. No delegate needed. Keeps the flow simple. A future version could introduce a BorrowerDelegate for auto-repay, auto-collateral-top-up on price drops, etc., but that's out of the initial scope.

---

## 8. Roadmap

### 8.1 Hackathon (3 weeks, May 25 – June 14, 2026)

**Week 1:**
- Repo setup (Foundry + Hardhat hybrid or Foundry only).
- Deep dive on Morpho Blue. Understand the exact supply / borrow / liquidate flow.
- Write `FixedRateIRM` + `FixedRateIRMFactory` with tests.
- Design the `LenderDelegate` storage.
- Frontend base setup (Next.js + viem + wagmi + shadcn).

**Week 2:**
- Write `LenderDelegate` with all core functions (config, topUp, withdraw, pause, revoke).
- Write `LenderRegistry` with events for the indexer.
- Integration tests: full flow lender activation → borrower borrow → repay → withdraw.
- Frontend: lender directory view + lender configuration view.
- Deploy to Arbitrum Sepolia.

**Week 3:**
- Full frontend (borrower flow, positions, ENS resolution).
- End-to-end demo flow with two demo lenders and one demo borrower.
- Polish: animations, edge-case handling, clear error messages.
- Pitch video (2-3 minutes).
- Extensive README explaining the primitive, the rsETH/Aave angle, design decisions.
- Submission to Colosseum / Arbitrum buildathon.

### 8.2 Post-hackathon (if it wins or we want to continue)

- **Audits.** Even though Morpho Blue is audited, the LenderDelegate and the IRM are not. For real production this is blocking.
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
- **AI agentic category** ($15K extra): if IntentMatcher is included, LenderDelegates are autonomous economic agents acting on intents.

### 9.3 Why it can win (not just participate)

- **A new primitive, not an improved clone.** Most hackathon projects are "X better than existing Y". Bivium introduces a new concept: the lender as on-chain identity, the bivium as venue.
- **Justified technical wedge.** ERC-7702 is the technology the sponsor is pushing, and without it Bivium doesn't exist. The sponsor has an incentive to highlight it because it validates their narrative.
- **Perfect timing.** The Aave/rsETH incident is 5 weeks old. The wound is fresh. The pitch resonates.
- **Memorable pitch.** "Your wallet is Aave" + the Latin name create a sticky moment.

---

## 10. Risks and anticipated objections

### 10.1 Technical risks

- **Bug in LenderDelegate.** Even though Morpho Blue is audited, the delegate is not. If the delegate has a bug, the lender loses funds. Mitigation: exhaustive tests, reentrancy guards, minimal surface area.
- **Oracle staleness.** If the market's oracle fails, liquidations don't happen on time. Mitigation: only allow Chainlink oracles (or verified equivalents) in the initial factory.
- **MEV on liquidations.** Inherited from Morpho — not a new problem.
- **Gas cost per new lender.** Each lender deploys a FixedRateIRM (~150k gas) + interacts with the Morpho factory (~100k gas) + delegate setup. Total: ~$5-15 on Arbitrum depending on gas. Acceptable.

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
- AI agentic category ($15K extra) if IntentMatcher is included.

### 11.2 Post-hackathon

- 10 active sovereign lenders on mainnet in 6 months.
- $5M TVL in 12 months.
- Integration with at least 1 external aggregator frontend.
- One completed audit of the LenderDelegate before TVL >$1M.

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

---

*Context document v1.1 — basis for discussions, pitch, README, and any other derived documentation. Last edited: May 2026. Official name: Bivium.*
