import amqplib, { type ChannelModel, type Channel } from "amqplib";
import type { ILogger } from "@bivium/common/logger";
import type { SubscriptionBinding } from "./types.js";

/**
 * Local subscriber. Owns its own RabbitMQ connection + channel lifecycle.
 * Lives in the reactor app (not in @bivium/infrastructure) so the app entry-point
 * doesn't need to depend on infrastructure internals — same pattern as onchain-terminal.
 */
export class Subscriber {
	private connection: ChannelModel | null = null;
	private channel: Channel | null = null;

	constructor(
		private readonly url: string,
		private readonly logger: ILogger,
	) {}

	async connect(): Promise<void> {
		if (this.connection && this.channel) return;
		this.connection = await amqplib.connect(this.url);
		this.connection.on("error", (err) =>
			this.logger.error("RabbitMQ connection error", { error: err.message }),
		);
		this.connection.on("close", () =>
			this.logger.warning("RabbitMQ connection closed"),
		);
		this.channel = await this.connection.createChannel();
		this.logger.info("Connected to RabbitMQ");
	}

	async bind(sub: SubscriptionBinding): Promise<void> {
		if (!this.channel) {
			throw new Error("Subscriber.bind called before connect()");
		}
		await this.channel.assertExchange(sub.exchange, "topic", { durable: true });
		await this.channel.assertQueue(sub.queue, { durable: true });
		for (const key of sub.routingKeys) {
			await this.channel.bindQueue(sub.queue, sub.exchange, key);
		}
		if (sub.prefetch) await this.channel.prefetch(sub.prefetch);

		const ch = this.channel;
		await ch.consume(sub.queue, async (msg) => {
			if (!msg) return;
			try {
				const payload = JSON.parse(msg.content.toString("utf8"));
				await sub.handler(payload, msg);
				ch.ack(msg);
			} catch (err) {
				this.logger.error("Message handler failed", {
					queue: sub.queue,
					error: err instanceof Error ? err.message : String(err),
				});
				ch.nack(msg, false, false);
			}
		});
		this.logger.info("Subscription bound", {
			queue: sub.queue,
			keys: sub.routingKeys,
		});
	}

	async close(): Promise<void> {
		try {
			if (this.channel) await this.channel.close();
		} catch {}
		try {
			if (this.connection) await this.connection.close();
		} catch {}
		this.channel = null;
		this.connection = null;
	}
}
