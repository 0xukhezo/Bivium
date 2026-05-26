import type { ILogger, LoggerConfiguration } from "./definition.js";
import PinoLogger from "./pino.logger.js";

export type { ILogger, LOG_LEVELS, LoggerConfiguration } from "./definition.js";

/**
 * Lazy, configurable logger wrapper. Enriches metadata with the app name
 * and only instantiates the underlying Pino logger on first use.
 */
export class LoggerWrapper implements ILogger {
	#underlyingLogger: ILogger | null = null;
	private readonly app: string;
	private readonly prettyPrint: boolean;

	constructor(app: string, prettyPrint = false) {
		this.app = app;
		this.prettyPrint = prettyPrint;
	}

	#getInitializedLogger(): ILogger {
		if (this.#underlyingLogger === null) {
			this.#underlyingLogger = new PinoLogger("info", this.prettyPrint);
		}
		return this.#underlyingLogger;
	}

	configureLogger(
		configuration: Partial<LoggerConfiguration>,
		overrideIfExists = true,
	): void {
		if (this.#underlyingLogger === null || overrideIfExists) {
			this.#underlyingLogger = new PinoLogger(
				configuration.level || "info",
				configuration.prettyPrint ?? this.prettyPrint,
			);
		}
	}

	resetLogger(): void {
		this.#underlyingLogger = null;
	}

	#enrichMetadata(metadata?: object): object {
		return { app: this.app, ...(metadata || {}) };
	}

	debug(message: string, metadata?: object): void {
		this.#getInitializedLogger().debug(message, this.#enrichMetadata(metadata));
	}

	error(message: string, metadata?: object): void {
		this.#getInitializedLogger().error(message, this.#enrichMetadata(metadata));
	}

	info(message: string, metadata?: object): void {
		this.#getInitializedLogger().info(message, this.#enrichMetadata(metadata));
	}

	warning(message: string, metadata?: object): void {
		this.#getInitializedLogger().warning(
			message,
			this.#enrichMetadata(metadata),
		);
	}
}
