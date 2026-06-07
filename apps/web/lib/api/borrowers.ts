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

  return {
    id: `${row.pairKey}-${position.marketId}`,
    marketId: position.marketId as `0x${string}`,
    collateralToken,
    loanToken,
    collateral: {
      amount: BigInt(position.collateralAmount),
      usd: position.collateralUsd,
    },
    borrowShares: BigInt(position.borrowShares),
    // The DTO folds principal + accrued into `debtAmount`. We surface it
    // as `principal` and zero `accruedInterest` — UI sums both fields, so
    // totals stay correct and legacy fields keep working.
    principal: {
      amount: BigInt(position.debtAmount),
      usd: position.debtUsd,
    },
    accruedInterest: { amount: 0n, usd: 0 },
    ratePerSecond: BigInt(position.ratePerSecond),
    lltv: BigInt(row.lltv),
    healthFactor: position.healthFactor,
    lender: position.lender,
    oracle: position.oracle as `0x${string}`,
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
