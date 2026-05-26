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
		const record = await this.prisma.userCurrentBalance.upsert({
			where: {
				userId_assetId: { userId: input.userId, assetId: input.assetId },
			},
			create: {
				userId: input.userId,
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

	async findByUserAndAsset(
		userId: string,
		assetId: string,
	): Promise<UserCurrentBalance | null> {
		const record = await this.prisma.userCurrentBalance.findUnique({
			where: { userId_assetId: { userId, assetId } },
		});
		return record ? mapPrismaBalanceToDomain(record) : null;
	}
}
