export interface JobDefinition {
	/** Stable identifier used for logging and `isRunning` guards. */
	name: string;
	/** Cron expression understood by `node-schedule`. */
	schedule: string;
	/** Idempotent tick — guard re-entrancy inside the implementation. */
	handler: () => Promise<void>;
}
