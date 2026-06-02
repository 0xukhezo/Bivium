import "reflect-metadata";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as configDotenv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
configDotenv({ path: resolve(__dirname, "../../../.env") });
configDotenv();

const { default: App } = await import("./app.js");

const app = new App();

app.start().catch((err) => {
	console.error("Failed to start jobs", err);
	process.exit(1);
});

process.on("SIGTERM", () => app.shutdown());
process.on("SIGINT", () => app.shutdown());
