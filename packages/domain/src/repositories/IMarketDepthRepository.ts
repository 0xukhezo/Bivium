import type { MarketDepthOffer } from "../entities/MarketDepthOffer.js";

/**
 * Read side of the per-pair borrow-impact curve (the "depth" chart on the
 * pair detail page).
 *
 * Split into two methods so the API can distinguish "pair URL is wrong"
 * (404) from "pair is curated but has zero fillable offers right now"
 * (empty 200). A single method returning `null` for both cases would lose
 * that distinction and either over- or under-respond to the FE.
 */
export interface IMarketDepthRepository {
	/**
	 * Returns the curated pair's `lltv` when `tokens(collateral, loan)` exists
	 * with `active = true`. Returns `null` otherwise — including for inactive
	 * (deprecated) pair rows, which the FE should treat as "not curated".
	 */
	findCuratedPair(input: {
		collateral: string;
		loan: string;
		chainId: number;
	}): Promise<{ lltv: bigint } | null>;

	/**
	 * One row per (lender, pair) fillable offer, ordered by `ratePerSecond ASC`
	 * with `size DESC` as the deterministic tie-breaker — the same order the
	 * Router would consume the orderbook in. Filters mirror
	 * `MarketSummaryRepository.listActivePairs` exactly: `lender_rates.rate > 0`,
	 * `lender_collaterals.allowed`, `lenders.paused = false`,
	 * `public.user_current_balances.balance > 0`.
	 *
	 * Returns the empty list when the pair has no fillable offers (every
	 * eligible lender's wallet is currently empty) OR when the pair isn't
	 * curated. Callers must check `findCuratedPair` first to disambiguate.
	 */
	listEligibleOffers(input: {
		collateral: string;
		loan: string;
		chainId: number;
	}): Promise<MarketDepthOffer[]>;
}
