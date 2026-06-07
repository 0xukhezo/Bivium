import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string | undefined, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function formatTokenAmount(value: number, opts: { decimals?: number; compact?: boolean } = {}): string {
  const { decimals = 2, compact = false } = opts;
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 100_000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsd(value: number): string {
  return `$${formatCompact(value)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export function annualRateToRatePerSecond(annualRate: number): bigint {
  if (annualRate < 0 || !Number.isFinite(annualRate)) return 0n;
  const scaled = Math.round((annualRate * 1e18) / SECONDS_PER_YEAR);
  return BigInt(scaled);
}

export function ratePerSecondToAnnual(rps: bigint): number {
  return (Number(rps) * SECONDS_PER_YEAR) / 1e18;
}

// ── bigint helpers ───────────────────────────────────────────────────────
//
// On-chain amounts arrive as base-unit bigints (e.g. WETH at 18 dp). We
// keep them as bigint end-to-end and only convert to `number` at the
// rendering leaf, where lossy precision is fine. These wrappers centralise
// that conversion so callers never have to think about it.

/**
 * Format a base-units bigint as a human-readable amount. Uses viem's
 * `formatUnits` to get the exact decimal string, then re-formats with
 * locale separators and a clamped decimal count.
 *
 * `decimals` is the token's on-chain decimals. `maxDecimals` clamps the
 * displayed precision (defaults to `min(decimals, 6)`). `compact` enables
 * K/M/B notation above 1000.
 */
export function formatTokenBalance(
  value: bigint,
  decimals: number,
  opts: { maxDecimals?: number; minDecimals?: number; compact?: boolean } = {},
): string {
  const max = opts.maxDecimals ?? Math.min(decimals, 6);
  const min = opts.minDecimals ?? Math.min(2, max);
  const compact = opts.compact ?? false;
  const asFloat = Number(formatUnits(value, decimals));
  if (compact && Math.abs(asFloat) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(asFloat);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(asFloat);
}

/**
 * Convert a base-units bigint to a JS `number`. Lossy for 18-dp tokens
 * past ~0.009 — only use for display, never for math you'd re-encode to
 * a contract call.
 */
export function baseUnitsToNumber(value: bigint, decimals: number): number {
  return Number(formatUnits(value, decimals));
}

/**
 * Compute the USD value of a base-units bigint amount given a `priceUsd`.
 * Returns `null` when no price is available.
 */
export function tokenUsdValue(
  value: bigint,
  decimals: number,
  priceUsd: number | null,
): number | null {
  if (priceUsd == null) return null;
  return baseUnitsToNumber(value, decimals) * priceUsd;
}

/**
 * Convert a 1e18 fixed-point bigint (lltv, etc) to a 0–1 JS fraction.
 * Lossy past ~15 significant digits — fine for display, not for re-encode.
 */
export function fixedPointToFraction(value: bigint): number {
  return Number(formatUnits(value, 18));
}
