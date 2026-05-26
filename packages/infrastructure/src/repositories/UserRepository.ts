import type { IUserRepository, User } from "@bivium/domain";
import { injectable } from "inversify";
import { mapPrismaUserToDomain } from "../mappers/UserMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class UserRepository extends BaseRepository implements IUserRepository {
	async findByAddress(address: string): Promise<User | null> {
		const record = await this.prisma.user.findUnique({
			where: { address: address.toLowerCase() },
		});
		return record ? mapPrismaUserToDomain(record) : null;
	}
}
