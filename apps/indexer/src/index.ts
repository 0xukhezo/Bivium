// Entry point: importing each module side-effect-registers its `ponder.on`
// handlers with the global registry. The order doesn't matter — Ponder
// dispatches events to all matching handlers in registration order, but each
// handler's effects are scoped to its own (table, primary-key) writes.

import "./emitter.js";
import "./bivium.js";
import "./router.js";
