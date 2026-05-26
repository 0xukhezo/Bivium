import { User } from "@bivium/domain";
import type { User as PrismaUser } from "../../generated/client/index.js";

export function mapPrismaUserToDomain(record: PrismaUser): User {
	return new User({
		id: record.id,
		address: record.address,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	});
}
