import {
	DOMAIN_TYPES,
	type IAssetRepository,
	type IUserCurrentBalanceRepository,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import type { IAlchemyBalanceFetcherPort } from "../../../ports/IAlchemyBalanceFetcherPort.js";
import { APPLICATION_TYPES } from "../../../types.js";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	UpdateBalanceHistoryCommandInputDto,
	UpdateBalanceHistoryCommandOutputDto,
} from "../dtos/UpdateBalanceHistoryCommandDto.js";

/**
 * Refresh on-chain balances for the given wallet addresses via Alchemy and
 * upsert them into `user_current_balances`.
 *
 * Bivium is non-custodial: there's no separate user record. Any address the
 * watcher → reactor pipeline surfaces (because Alchemy notified an activity
 * for it) is enrolled in the address-activity webhook by the sync job —
 * meaning Bivium genuinely wants to track its balances. So we no longer
 * gate on a `users` row existing; we upsert balances directly keyed by
 * `(address, asset_id)`.
 */
@injectable()
@injectFromBase()
export class UpdateBalanceHistoryCommandHandler extends BaseUseCase<
	UpdateBalanceHistoryCommandInputDto,
	UpdateBalanceHistoryCommandOutputDto
> {
	constructor(
		@inject(APPLICATION_TYPES.AlchemyBalanceFetcher)
		private readonly balanceFetcher: IAlchemyBalanceFetcherPort,
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.UserCurrentBalanceRepository)
		private readonly balanceRepository: IUserCurrentBalanceRepository,
	) {
		super();
	}

	async execute(
		input: UpdateBalanceHistoryCommandInputDto,
	): Promise<UpdateBalanceHistoryCommandOutputDto> {
		let processedAddresses = 0;
		let upsertedBalances = 0;

		for (const rawAddress of input.addresses) {
			const address = rawAddress.toLowerCase();
			const balances = await this.balanceFetcher.fetchBalances({
				chainId: input.chainId,
				address,
			});

			for (const b of balances) {
				// Skip native chain assets (`address === null`). Bivium's orderbook
				// reads only loan-token balances, which are always ERC-20s; tracking
				// native ETH adds rows no consumer queries and trips Prisma's
				// `findUnique` on `(chainId, address)` because nullable parts of a
				// compound unique can't be used as a unique lookup key.
				if (b.address === null) continue;
				const asset = await this.assetRepository.findOrCreate({
					chainId: b.chainId,
					address: b.address,
					symbol: b.symbol,
					decimals: b.decimals,
					type: b.type,
					name: b.name ?? null,
					logoUrl: b.logoUrl ?? null,
				});

				await this.balanceRepository.upsert({
					address,
					assetId: asset.id,
					chainId: b.chainId,
					balance: b.balance,
					lastUpdated: new Date(),
				});

				upsertedBalances++;
			}

			processedAddresses++;
		}

		this.logger.info("Balance refresh batch complete", {
			processedAddresses,
			upsertedBalances,
		});

		return { processedAddresses, upsertedBalances };
	}
}
