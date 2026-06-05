import { arbitrum } from "wagmi/chains";
import type { BorrowerLoan } from "@/lib/borrower";
import { getTokenByAddress, type Token } from "@/lib/tokens";
import { API_BASE } from "./client";

interface ApiBorrowerLoansResponse {
  message: string;
  data: {
    chainId: number;
    borrower: string;
    rows: ApiBorrowerLoanRow[];
  };
}

interface ApiBorrowerLoanRow {
  pairKey: string;
  collateral: ApiToken;
  loan: ApiToken;
  lltv: string;
  totalCollateralAmount: string;
  totalDebtAmount: string;
  totalCollateralUsd: number | null;
  totalDebtUsd: number | null;
  weightedApy: number | null;
  lowestHealthFactor: number | null;
  positions: ApiBorrowerLoanPosition[];
}

interface ApiBorrowerLoanPosition {
  marketId: string;
  lender: string;
  oracle: string;
  ratePerSecond: string;
  apy: number;
  borrowShares: string;
  debtAmount: string;
  collateralAmount: string;
  debtUsd: number | null;
  collateralUsd: number | null;
  healthFactor: number | null;
}

interface ApiToken {
  address: string;
  symbol: string;
  name: string | null;
  decimals: number;
  logoUrl: string | null;
  priceUsd: number | null;
}

export async function fetchBorrowerLoans(
  borrower: string,
  opts?: { signal?: AbortSignal },
): Promise<BorrowerLoan[]> {
  const url = `${API_BASE}/borrowers/${borrower.toLowerCase()}/loans`;
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Borrower loans fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  const body = (await res.json()) as ApiBorrowerLoansResponse;
  if (!body?.data?.rows) {
    throw new Error("Borrower loans response missing data.rows");
  }
  // Flatten: one frontend loan = one indexer position.
  return body.data.rows.flatMap((row) => row.positions.map((p) => adaptPosition(row, p)));
}

function adaptPosition(
  row: ApiBorrowerLoanRow,
  position: ApiBorrowerLoanPosition,
): BorrowerLoan {
  const collateralToken = adaptToken(row.collateral);
  const loanToken = adaptToken(row.loan);

  const lltv = Number(BigInt(row.lltv)) / 1e18;
  const collateralAmount =
    Number(BigInt(position.collateralAmount)) / 10 ** collateralToken.decimals;
  const debtAmount =
    Number(BigInt(position.debtAmount)) / 10 ** loanToken.decimals;
  // borrowShares is raw indexer accounting; Number() may lose precision on
  // huge values but it's only used for ratio math in the optimistic UI repay
  // step, which we'll replace once writes go through the router.
  const borrowSharesNum = Number(BigInt(position.borrowShares));

  return {
    id: `${row.pairKey}-${position.marketId}`,
    marketId: position.marketId as `0x${string}`,
    collateralToken,
    loanToken,
    collateral: {
      amount: collateralAmount,
      usd: position.collateralUsd ?? 0,
    },
    borrowShares: borrowSharesNum,
    // The DTO folds principal + accrued into `debtAmount`. Put it all in
    // `principal` and zero `accruedInterest` — the UI sums both fields, so
    // totals stay correct and the legacy fields keep working.
    principal: {
      amount: debtAmount,
      usd: position.debtUsd ?? 0,
    },
    accruedInterest: { amount: 0, usd: 0 },
    ratePerSecond: position.apy,
    lltv,
    healthFactor: position.healthFactor,
    lender: position.lender,
  };
}

function adaptToken(t: ApiToken): Token {
  const known = getTokenByAddress(t.address);
  return {
    address: t.address as `0x${string}`,
    symbol: t.symbol,
    name: t.name ?? t.symbol,
    decimals: t.decimals,
    chainId: arbitrum.id,
    iconUrl: known?.iconUrl ?? t.logoUrl ?? "",
  };
}
