import { arbitrum } from "wagmi/chains";
import { getTokenByAddress, type Token } from "@/lib/tokens";
import { API_BASE } from "./client";

export interface DepthStep {
  lender: `0x${string}`;
  /** Annualised rate, 0–1 fraction. Display only. */
  apy: number;
  /** 1e18 fixed-point ratePerSecond. Use for contract calls. */
  ratePerSecondRaw: bigint;
  /** Lender size in loan-token base units. */
  sizeAmount: bigint;
  sizeUsd: number | null;
  cumulativeAmount: bigint;
  cumulativeUsd: number | null;
  cumulativeAvgApy: number | null;
}

export interface MarketDepth {
  collateral: Token;
  loan: Token;
  /** 1e18 fixed-point loan-to-value cap. */
  lltv: bigint;
  /** Total fillable depth in loan-token base units. */
  totalAvailable: bigint;
  totalAvailableUsd: number | null;
  steps: DepthStep[];
}

interface ApiDepthResponse {
  message: string;
  data: ApiDepthData;
}

interface ApiDepthData {
  chainId: number;
  collateral: ApiToken;
  loan: ApiToken;
  lltv: string;
  totalAvailable: string;
  totalAvailableUsd: number | null;
  steps: ApiDepthStep[];
}

interface ApiDepthStep {
  lender: string;
  ratePerSecond: string;
  apy: number;
  size: string;
  sizeUsd: number | null;
  cumulativeSize: string;
  cumulativeSizeUsd: number | null;
  cumulativeAvgApy: number | null;
}

interface ApiToken {
  address: string;
  symbol: string;
  name: string | null;
  decimals: number;
  logoUrl: string | null;
  priceUsd: number | null;
}

export async function fetchMarketDepth(
  collateral: string,
  loan: string,
  opts?: { signal?: AbortSignal },
): Promise<MarketDepth> {
  const url = `${API_BASE}/markets/${collateral.toLowerCase()}/${loan.toLowerCase()}/depth`;
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Market depth fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  const body = (await res.json()) as ApiDepthResponse;
  if (!body?.data) {
    throw new Error("Market depth response missing data");
  }
  return adapt(body.data);
}

function adapt(d: ApiDepthData): MarketDepth {
  const loanToken = adaptToken(d.loan);
  const collateralToken = adaptToken(d.collateral);

  return {
    collateral: collateralToken,
    loan: loanToken,
    lltv: BigInt(d.lltv),
    totalAvailable: BigInt(d.totalAvailable),
    totalAvailableUsd: d.totalAvailableUsd,
    steps: d.steps.map((s) => ({
      lender: s.lender as `0x${string}`,
      apy: s.apy,
      ratePerSecondRaw: BigInt(s.ratePerSecond),
      sizeAmount: BigInt(s.size),
      sizeUsd: s.sizeUsd,
      cumulativeAmount: BigInt(s.cumulativeSize),
      cumulativeUsd: s.cumulativeSizeUsd,
      cumulativeAvgApy: s.cumulativeAvgApy,
    })),
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
