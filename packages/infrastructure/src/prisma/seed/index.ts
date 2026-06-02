import "reflect-metadata";
import { disconnectPrisma } from "../prisma-client-factory.js";
import { UpdateAssetsService } from "./update.assets.js";

async function seed(): Promise<void> {
	console.log("→ Seeding assets…");
	await new UpdateAssetsService().runSeed();
}

async function main(): Promise<void> {
	let isError = false;
	try {
		await seed();
	} catch (e) {
		isError = true;
		console.error(e);
	} finally {
		await disconnectPrisma();
		process.exit(isError ? 1 : 0);
	}
}

void main();
