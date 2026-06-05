import { arbitrum } from "wagmi/chains";
import type { LenderMarket } from "@/lib/lender";
import { getTokenByAddress, type Token } from "@/lib/tokens";
import { API_BASE } from "./client";

interface ApiLenderMarketsResponse {
  message: string;
  data: {
    chainId: number;
    lender: string;
    rows: ApiLenderMarketRow[];
  };
}

interface ApiLenderMarketRow {
  marketId: string;
  collateral: ApiToken;
  loan: ApiToken;
  lltv: string;
  collateralAmount: string;
  onLoanAmount: string;
  collateralUsd: number | null;
  onLoanUsd: number | null;
  apy: number;
  status: "active" | "paused";
}

interface ApiToken {
  address: string;
  symbol: string;
  name: string | null;
  decimals: number;
  logoUrl: string | null;
  priceUsd: number | null;
}

export async function fetchLenderMarkets(
  lender: string,
  opts?: { signal?: AbortSignal },
): Promise<LenderMarket[]> {
  const url = `${API_BASE}/lenders/${lender.toLowerCase()}/markets`;
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Lender markets fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  const body = (await res.json()) as ApiLenderMarketsResponse;
  if (!body?.data?.rows) {
    throw new Error("Lender markets response missing data.rows");
  }
  return body.data.rows.map((row) => adaptRow(row, body.data.lender));
}

function adaptRow(row: ApiLenderMarketRow, creator: string): LenderMarket {
  const collateralToken = adaptToken(row.collateral);
  const loanToken = adaptToken(row.loan);

  const lltv = Number(BigInt(row.lltv)) / 1e18;
  const collateralAmount =
    Number(BigInt(row.collateralAmount)) / 10 ** collateralToken.decimals;
  const onLoanAmount =
    Number(BigInt(row.onLoanAmount)) / 10 ** loanToken.decimals;

  return {
    id: row.marketId as `0x${string}`,
    collateralToken,
    loanToken,
    creator: creator as `0x${string}`,
    lltv,
    ratePerSecond: row.apy,
    totalBorrowAssets: {
      amount: onLoanAmount,
      usd: row.onLoanUsd ?? 0,
    },
    totalCollateral: {
      amount: collateralAmount,
      usd: row.collateralUsd ?? 0,
    },
    apyGenerated: row.apy,
    status: row.status,
  };
}

function adaptToken(t: ApiToken): Token {
  // Local registry iconUrl wins; backend's logoUrl is sometimes broken.
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
