import {
	DOMAIN_TYPES,
	type IIndexerLenderReadRepository,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import type { IAlchemyWebhookAddressManagerPort } from "../../../ports/IAlchemyWebhookAddressManagerPort.js";
import { APPLICATION_TYPES } from "../../../types.js";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	SyncLenderWebhookAddressesCommandInputDto,
	SyncLenderWebhookAddressesCommandOutputDto,
} from "../dtos/SyncLenderWebhookAddressesCommandDto.js";

/**
 * Sync the Alchemy Address-Activity webhook with the set of lenders the
 * indexer has seen. Diff-based by design: GET the current webhook address
 * list, list every `indexer.lenders` row, submit the difference. No local
 * cursor — the webhook itself is the source of truth for "what's enrolled".
 *
 * Self-healing properties this gives us:
 *   - If a lender is missing from the webhook (Alchemy outage when they
 *     registered, manual edit, etc.) the next tick re-enrols them.
 *   - If we lose the Postgres `indexer.lenders` row (re-index from scratch),
 *     the next tick re-enrols every lender that re-appears in the indexer.
 *   - Crash mid-run: at worst a partial add, picked back up next tick.
 *
 * `addAddresses` is idempotent per Alchemy contract, so a race between two
 * job instances would over-call but never double-track.
 */
@injectable()
@injectFromBase()
export class SyncLenderWebhookAddressesCommandHandler extends BaseUseCase<
	SyncLenderWebhookAddressesCommandInputDto,
	SyncLenderWebhookAddressesCommandOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.IndexerLenderReadRepository)
		private readonly indexerLenderRepository: IIndexerLenderReadRepository,
		@inject(APPLICATION_TYPES.AlchemyWebhookAddressManager)
		private readonly webhookManager: IAlchemyWebhookAddressManagerPort,
	) {
		super();
	}

	async execute(
		_input: SyncLenderWebhookAddressesCommandInputDto,
	): Promise<SyncLenderWebhookAddressesCommandOutputDto> {
		const [lenders, enrolled] = await Promise.all([
			this.indexerLenderRepository.listAll(),
			this.webhookManager.listAddresses(),
		]);

		const enrolledSet = new Set(enrolled);
		const missing: string[] = [];
		for (const lender of lenders) {
			if (!enrolledSet.has(lender.address)) {
				missing.push(lender.address);
			}
		}

		if (missing.length === 0) {
			this.logger.debug("Lender webhook sync: nothing to add", {
				indexerCount: lenders.length,
				webhookCount: enrolled.length,
			});
			return {
				indexerCount: lenders.length,
				webhookCount: enrolled.length,
				addedCount: 0,
			};
		}

		const addedCount = await this.webhookManager.addAddresses(missing);
		this.logger.info("Lender webhook sync: enrolled new lenders", {
			indexerCount: lenders.length,
			webhookCount: enrolled.length,
			addedCount,
		});
		return {
			indexerCount: lenders.length,
			webhookCount: enrolled.length,
			addedCount,
		};
	}
}
