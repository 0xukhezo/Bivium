import { AssetType, type FindOrCreateAssetInput } from "@bivium/domain";
import { AssetRepository } from "../../repositories/AssetRepository.js";

const ARBITRUM_CHAIN_ID = 42161;

const TRUSTWALLET_ARB =
	"https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets";

function logoFor(address: string): string {
	return `${TRUSTWALLET_ARB}/${address}/logo.png`;
}

const ASSETS: FindOrCreateAssetInput[] = [
	{
		chainId: ARBITRUM_CHAIN_ID,
		address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
		type: AssetType.ERC20,
		logoUrl: logoFor("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
	},
	{
		chainId: ARBITRUM_CHAIN_ID,
		address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
		symbol: "WBTC",
		name: "Wrapped BTC",
		decimals: 8,
		type: AssetType.ERC20,
		logoUrl: logoFor("0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"),
	},
	{
		chainId: ARBITRUM_CHAIN_ID,
		address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
		symbol: "WETH",
		name: "Wrapped Ether",
		decimals: 18,
		type: AssetType.ERC20,
		logoUrl: logoFor("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"),
	},
	{
		chainId: ARBITRUM_CHAIN_ID,
		address: "0xf97F4df75117a78c1A5a0DBb814Af92458539FB4",
		symbol: "LINK",
		name: "ChainLink Token",
		decimals: 18,
		type: AssetType.ERC20,
		logoUrl: logoFor("0xf97F4df75117a78c1A5a0DBb814Af92458539FB4"),
	},
];

export class UpdateAssetsService {
	private repo: AssetRepository;

	constructor() {
		this.repo = new AssetRepository();
	}

	async runSeed(): Promise<void> {
		for (const asset of ASSETS) {
			await this.repo.upsert(asset);
			console.log(
				`  • Asset ${asset.symbol} (${asset.address}) seeded on chain ${asset.chainId}`,
			);
		}
		console.log(`✓ Seeded ${ASSETS.length} assets`);
	}
}
