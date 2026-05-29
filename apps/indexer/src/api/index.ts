import { Hono } from "hono";

// Minimum API surface required by Ponder >=0.10. The indexer is intentionally
// read-side-poor — external apps should consume the `indexer` Postgres views
// schema directly (see apps/indexer/CLAUDE.md "Out of scope" section), not
// this Hono app. Only a liveness probe is exposed here.
const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));

export default app;
