import type { User } from "../entities/User.js";

export interface IUserRepository {
	findByAddress(address: string): Promise<User | null>;
}
