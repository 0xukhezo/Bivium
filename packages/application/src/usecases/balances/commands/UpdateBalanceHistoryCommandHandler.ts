import {
	DOMAIN_TYPES,
	type IAssetRepository,
	type IUserCurrentBalanceRepository,
	type IUserRepository,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import type { IAlchemyBalanceFetcherPort } from "../../../ports/IAlchemyBalanceFetcherPort.js";
import { APPLICATION_TYPES } from "../../../types.js";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	UpdateBalanceHistoryCommandInputDto,
	UpdateBalanceHistoryCommandOutputDto,
} from "../dtos/UpdateBalanceHistoryCommandDto.js";

@injectable()
@injectFromBase()
export class UpdateBalanceHistoryCommandHandler extends BaseUseCase<
	UpdateBalanceHistoryCommandInputDto,
	UpdateBalanceHistoryCommandOutputDto
> {
	constructor(
		@inject(APPLICATION_TYPES.AlchemyBalanceFetcher)
		private readonly balanceFetcher: IAlchemyBalanceFetcherPort,
		@inject(DOMAIN_TYPES.UserRepository)
		private readonly userRepository: IUserRepository,
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
		let skippedUnknownUsers = 0;

		for (const address of input.addresses) {
			const user = await this.userRepository.findByAddress(address);
			if (!user) {
				skippedUnknownUsers++;
				this.logger.debug("Skipping balance refresh for unknown wallet", {
					address,
				});
				continue;
			}

			const balances = await this.balanceFetcher.fetchBalances({
				chainId: input.chainId,
				address,
			});

			for (const b of balances) {
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
					userId: user.id,
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
			skippedUnknownUsers,
		});

		return { processedAddresses, upsertedBalances, skippedUnknownUsers };
	}
}
