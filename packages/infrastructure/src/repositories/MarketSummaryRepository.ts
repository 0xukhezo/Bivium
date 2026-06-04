import type { IMarketSummaryRepository, MarketSummary } from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import {
	type RawMarketSummaryRow,
	mapRawRowToMarketSummary,
} from "../mappers/MarketSummaryMapper.js";
import { BaseRepository } from "./BaseRepository.js";

/**
 * Joins the indexer schema (Ponder) with the public schema (Prisma) to build
 * the per-pair orderbook view.
 *
 * Why this shape — Bivium runs a JIT/auto-forward model: lenders never
 * pre-supply, they keep funds in their EOA, and the Router pulls JIT on a
 * fill. So `markets.total_supply_assets` is meaningless as "available
 * liquidity" — it spikes briefly and then auto-forwards back to the lender.
 * The real available liquidity per pair is:
 *
 *     SUM(balanceOf(lender, loanToken))
 *     for every UNIQUE lender that
 *       · has rate>0 set for loanToken         (indexer.lender_rates)
 *       · whitelists this collateral           (indexer.lender_collaterals)
 *       · is unpaused                          (indexer.lenders)
 *
 * The watcher → reactor pipeline keeps `public.user_current_balances` in sync
 * with on-chain wallet balances via Alchemy webhooks. This repo just joins.
 *
 * `total_borrowed` still comes from `indexer.markets.total_borrow_assets` —
 * that's the only place open positions live.
 *
 * `best_rate_per_second` is MIN(lender_rates.rate_per_second) among lenders
 * with `balance > 0` (an offer with $0 wallet balance is not fillable).
 *
 * The indexer schema name is taken from `INDEXER_SCHEMA` env var (default
 * `indexer`). In local dev Ponder writes directly to `indexer_dev`; in
 * production the blue/green deploy publishes a stable `indexer` views schema.
 *
 * Indexer columns are `numeric(78,0)` (token amounts can exceed bigint), so
 * the SUM aggregates are cast to text and parsed to BigInt in the mapper.
 */
@injectable()
export class MarketSummaryRepository
	extends BaseRepository
	implements IMarketSummaryRepository
{
	private readonly schema: string;

	constructor() {
		super();
		this.schema = process.env.INDEXER_SCHEMA ?? "indexer";
	}

	async listActivePairs(chainId: number): Promise<MarketSummary[]> {
		const tokensTable = Prisma.raw(`"${this.schema}"."tokens"`);
		const marketsTable = Prisma.raw(`"${this.schema}"."markets"`);
		const lenderRatesTable = Prisma.raw(`"${this.schema}"."lender_rates"`);
		const lenderCollateralsTable = Prisma.raw(
			`"${this.schema}"."lender_collaterals"`,
		);
		const lendersTable = Prisma.raw(`"${this.schema}"."lenders"`);

		const rows = await this.prisma.$queryRaw<RawMarketSummaryRow[]>(
			Prisma.sql`
				WITH eligible_offers AS (
					SELECT
						t.collateral,
						t.loan,
						t.lltv,
						lr.lender,
						lr.rate_per_second,
						COALESCE(b.balance, 0) AS balance
					FROM ${tokensTable} t
					JOIN ${lenderRatesTable} lr
						ON lr.loan_token = t.loan
					   AND lr.rate_per_second > 0
					JOIN ${lenderCollateralsTable} lc
						ON lc.lender = lr.lender
					   AND lc.collateral = t.collateral
					   AND lc.allowed = true
					JOIN ${lendersTable} il
						ON il.address = lr.lender
					   AND il.paused = false
					LEFT JOIN public.assets a
						ON a.chain_id = ${chainId}
					   AND a.address = t.loan
					LEFT JOIN public.user_current_balances b
						ON b.address  = lr.lender
					   AND b.asset_id = a.id
					WHERE t.active = true
				),
				unique_lender_liquidity AS (
					-- One row per (pair, lender) so the SUM doesn't double-count a
					-- lender that has multiple rates for the same loan token.
					SELECT DISTINCT collateral, loan, lender, balance
					FROM eligible_offers
				)
				SELECT
					t.collateral                                                 AS collateral,
					t.loan                                                       AS loan,
					t.lltv::text                                                 AS lltv,
					COALESCE((
						SELECT SUM(ull.balance)
						FROM unique_lender_liquidity ull
						WHERE ull.collateral = t.collateral
						  AND ull.loan = t.loan
					), 0)::text                                                  AS total_liquidity,
					COALESCE((
						SELECT SUM(m.total_borrow_assets)
						FROM ${marketsTable} m
						WHERE m.collateral_token = t.collateral
						  AND m.loan_token = t.loan
					), 0)::text                                                  AS total_borrowed,
					(
						SELECT MIN(eo.rate_per_second)::text
						FROM eligible_offers eo
						WHERE eo.collateral = t.collateral
						  AND eo.loan = t.loan
						  AND eo.balance > 0
					)                                                            AS best_rate_per_second
				FROM ${tokensTable} t
				WHERE t.active = true
				ORDER BY t.collateral, t.loan
			`,
		);
		return rows.map(mapRawRowToMarketSummary);
	}
}
