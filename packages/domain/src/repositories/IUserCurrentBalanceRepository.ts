import type {
	UserCurrentBalance,
	UserCurrentBalanceProps,
} from "../entities/UserCurrentBalance.js";

export interface IUserCurrentBalanceRepository {
	upsert(balance: UserCurrentBalanceProps): Promise<UserCurrentBalance>;
	findByUserAndAsset(
		userId: string,
		assetId: string,
	): Promise<UserCurrentBalance | null>;
}
