interface ViemLike {
  name?: string;
  message?: string;
  shortMessage?: string;
  details?: string;
  code?: number;
  cause?: unknown;
}

const PATTERNS: Array<{ test: (e: ViemLike, lower: string) => boolean; message: string }> = [
  {
    test: (e, lower) =>
      e.code === 4001 ||
      lower.includes("user rejected") ||
      lower.includes("user denied") ||
      lower.includes("request was rejected"),
    message: "You rejected the request in your wallet.",
  },
  {
    test: (_, lower) =>
      lower.includes("insufficient funds") ||
      lower.includes("exceeds the balance"),
    message:
      "Your Privy embedded wallet has no ETH on Arbitrum. Send a small amount of ETH to its address (shown in the activation panel) and try again.",
  },
  {
    test: (_, lower) =>
      lower.includes("nonce too low") || lower.includes("nonce has already been used"),
    message:
      "Wallet nonce out of sync. Refresh the page and try again.",
  },
  {
    test: (_, lower) =>
      lower.includes("chain mismatch") ||
      lower.includes("does not match the target chain"),
    message: "Wallet is on the wrong network. Switch to Arbitrum and try again.",
  },
  {
    test: (e, lower) =>
      e.name === "MethodNotSupportedRpcError" ||
      e.code === -32601 ||
      lower.includes("method not found") ||
      lower.includes("method not supported"),
    message: "This wallet doesn't support that action.",
  },
  {
    test: (_, lower) =>
      lower.includes("reverted") || lower.includes("execution reverted"),
    message: "The transaction reverted on-chain.",
  },
  {
    test: (e) => e.name === "TimeoutError",
    message: "Request timed out. Check your connection and try again.",
  },
];

export function humanizeError(err: unknown): string {
  if (!err) return "Something went wrong.";
  const e = (err instanceof Error ? err : { message: String(err) }) as ViemLike;
  const msg = (e.shortMessage ?? e.message ?? "").toString();
  const lower = msg.toLowerCase();

  for (const p of PATTERNS) {
    if (p.test(e, lower)) return p.message;
  }

  if (e.shortMessage) return e.shortMessage;
  return msg
    .split(/\n+/)[0]
    .replace(/\s+Version: viem@.*$/, "")
    .trim() || "Something went wrong.";
}
