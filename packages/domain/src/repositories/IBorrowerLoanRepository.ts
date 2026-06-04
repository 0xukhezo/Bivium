import type { BorrowerLoanPosition } from "../entities/BorrowerLoanPosition.js";

export interface IBorrowerLoanRepository {
	/**
	 * One row per open `(marketId, borrower)` indexer position for this borrower
	 * joined with its market record. "Open" means `borrow_shares > 0` — a row
	 * with `borrow_shares = 0` and `collateral > 0` is residual (escrowed
	 * collateral waiting for a `withdrawCollateral`) and is NOT a loan.
	 *
	 * Returns the empty list when the borrower has no open loans. The borrower
	 * is matched case-insensitively (addresses are stored lowercased in the
	 * indexer).
	 */
	listOpenByBorrower(input: {
		borrower: string;
		chainId: number;
	}): Promise<BorrowerLoanPosition[]>;
}
