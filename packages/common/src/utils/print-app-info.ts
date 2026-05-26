export interface AppInfoOptions {
	/** App name without prefix, e.g. "watcher" or "reactor". */
	name: string;
	/** Current runtime environment (local / development / production). */
	env: string;
	/** Extra rows to print, e.g. `{ port: 3001, api: "http://..." }`. */
	details?: Record<string, string | number>;
}

/**
 * Pretty startup banner. Auto-sizes to the longest line so it adapts to any app.
 */
export function printAppInfo({ name, env, details = {} }: AppInfoOptions): void {
	const title = `bivium ${name}`;
	const labels = ["env", ...Object.keys(details)];
	const labelWidth = Math.max(...labels.map((l) => l.length)) + 2; // ": "
	const fmt = (k: string, v: string | number) =>
		`${k}:`.padEnd(labelWidth) + String(v);

	const rows = [
		fmt("env", env),
		...Object.entries(details).map(([k, v]) => fmt(k, v)),
	];
	const innerWidth = Math.max(title.length, ...rows.map((r) => r.length)) + 2;
	const pad = (s: string) => `║  ${s.padEnd(innerWidth)}║`;
	const bar = (left: string, right: string) =>
		`${left}${"═".repeat(innerWidth + 2)}${right}`;

	console.log(bar("╔", "╗"));
	console.log(pad(title));
	console.log(pad("─".repeat(title.length)));
	for (const row of rows) console.log(pad(row));
	console.log(bar("╚", "╝"));
}
