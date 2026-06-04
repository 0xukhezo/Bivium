import type {
	IUserCurrentBalanceRepository,
	UserCurrentBalance,
	UserCurrentBalanceProps,
} from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import { mapPrismaBalanceToDomain } from "../mappers/UserCurrentBalanceMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class UserCurrentBalanceRepository
	extends BaseRepository
	implements IUserCurrentBalanceRepository
{
	async upsert(input: UserCurrentBalanceProps): Promise<UserCurrentBalance> {
		const balance = new Prisma.Decimal(input.balance);
		const address = input.address.toLowerCase();
		const record = await this.prisma.userCurrentBalance.upsert({
			where: {
				address_assetId: { address, assetId: input.assetId },
			},
			create: {
				address,
				assetId: input.assetId,
				chainId: input.chainId,
				balance,
			},
			update: {
				balance,
				chainId: input.chainId,
			},
		});
		return mapPrismaBalanceToDomain(record);
	}

	async findByAddressAndAsset(
		address: string,
		assetId: string,
	): Promise<UserCurrentBalance | null> {
		const record = await this.prisma.userCurrentBalance.findUnique({
			where: {
				address_assetId: { address: address.toLowerCase(), assetId },
			},
		});
		return record ? mapPrismaBalanceToDomain(record) : null;
	}
}
