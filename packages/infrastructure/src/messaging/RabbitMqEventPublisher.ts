import {
	APPLICATION_TYPES,
	type IRabbitMQPublisherPort,
	type RabbitMQPublisherConfig,
} from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import amqplib, {
	type ChannelModel,
	type ConfirmChannel,
	type Options,
} from "amqplib";
import { inject, injectable } from "inversify";

/**
 * Single-class RabbitMQ publisher with publisher-confirms, per-publish timeout
 * and auto-reconnect with exponential backoff. Modelled after onchain-terminal's
 * `RabbitMqEventPublisher`.
 *
 * Key guarantees:
 * - `createConfirmChannel()` → `publish` only resolves after the broker acks the
 *   message. No silently dropped messages on the producer side.
 * - `publishWithConfirm` wraps the channel callback in a Promise with a configurable
 *   timeout (default 5s) so a slow/hung broker can't block the caller forever.
 * - Connection + channel `close`/`error` events trigger `scheduleReconnect`
 *   with exponential backoff (5s → 60s cap). A single in-flight reconnect at a
 *   time via the `isReconnecting` guard.
 * - `ensureConnection` lazily connects on the first publish, so the constructor
 *   stays side-effect-free.
 *
 * Notes for Bivium:
 * - The `OutboxAwareEventPublisher` is the layer that handles durability +
 *   retries. This class is the raw bus IO.
 * - `IRabbitMQPublisherPort.publish(exchange, routingKey, payload)` keeps a tiny
 *   surface because all the metadata enrichment / idempotency is owned by the
 *   outbox row, not by the bus message.
 */
@injectable()
export class RabbitMqEventPublisher implements IRabbitMQPublisherPort {
	private connection: ChannelModel | null = null;
	private channel: ConfirmChannel | null = null;
	private initialized = false;
	private isReconnecting = false;
	private connecting: Promise<void> | null = null;
	private readonly assertedExchanges = new Set<string>();

	constructor(
		@inject(APPLICATION_TYPES.RabbitMQPublisherConfig)
		private readonly cfg: RabbitMQPublisherConfig,
		@inject(COMMON_TYPES.Logger)
		private readonly logger: ILogger,
	) {}

	private get defaultExchange(): string {
		return this.cfg.exchangeName ?? "bivium.events";
	}
	private get defaultExchangeType(): "topic" | "direct" | "fanout" | "headers" {
		return this.cfg.exchangeType ?? "topic";
	}
	private get confirmTimeoutMs(): number {
		return this.cfg.confirmTimeoutMs ?? 5000;
	}
	private get reconnectInitialDelayMs(): number {
		return this.cfg.reconnectInitialDelayMs ?? 5000;
	}
	private get reconnectMaxDelayMs(): number {
		return this.cfg.reconnectMaxDelayMs ?? 60000;
	}

	async connect(): Promise<void> {
		if (this.initialized) return;
		if (this.connecting) return this.connecting;

		this.connecting = (async () => {
			try {
				this.connection = await amqplib.connect(this.cfg.url);
				this.channel = await this.connection.createConfirmChannel();

				this.setupHandlers();

				await this.channel.assertExchange(
					this.defaultExchange,
					this.defaultExchangeType,
					{ durable: true },
				);
				this.assertedExchanges.clear();
				this.assertedExchanges.add(this.defaultExchange);

				this.initialized = true;
				this.isReconnecting = false;
				this.logger.info("RabbitMQ publisher connected", {
					exchange: this.defaultExchange,
					type: this.defaultExchangeType,
				});
			} catch (error) {
				this.initialized = false;
				this.isReconnecting = false;
				this.connection = null;
				this.channel = null;
				throw error;
			}
		})();

		try {
			await this.connecting;
		} finally {
			this.connecting = null;
		}
	}

	private setupHandlers(): void {
		if (!this.connection || !this.channel) return;

		this.connection.on("close", (err) => {
			this.logger.warning("RabbitMQ connection closed", {
				error: err instanceof Error ? err.message : undefined,
			});
			this.initialized = false;
			this.channel = null;
			this.connection = null;
			this.scheduleReconnect();
		});

		this.connection.on("error", (err) => {
			this.logger.error("RabbitMQ connection error", { error: err.message });
			this.initialized = false;
		});

		this.channel.on("close", () => {
			this.logger.warning("RabbitMQ channel closed");
			this.initialized = false;
			this.channel = null;
			this.scheduleReconnect();
		});

		this.channel.on("error", (err) => {
			this.logger.error("RabbitMQ channel error", { error: err.message });
			this.initialized = false;
		});
	}

	private scheduleReconnect(delayMs: number = this.reconnectInitialDelayMs): void {
		if (this.isReconnecting) return;
		this.isReconnecting = true;
		this.logger.info("Scheduling RabbitMQ reconnection", { delayMs });

		setTimeout(async () => {
			try {
				await this.connect();
			} catch (error) {
				this.logger.error("RabbitMQ reconnection failed; will retry", {
					error: error instanceof Error ? error.message : String(error),
				});
				this.isReconnecting = false;
				this.scheduleReconnect(
					Math.min(delayMs * 2, this.reconnectMaxDelayMs),
				);
			}
		}, delayMs);
	}

	private async ensureConnection(): Promise<void> {
		if (!this.initialized) await this.connect();
	}

	private async ensureExchange(name: string): Promise<void> {
		if (this.assertedExchanges.has(name) || !this.channel) return;
		await this.channel.assertExchange(name, this.defaultExchangeType, {
			durable: true,
		});
		this.assertedExchanges.add(name);
	}

	async publish(
		exchange: string,
		routingKey: string,
		payload: unknown,
	): Promise<void> {
		await this.ensureConnection();
		await this.ensureExchange(exchange);

		if (!this.channel) {
			throw new Error("RabbitMQ channel is not ready");
		}

		const body = Buffer.from(JSON.stringify(payload));
		const props: Options.Publish = {
			contentType: "application/json",
			persistent: true,
			timestamp: Date.now(),
			messageId:
				typeof globalThis.crypto?.randomUUID === "function"
					? globalThis.crypto.randomUUID()
					: undefined,
			appId: this.cfg.appId,
		};

		await this.publishWithConfirm(this.channel, exchange, routingKey, body, props);

		this.logger.debug("Published to RabbitMQ", { exchange, routingKey });
	}

	private publishWithConfirm(
		ch: ConfirmChannel,
		exchange: string,
		routingKey: string,
		body: Buffer,
		props: Options.Publish,
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error("RabbitMQ publish confirm timeout")),
				this.confirmTimeoutMs,
			);
			try {
				ch.publish(exchange, routingKey, body, props, (err) => {
					clearTimeout(timer);
					if (err) reject(err);
					else resolve();
				});
			} catch (err) {
				clearTimeout(timer);
				reject(err);
			}
		});
	}

	async close(): Promise<void> {
		if (!this.initialized && !this.connection) return;
		try {
			if (this.channel) await this.channel.close();
		} catch {
			// already closed
		}
		try {
			if (this.connection) await this.connection.close();
		} catch {
			// already closed
		}
		this.channel = null;
		this.connection = null;
		this.initialized = false;
		this.assertedExchanges.clear();
		this.logger.info("RabbitMQ publisher closed");
	}
}
