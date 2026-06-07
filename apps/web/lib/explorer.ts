import type { ToastAction } from "./toast";

const ARBISCAN_TX = "https://arbiscan.io/tx";

/**
 * Build a toast action that opens the tx on Arbiscan in a new tab. Returns
 * `undefined` when the hash is missing so consumers can spread it
 * conditionally without an `if` ladder:
 *
 *   toast.success("…", {
 *     description: "…",
 *     action: txAction(hash),
 *   });
 */
export function txAction(
  hash: `0x${string}` | null | undefined,
): ToastAction | undefined {
  if (!hash) return undefined;
  return {
    label: "View on Arbiscan",
    onClick: () => window.open(`${ARBISCAN_TX}/${hash}`, "_blank", "noopener"),
  };
}

/** URL for a given tx hash. Use when you want to render the link inline. */
export function arbiscanTxUrl(hash: `0x${string}`): string {
  return `${ARBISCAN_TX}/${hash}`;
}
