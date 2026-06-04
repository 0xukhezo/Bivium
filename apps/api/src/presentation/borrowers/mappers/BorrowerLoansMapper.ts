import type {
	GetBorrowerLoansQueryOutputDto,
	BorrowerLoanPositionDto as HandlerPositionDto,
	BorrowerLoanRowDto as HandlerRowDto,
	BorrowerLoanTokenInfoDto as HandlerTokenInfoDto,
} from "@bivium/application";
import type {
	BorrowerLoanPositionDto,
	BorrowerLoanRowDto,
	BorrowerLoansListDto,
	MarketTokenInfoDto,
} from "@bivium/common/dtos";

export function mapHandlerOutputToResponse(
	output: GetBorrowerLoansQueryOutputDto,
): BorrowerLoansListDto {
	return {
		chainId: output.chainId,
		borrower: output.borrower,
		rows: output.rows.map(mapRow),
	};
}

function mapRow(row: HandlerRowDto): BorrowerLoanRowDto {
	return {
		pairKey: row.pairKey,
		collateral: mapToken(row.collateral),
		loan: mapToken(row.loan),
		lltv: row.lltv.toString(),
		totalCollateralAmount: row.totalCollateralAmount.toString(),
		totalDebtAmount: row.totalDebtAmount.toString(),
		totalCollateralUsd: row.totalCollateralUsd,
		totalDebtUsd: row.totalDebtUsd,
		weightedApy: row.weightedApy,
		lowestHealthFactor: row.lowestHealthFactor,
		positions: row.positions.map(mapPosition),
	};
}

function mapPosition(position: HandlerPositionDto): BorrowerLoanPositionDto {
	return {
		marketId: position.marketId,
		lender: position.lender,
		oracle: position.oracle,
		ratePerSecond: position.ratePerSecond.toString(),
		apy: position.apy,
		borrowShares: position.borrowShares.toString(),
		debtAmount: position.debtAmount.toString(),
		collateralAmount: position.collateralAmount.toString(),
		debtUsd: position.debtUsd,
		collateralUsd: position.collateralUsd,
		healthFactor: position.healthFactor,
	};
}

function mapToken(token: HandlerTokenInfoDto): MarketTokenInfoDto {
	return {
		address: token.address,
		symbol: token.symbol,
		name: token.name,
		decimals: token.decimals,
		logoUrl: token.logoUrl,
		priceUsd: token.priceUsd,
	};
}
