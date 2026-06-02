import { LoggerWrapper } from "@bivium/common/logger";
import environment from "../env/jobs-environment.js";

export const logger = new LoggerWrapper("jobs", environment.isLocal());
logger.configureLogger({
	level: environment.isLocal() ? "debug" : "info",
	prettyPrint: environment.isLocal(),
});
