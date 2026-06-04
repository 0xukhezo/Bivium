import type { IMarketDepthRepository, MarketDepthOffer } from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import {
	type RawMarketDepthOfferRow,
	mapRawRowToMarketDepthOffer,
} from "../mappers/MarketDepthMapper.js";
import { BaseRepository } from "./BaseRepository.js";

/**
 * Read side of the borrow-impact curve. Mirrors
 * `MarketSummaryRepository.listActivePairs` JOINs but filtered to a single
 * `(collateral, loan)` pair and returning one row per eligible lender
 * (instead of pair-level aggregates). The application layer walks those rows
 * into cumulative depth steps.
 */
@injectable()
export class MarketDepthRepository
	extends BaseRepository
	implements IMarketDepthRepository
{
	private readonly schema: string;

	constructor() {
		super();
		this.schema = process.env.INDEXER_SCHEMA ?? "indexer";
	}

	async findCuratedPair(input: {
		collateral: string;
		loan: string;
		chainId: number;
	}): Promise<{ lltv: bigint } | null> {
		const tokensTable = Prisma.raw(`"${this.schema}"."tokens"`);
		const collateral = input.collateral.toLowerCase();
		const loan = input.loan.toLowerCase();

		const rows = await this.prisma.$queryRaw<{ lltv: string }[]>(
			Prisma.sql`
				SELECT t.lltv::text AS lltv
				FROM ${tokensTable} t
				WHERE t.collateral = ${collateral}
				  AND t.loan       = ${loan}
				  AND t.active     = true
				LIMIT 1
			`,
		);
		const head = rows[0];
		if (!head) return null;
		return { lltv: BigInt(head.lltv) };
	}

	async listEligibleOffers(input: {
		collateral: string;
		loan: string;
		chainId: number;
	}): Promise<MarketDepthOffer[]> {
		const tokensTable = Prisma.raw(`"${this.schema}"."tokens"`);
		const lenderRatesTable = Prisma.raw(`"${this.schema}"."lender_rates"`);
		const lenderCollateralsTable = Prisma.raw(
			`"${this.schema}"."lender_collaterals"`,
		);
		const lendersTable = Prisma.raw(`"${this.schema}"."lenders"`);
		const collateral = input.collateral.toLowerCase();
		const loan = input.loan.toLowerCase();

		const rows = await this.prisma.$queryRaw<RawMarketDepthOfferRow[]>(
			Prisma.sql`
				SELECT
					lr.lender                          AS lender,
					lr.rate_per_second::text           AS rate_per_second,
					COALESCE(b.balance, 0)::text       AS size
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
					ON a.chain_id = ${input.chainId}
				   AND a.address = t.loan
				LEFT JOIN public.user_current_balances b
					ON b.address  = lr.lender
				   AND b.asset_id = a.id
				WHERE t.collateral = ${collateral}
				  AND t.loan       = ${loan}
				  AND t.active     = true
				  AND COALESCE(b.balance, 0) > 0
				ORDER BY lr.rate_per_second ASC, COALESCE(b.balance, 0) DESC
			`,
		);
		return rows.map(mapRawRowToMarketDepthOffer);
	}
}
