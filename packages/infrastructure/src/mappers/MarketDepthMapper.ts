import { MarketDepthOffer } from "@bivium/domain";

/**
 * Raw shape returned by the per-pair eligible-offer query. Numeric columns
 * (rate, balance) are cast to text in SQL because `numeric(78,0)` exceeds the
 * JS Number safe range and Prisma would otherwise decode them as `Decimal`.
 */
export interface RawMarketDepthOfferRow {
	lender: string;
	rate_per_second: string;
	size: string;
}

export function mapRawRowToMarketDepthOffer(
	row: RawMarketDepthOfferRow,
): MarketDepthOffer {
	return new MarketDepthOffer({
		lender: row.lender,
		ratePerSecond: BigInt(row.rate_per_second),
		size: BigInt(row.size),
	});
}
