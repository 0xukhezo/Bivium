import type {
	AssetBalance,
	FetchBalancesInput,
	IAlchemyBalanceFetcherPort,
} from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { AssetType, NATIVE_ASSET_ADDRESS } from "@bivium/domain";
import { inject, injectable } from "inversify";
import type { AlchemyClient } from "../clients/AlchemyClient.js";
import { INFRASTRUCTURE_TYPES } from "../types.js";

const ARBITRUM_CHAIN_ID = 42161;

@injectable()
export class AlchemyBalanceFetcher implements IAlchemyBalanceFetcherPort {
	constructor(
		@inject(INFRASTRUCTURE_TYPES.AlchemyClient)
		private readonly alchemy: AlchemyClient,
		@inject(COMMON_TYPES.Logger)
		private readonly logger: ILogger,
	) {}

	async fetchBalances(input: FetchBalancesInput): Promise<AssetBalance[]> {
		if (input.chainId !== ARBITRUM_CHAIN_ID) {
			this.logger.warning(
				"AlchemyBalanceFetcher invoked with non-Arbitrum chainId",
				{ chainId: input.chainId },
			);
			return [];
		}

		const out: AssetBalance[] = [];

		// Native ETH balance
		const nativeBalanceBn = await this.alchemy.sdk.core.getBalance(
			input.address,
		);
		out.push({
			chainId: input.chainId,
			address: NATIVE_ASSET_ADDRESS,
			symbol: "ETH",
			decimals: 18,
			type: AssetType.NATIVE,
			balance: nativeBalanceBn.toString(),
		});

		// ERC20 balances
		const tokenBalances = await this.alchemy.sdk.core.getTokenBalances(
			input.address,
		);

		for (const tb of tokenBalances.tokenBalances) {
			if (!tb.tokenBalance || tb.tokenBalance === "0x") continue;

			let metadata: Awaited<
				ReturnType<typeof this.alchemy.sdk.core.getTokenMetadata>
			>;
			try {
				metadata = await this.alchemy.sdk.core.getTokenMetadata(
					tb.contractAddress,
				);
			} catch (err) {
				this.logger.warning("Failed to fetch token metadata; skipping", {
					contractAddress: tb.contractAddress,
					error: err instanceof Error ? err.message : String(err),
				});
				continue;
			}

			out.push({
				chainId: input.chainId,
				address: tb.contractAddress.toLowerCase(),
				symbol: metadata.symbol ?? "UNKNOWN",
				decimals: metadata.decimals ?? 18,
				type: AssetType.ERC20,
				name: metadata.name ?? null,
				logoUrl: metadata.logo ?? null,
				balance: BigInt(tb.tokenBalance).toString(),
			});
		}

		return out;
	}
}
