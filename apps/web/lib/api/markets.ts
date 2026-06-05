import { arbitrum } from "wagmi/chains";
import type { Market } from "@/lib/markets";
import { getTokenByAddress, type Token } from "@/lib/tokens";
import { ratePerSecondToAnnual } from "@/lib/utils";
import { API_BASE } from "./client";

interface ApiMarketsResponse {
  message: string;
  data: {
    chainId: number;
    rows: ApiMarketRow[];
  };
}

interface ApiMarketRow {
  collateral: ApiToken;
  loan: ApiToken;
  lltv: string;
  totalLiquidity: string;
  totalBorrowed: string;
  bestRatePerSecond: string | null;
}

interface ApiToken {
  address: string;
  symbol: string;
  name: string | null;
  decimals: number;
  logoUrl: string | null;
  priceUsd: number | null;
}

// TODO: drop once the list endpoint surfaces oracle + creator.
const ORACLE_PLACEHOLDER = `0x${"0".repeat(40)}` as const;
const CREATOR_PLACEHOLDER = `0x${"0".repeat(40)}` as const;

export async function fetchMarkets(opts?: {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<Market[]> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 100;
  const url = `${API_BASE}/markets?page=${page}&pageSize=${pageSize}`;

  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Markets fetch failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as ApiMarketsResponse;
  if (!body?.data?.rows) {
    throw new Error("Markets response missing data.rows");
  }
  return body.data.rows.map(adaptMarket);
}

function adaptMarket(row: ApiMarketRow): Market {
  const collateralToken = adaptToken(row.collateral);
  const loanToken = adaptToken(row.loan);

  const lltv = Number(BigInt(row.lltv)) / 1e18;

  const denom = 10 ** loanToken.decimals;
  const supplyAmount = Number(BigInt(row.totalLiquidity)) / denom;
  const borrowAmount = Number(BigInt(row.totalBorrowed)) / denom;
  const loanPrice = row.loan.priceUsd ?? 0;
  const supplyUsd = supplyAmount * loanPrice;
  const borrowUsd = borrowAmount * loanPrice;

  const ratePerSecond = row.bestRatePerSecond
    ? ratePerSecondToAnnual(BigInt(row.bestRatePerSecond))
    : 0;

  return {
    id: synthesizeId(collateralToken, loanToken),
    collateralToken,
    loanToken,
    oracle: ORACLE_PLACEHOLDER,
    creator: CREATOR_PLACEHOLDER,
    ratePerSecond,
    lltv,
    totalSupplyAssets: { amount: supplyAmount, usd: supplyUsd },
    totalBorrowAssets: { amount: borrowAmount, usd: borrowUsd },
    totalSupplyShares: supplyAmount,
    totalBorrowShares: borrowAmount,
    lastAccrualTimestamp: 0,
    loanPriceUsd: row.loan.priceUsd ?? null,
    collateralPriceUsd: row.collateral.priceUsd ?? null,
  };
}

function adaptToken(t: ApiToken): Token {
  // Local registry iconUrl wins: backend's logoUrl 404s for some tokens.
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

function synthesizeId(c: Token, l: Token): `0x${string}` {
  const seed = `${c.symbol}-${l.symbol}`.toLowerCase();
  const hex = Array.from(seed)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40)
    .padEnd(40, "0");
  return `0x${hex}` as `0x${string}`;
}
