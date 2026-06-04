import type {
	IIndexerLenderReadRepository,
	IndexerLenderRegistration,
} from "@bivium/domain";
import { IndexerLenderRegistration as IndexerLenderRegistrationEntity } from "@bivium/domain";
import { injectable } from "inversify";
import { Prisma } from "../../generated/client/index.js";
import { BaseRepository } from "./BaseRepository.js";

interface RawIndexerLenderRow {
	address: string;
	first_seen_block: string;
}

/**
 * Lists every `indexer.lenders` row, ordered by `first_seen_block` ASC so
 * the caller's logs read chronologically when scanning the result.
 *
 * `first_seen_block` is cast to text because Postgres `bigint` does not
 * survive Prisma's default JSON decode cleanly (we want native `bigint`,
 * not `Decimal`); this mirrors how the other indexer-backed repos in this
 * package handle it.
 */
@injectable()
export class IndexerLenderReadRepository
	extends BaseRepository
	implements IIndexerLenderReadRepository
{
	private readonly schema: string;

	constructor() {
		super();
		this.schema = process.env.INDEXER_SCHEMA ?? "indexer";
	}

	async listAll(): Promise<IndexerLenderRegistration[]> {
		const lendersTable = Prisma.raw(`"${this.schema}"."lenders"`);

		const rows = await this.prisma.$queryRaw<RawIndexerLenderRow[]>(
			Prisma.sql`
				SELECT
					address                       AS address,
					first_seen_block::text        AS first_seen_block
				FROM ${lendersTable}
				ORDER BY first_seen_block ASC
			`,
		);
		return rows.map(
			(r) =>
				new IndexerLenderRegistrationEntity({
					address: r.address,
					firstSeenBlock: BigInt(r.first_seen_block),
				}),
		);
	}
}
