import type {
	ILenderMarketSummaryRepository,
	LenderMarketSummary,
} from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import {
	type RawLenderMarketSummaryRow,
	mapRawRowToLenderMarketSummary,
} from "../mappers/LenderMarketSummaryMapper.js";
import { BaseRepository } from "./BaseRepository.js";

/**
 * "Your markets" projection — every Bivium market this lender owns. Joins:
 *
 *   - `indexer.markets`  (`creator = $lender`) for pair + lltv + loaned amount
 *     + market rate
 *   - `indexer.positions` (SUM(collateral) per market) for the total collateral
 *     backing the lender's open loans. Markets has no aggregated collateral
 *     column, so this is computed on read.
 *   - `indexer.lenders.paused` for the row-level status flag. Pause is global
 *     on the contract (`BiviumProfile.paused`) — every row in the response
 *     shares the same value; we still surface it per-row to match the
 *     dashboard's table shape.
 *
 * `chainId` is plumbed through for symmetry with the other indexer-backed
 * repos but the indexer is single-chain today (Arbitrum One), so it currently
 * has no effect on the SQL.
 *
 * Numeric amounts arrive as text and are widened to BigInt in the mapper —
 * `numeric(78,0)` exceeds JS Number safe range.
 */
@injectable()
export class LenderMarketSummaryRepository
	extends BaseRepository
	implements ILenderMarketSummaryRepository
{
	private readonly schema: string;

	constructor() {
		super();
		this.schema = process.env.INDEXER_SCHEMA ?? "indexer";
	}

	async listByLender(input: {
		lender: string;
		chainId: number;
	}): Promise<LenderMarketSummary[]> {
		const marketsTable = Prisma.raw(`"${this.schema}"."markets"`);
		const positionsTable = Prisma.raw(`"${this.schema}"."positions"`);
		const lendersTable = Prisma.raw(`"${this.schema}"."lenders"`);
		const lender = input.lender.toLowerCase();

		const rows = await this.prisma.$queryRaw<RawLenderMarketSummaryRow[]>(
			Prisma.sql`
				SELECT
					m.id                                                         AS market_id,
					m.collateral_token                                           AS collateral,
					m.loan_token                                                 AS loan,
					m.lltv::text                                                 AS lltv,
					COALESCE((
						SELECT SUM(p.collateral)
						FROM ${positionsTable} p
						WHERE p.market_id = m.id
					), 0)::text                                                  AS collateral_amount,
					m.total_borrow_assets::text                                  AS on_loan_amount,
					m.rate_per_second::text                                      AS rate_per_second,
					COALESCE(il.paused, false)                                   AS paused
				FROM ${marketsTable} m
				LEFT JOIN ${lendersTable} il
					ON il.address = m.creator
				WHERE m.creator = ${lender}
				ORDER BY m.created_at_timestamp DESC
			`,
		);
		return rows.map(mapRawRowToLenderMarketSummary);
	}
}
