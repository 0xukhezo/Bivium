import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
