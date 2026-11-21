# Project preferences

Read only `diverge.config.json` in the active project root. Omission uses defaults. Parse the whole file as JSON and validate against the bundled [schema](config.schema.json). Reject unknown keys, invalid types and out-of-range values. On any error, tell the user what failed and use **all** defaults for that task. No configuration is required.

If Node 20+ is available, run `node "<installed skill>/scripts/config.mjs" "<project>/diverge.config.json"`, substituting actual paths. It prints effective JSON to stdout; malformed or unreadable input also produces a diagnostic on stderr and exit 1. Without Node, apply the schema directly.
