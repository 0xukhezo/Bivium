import { createPublicClient, http, decodeErrorResult } from "viem";
import { arbitrum } from "viem/chains";
import { readFileSync } from "fs";

const BiviumRouterAbi = JSON.parse(
  readFileSync("apps/web/lib/contracts/abis/BiviumRouterAbi.ts", "utf8")
    .replace(/^[\s\S]*?=\s*/, "")
    .replace(/\s+as\s+const;?\s*$/, "")
);

const client = createPublicClient({ chain: arbitrum, transport: http("https://arb1.arbitrum.io/rpc") });

const borrower = "0xf965920173977256Ee4Cd87f265a8745b0Ce3aBC";
const router = "0x9ae169dfaa41dcf95014b88c7d9969f5d8fa58ae";
const usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const wbtc = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const lender = "0x0fd0c596fdfe4d1f02e2385f20f6d3c66243a58f";

try {
  await client.simulateContract({
    account: borrower,
    address: router,
    abi: BiviumRouterAbi,
    functionName: "borrow",
    args: [
      {
        loanToken: usdc,
        collateralToken: wbtc,
        loanAmount: 1_000_000n,
        collateralAmount: 2739n,
        maxAvgRatePerSecond: 0x4c5ba98cn,
        minHealthFactor: 0x14b66cd7a7454000n,
        candidates: [
          { creator: lender, ratePerSecond: 0x4b9a1effn },
        ],
      },
    ],
  });
  console.log("simulation succeeded");
} catch (err) {
  console.log("name:", err.name);
  console.log("shortMessage:", err.shortMessage);
  console.log("metaMessages:", err.metaMessages);
  console.log("details:", err.details);
  console.log("cause:", err.cause?.shortMessage ?? err.cause?.message);
}
