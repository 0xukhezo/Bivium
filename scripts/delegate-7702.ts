/**
 * Mainnet smoke test: delegate a fresh EOA to the BiviumProfile template via
 * EIP-7702 and register it as an active lender (rates set on several loan
 * tokens, accepted collaterals configured).
 *
 * Goal: exercise the indexer end-to-end against Arbitrum One. After the txs
 * land, the watcher → Ponder → `indexer` schema chain should surface:
 *   - 1 row in `lenders`         (Register, paused = false)
 *   - N rows in `lender_rates`   (RateSet per loan token)
 *   - M rows in `lender_collaterals` (AllowedCollateralsSet for the batch)
 *
 * The API can then be hit at /api/v1/lenders/<eoa>/markets to verify the
 * read side stays consistent with what we just emitted.
 *
 * Usage:
 *   PRIVATE_KEY=0x...  (from `pnpm generate-wallet`, MUST be funded with ETH on Arbitrum)
 *   ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/...
 *   pnpm --filter @bivium/scripts delegate-7702
 *
 * Optional env:
 *   PROFILE_TEMPLATE  override default Profile address (from contracts/addresses)
 *   DRY_RUN=1         simulate each call without broadcasting
 */

import "./env.js";
import {
	http,
	type Account,
	type Address,
	type Chain,
	type Hex,
	type PublicClient,
	type Transport,
	type WalletClient,
	createPublicClient,
	createWalletClient,
	encodeFunctionData,
	parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";

type Wallet = WalletClient<Transport, Chain, Account>;
type Public = PublicClient<Transport, Chain>;

const ARBITRUM_CHAIN_ID = 42161;

// Source of truth: apps/contracts/addresses/42161/config.json.
const DEFAULT_PROFILE_TEMPLATE: Address =
	"0x2451Dd8e00afDB39FE01eAC8fda5a3d137c71f88";

// Curated Arbitrum tokens — matches CurateBatchArbitrum.s.sol so the markets
// the lender opens are reachable by real borrowers.
const TOKENS = {
	USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address,
	WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" as Address,
	WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as Address,
	LINK: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4" as Address,
} as const;

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const WAD = 10n ** 18n;

// Lender offer book: one rate per loan token. APY values picked to be
// realistic and well below MAX_RATE_PER_SECOND (~1000% APR).
const LENDER_RATES: Array<{ token: Address; symbol: string; apr: number }> = [
	{ token: TOKENS.USDC, symbol: "USDC", apr: 0.05 }, // 5% on USDC.
	{ token: TOKENS.WETH, symbol: "WETH", apr: 0.03 }, // 3% on WETH.
	{ token: TOKENS.WBTC, symbol: "WBTC", apr: 0.025 }, // 2.5% on WBTC.
];

// Collaterals this lender accepts across all of their markets.
const ALLOWED_COLLATERALS: Array<{ address: Address; symbol: string }> = [
	{ address: TOKENS.WBTC, symbol: "WBTC" },
	{ address: TOKENS.WETH, symbol: "WETH" },
	{ address: TOKENS.LINK, symbol: "LINK" },
	{ address: TOKENS.USDC, symbol: "USDC" },
];

const PROFILE_ABI = parseAbi([
	"function setRate(address loanToken, uint256 ratePerSecond) external",
	"function setAllowedCollaterals(address[] collaterals) external",
	"function getRate(address loanToken) external view returns (uint256)",
	"function getAllowedCollaterals() external view returns (address[])",
	"function paused() external view returns (bool)",
]);

function aprToRatePerSecond(apr: number): bigint {
	// Solidity stores rate_per_second as 1e18 fixed point. SECONDS_PER_YEAR is
	// safely under Number precision, and APR * 1e18 / SECONDS_PER_YEAR fits in
	// uint256 by orders of magnitude — Number math is fine here.
	const ratePerSecondWad = (apr * Number(WAD)) / SECONDS_PER_YEAR;
	return BigInt(Math.floor(ratePerSecondWad));
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value || value.trim() === "") {
		console.error(`Missing required env var: ${name}`);
		process.exit(1);
	}
	return value;
}

function isHex32Bytes(value: string): value is Hex {
	return /^0x[0-9a-fA-F]{64}$/.test(value);
}

async function main(): Promise<void> {
	const dryRun = process.env.DRY_RUN === "1";
	const rpcUrl = requireEnv("ARBITRUM_RPC_URL");
	const privateKey = requireEnv("PRIVATE_KEY");
	if (!isHex32Bytes(privateKey)) {
		console.error("PRIVATE_KEY must be a 0x-prefixed 32-byte hex string");
		process.exit(1);
	}
	const profileTemplate = (process.env.PROFILE_TEMPLATE ??
		DEFAULT_PROFILE_TEMPLATE) as Address;

	const account = privateKeyToAccount(privateKey);
	const transport = http(rpcUrl);
	const publicClient = createPublicClient({ chain: arbitrum, transport });
	const walletClient = createWalletClient({
		account,
		chain: arbitrum,
		transport,
	});

	console.log("─".repeat(60));
	console.log("EOA              :", account.address);
	console.log("Profile template :", profileTemplate);
	console.log("Chain            : Arbitrum One (", ARBITRUM_CHAIN_ID, ")");
	console.log("Dry run          :", dryRun);
	console.log("─".repeat(60));

	const [chainId, balance, nonce, currentCode] = await Promise.all([
		publicClient.getChainId(),
		publicClient.getBalance({ address: account.address }),
		publicClient.getTransactionCount({ address: account.address }),
		publicClient.getCode({ address: account.address }),
	]);
	if (chainId !== ARBITRUM_CHAIN_ID) {
		console.error(
			`RPC reports chainId=${chainId}, expected ${ARBITRUM_CHAIN_ID}. Aborting.`,
		);
		process.exit(1);
	}
	console.log("ETH balance      :", balance, "wei");
	console.log("Nonce            :", nonce);
	console.log(
		"Existing code    :",
		currentCode && currentCode !== "0x"
			? `${currentCode.slice(0, 14)}… (already delegated?)`
			: "0x (clean EOA)",
	);
	if (balance === 0n && !dryRun) {
		console.error("EOA has 0 ETH — fund it on Arbitrum One before running.");
		process.exit(1);
	}
	console.log();

	// ── Sign the EIP-7702 authorization ─────────────────────────────────────
	// `executor: 'self'` because the same EOA that signs the auth also sends
	// the wrapping tx. Viem then derives `nonce = currentNonce + 1` — the tx
	// itself consumes `currentNonce`, then the auth applies under the bumped
	// nonce. If the executor were a different sponsor, we'd pass the current
	// nonce instead.
	console.log("Signing EIP-7702 authorization…");
	const authorization = await walletClient.signAuthorization({
		account,
		contractAddress: profileTemplate,
		executor: "self",
	});
	console.log("  chainId :", authorization.chainId);
	console.log("  nonce   :", authorization.nonce);
	console.log("  address :", authorization.address);
	console.log();

	// ── Step 1: delegate + setAllowedCollaterals in one tx ──────────────────
	const allowedCollateralsCalldata = encodeFunctionData({
		abi: PROFILE_ABI,
		functionName: "setAllowedCollaterals",
		args: [ALLOWED_COLLATERALS.map((c) => c.address)],
	});

	console.log("─ Step 1: setAllowedCollaterals (with 7702 designation)");
	console.log(
		"  collaterals :",
		ALLOWED_COLLATERALS.map((c) => c.symbol).join(", "),
	);
	await sendStep({
		dryRun,
		publicClient,
		walletClient,
		to: account.address,
		data: allowedCollateralsCalldata,
		authorizationList: [authorization],
	});

	// ── Step 2..N: setRate per loan token (delegation already in place) ─────
	for (const offer of LENDER_RATES) {
		const ratePerSecond = aprToRatePerSecond(offer.apr);
		console.log(
			`─ Step: setRate ${offer.symbol} → ${offer.apr * 100}% APR (${ratePerSecond} / sec)`,
		);
		const calldata = encodeFunctionData({
			abi: PROFILE_ABI,
			functionName: "setRate",
			args: [offer.token, ratePerSecond],
		});
		await sendStep({
			dryRun,
			publicClient,
			walletClient,
			to: account.address,
			data: calldata,
		});
	}

	if (dryRun) {
		console.log();
		console.log("Dry run complete. No tx broadcast.");
		return;
	}

	// ── Post-flight read-back ───────────────────────────────────────────────
	console.log();
	console.log("─ Post-flight reads (via Profile views on the EOA)");
	const allowed = (await publicClient.readContract({
		address: account.address,
		abi: PROFILE_ABI,
		functionName: "getAllowedCollaterals",
	})) as Address[];
	console.log("  allowedCollaterals:", allowed);
	for (const offer of LENDER_RATES) {
		const rate = (await publicClient.readContract({
			address: account.address,
			abi: PROFILE_ABI,
			functionName: "getRate",
			args: [offer.token],
		})) as bigint;
		console.log(`  rate ${offer.symbol}: ${rate}`);
	}
	const paused = (await publicClient.readContract({
		address: account.address,
		abi: PROFILE_ABI,
		functionName: "paused",
	})) as boolean;
	console.log("  paused            :", paused);
	console.log();
	console.log("Done. EOA is now an active Bivium lender on Arbitrum One.");
	console.log(`  → GET /api/v1/lenders/${account.address}/markets`);
}

async function sendStep(args: {
	dryRun: boolean;
	publicClient: Public;
	walletClient: Wallet;
	to: Address;
	data: Hex;
	authorizationList?: Parameters<
		Wallet["sendTransaction"]
	>[0]["authorizationList"];
}): Promise<void> {
	const { dryRun, publicClient, walletClient, to, data, authorizationList } =
		args;
	const account = walletClient.account;
	const from = account.address;

	// Estimate manually and pin the result into `sendTransaction`. viem's
	// auto-estimate inside `sendTransaction` re-runs without the same
	// authorization context on every RPC and undershoots the real intrinsic
	// gas for type-4 txs — pinning the value sidesteps the
	// `intrinsic gas too low` reject. 1.5× buffer absorbs any drift between
	// estimate-time and submit-time state.
	let gas: bigint | undefined;
	try {
		const estimated = await publicClient.estimateGas({
			account: from,
			to,
			data,
			authorizationList,
		});
		gas = (estimated * 15n) / 10n;
		console.log("  est. gas :", estimated, "→ pinned", gas);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.log("  est. gas : (skipped —", message.split("\n")[0], ")");
	}
	if (dryRun) {
		console.log("  dry-run  : skipped broadcast");
		console.log();
		return;
	}

	const hash = await walletClient.sendTransaction({
		account,
		to,
		data,
		authorizationList,
		gas,
	});
	console.log("  tx       :", hash);
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	console.log(
		"  status   :",
		receipt.status,
		"(block",
		receipt.blockNumber,
		")",
	);
	console.log("  gas used :", receipt.gasUsed);
	if (receipt.status !== "success") {
		console.error("Tx reverted — aborting further steps.");
		process.exit(1);
	}
	console.log();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
