import { UserCurrentBalance } from "@bivium/domain";
import type { UserCurrentBalance as PrismaBalance } from "../../generated/client/index.js";

export function mapPrismaBalanceToDomain(
	record: PrismaBalance,
): UserCurrentBalance {
	return new UserCurrentBalance({
		address: record.address,
		assetId: record.assetId,
		chainId: record.chainId,
		balance: record.balance.toString(),
		lastUpdated: record.lastUpdated,
	});
}
