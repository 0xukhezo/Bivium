import { LoggerWrapper } from "@bivium/common/logger";
import environment from "../env/watcher-environment.js";

export const logger = new LoggerWrapper("watcher", environment.isLocal());
logger.configureLogger({
	level: environment.isLocal() ? "debug" : "info",
	prettyPrint: environment.isLocal(),
});
