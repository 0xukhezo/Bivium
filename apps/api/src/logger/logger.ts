import { LoggerWrapper } from "@bivium/common/logger";
import environment from "../env/api-environment.js";

export const logger = new LoggerWrapper("api", environment.isLocal());
logger.configureLogger({
	level: environment.isLocal() ? "debug" : "info",
	prettyPrint: environment.isLocal(),
});
