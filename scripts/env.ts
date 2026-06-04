/**
 * Tiny dotenv-style loader. Imported for its side effect at the top of
 * scripts that read env vars, so a sibling `.env` is honoured without
 * pulling `dotenv` as a dependency.
 *
 * Rules:
 *   - looks for `.env` in `process.cwd()` (pnpm runs the script from
 *     `scripts/`, so `scripts/.env` is the natural location);
 *   - skips blank lines and lines starting with `#`;
 *   - strips a single pair of surrounding double or single quotes;
 *   - does NOT overwrite vars already set in the parent process, so
 *     inline `KEY=value pnpm run …` wins over the file.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string): void {
	if (!existsSync(path)) return;
	const content = readFileSync(path, "utf-8");
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

loadEnvFile(resolve(process.cwd(), ".env"));
