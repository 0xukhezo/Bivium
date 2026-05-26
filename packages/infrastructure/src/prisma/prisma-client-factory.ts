import { PrismaClient } from "../../generated/client/index.js";

let clientSingleton: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
	if (clientSingleton === null) {
		clientSingleton = new PrismaClient({
			log:
				process.env.PRISMA_LOG === "1"
					? ["query", "info", "warn", "error"]
					: ["warn", "error"],
		});
	}
	return clientSingleton;
}

export async function disconnectPrisma(): Promise<void> {
	if (clientSingleton) {
		await clientSingleton.$disconnect();
		clientSingleton = null;
	}
}

export type { PrismaClient } from "../../generated/client/index.js";
export {
	Prisma,
	type Prisma as PrismaNamespace,
} from "../../generated/client/index.js";
