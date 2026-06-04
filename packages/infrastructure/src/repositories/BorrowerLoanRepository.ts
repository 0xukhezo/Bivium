import type {
	BorrowerLoanPosition,
	IBorrowerLoanRepository,
} from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import {
	type RawBorrowerLoanPositionRow,
	mapRawRowToBorrowerLoanPosition,
} from "../mappers/BorrowerLoanMapper.js";
import { BaseRepository } from "./BaseRepository.js";

/**
 * "Your loans" projection — every open `(marketId, borrower)` position the
 * borrower holds, joined with the market record for the metadata the FE needs
 * to render the row and build a Repay tx (oracle, lltv, ratePerSecond,
 * lender == markets.creator, plus the market's Morpho share totals so the
 * application layer can convert `borrow_shares → assets`).
 *
 * Filters `borrow_shares > 0`. A position with `borrow_shares = 0` and
 * `collateral > 0` is escrowed collateral awaiting `withdrawCollateral`; it is
 * not a loan and should not appear on this dashboard.
 *
 * `chainId` is plumbed through for symmetry with the other indexer-backed
 * repos but the indexer is single-chain today (Arbitrum One), so it currently
 * has no effect on the SQL. The aggregation by `(collateralToken, loanToken)`
 * pair is done in the application layer — a borrower's open positions don't
 * justify a SQL `GROUP BY` round-trip.
 */
@injectable()
export class BorrowerLoanRepository
	extends BaseRepository
	implements IBorrowerLoanRepository
{
	private readonly schema: string;

	constructor() {
		super();
		this.schema = process.env.INDEXER_SCHEMA ?? "indexer";
	}

	async listOpenByBorrower(input: {
		borrower: string;
		chainId: number;
	}): Promise<BorrowerLoanPosition[]> {
		const positionsTable = Prisma.raw(`"${this.schema}"."positions"`);
		const marketsTable = Prisma.raw(`"${this.schema}"."markets"`);
		const borrower = input.borrower.toLowerCase();

		const rows = await this.prisma.$queryRaw<RawBorrowerLoanPositionRow[]>(
			Prisma.sql`
				SELECT
					p.market_id                       AS market_id,
					m.collateral_token                AS collateral_token,
					m.loan_token                      AS loan_token,
					m.oracle                          AS oracle,
					m.creator                         AS lender,
					m.lltv::text                      AS lltv,
					m.rate_per_second::text           AS rate_per_second,
					p.borrow_shares::text             AS borrow_shares,
					p.collateral::text                AS collateral_amount,
					m.total_borrow_assets::text       AS total_borrow_assets,
					m.total_borrow_shares::text       AS total_borrow_shares
				FROM ${positionsTable} p
				JOIN ${marketsTable}   m ON m.id = p.market_id
				WHERE p.borrower = ${borrower}
				  AND p.borrow_shares > 0
				ORDER BY m.loan_token, m.collateral_token, m.rate_per_second
			`,
		);
		return rows.map(mapRawRowToBorrowerLoanPosition);
	}
}
