import { type Logger as PinoLoggerImpl, pino } from "pino";
import type { ILogger, LOG_LEVELS } from "./definition.js";

export default class PinoLogger implements ILogger {
	readonly #logger: PinoLoggerImpl;

	constructor(level: LOG_LEVELS, prettyPrintEnabled: boolean) {
		this.#logger = pino({
			level,
			transport: prettyPrintEnabled
				? {
						target: "pino-pretty",
						options: { colorize: true, sync: true },
					}
				: undefined,
		});
	}

	debug(message: string, metadata?: object): void {
		metadata
			? this.#logger.debug(metadata, message)
			: this.#logger.debug(message);
	}

	error(message: string, metadata?: object): void {
		metadata
			? this.#logger.error(metadata, message)
			: this.#logger.error(message);
	}

	info(message: string, metadata?: object): void {
		metadata
			? this.#logger.info(metadata, message)
			: this.#logger.info(message);
	}

	warning(message: string, metadata?: object): void {
		metadata
			? this.#logger.warn(metadata, message)
			: this.#logger.warn(message);
	}
}
