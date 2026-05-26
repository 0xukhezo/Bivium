import { injectable } from "inversify";
import {
	type PrismaClient,
	getPrismaClient,
} from "../prisma/prisma-client-factory.js";

@injectable()
export abstract class BaseRepository {
	protected readonly prisma: PrismaClient;

	constructor() {
		this.prisma = getPrismaClient();
	}
}
