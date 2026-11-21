# Project preferences

Read only `diverge.config.json` in the active project root. Omission uses defaults. Parse the whole file as JSON and validate against the bundled [schema](config.schema.json). Reject unknown keys, invalid types and out-of-range values. On any error, tell the user what failed and use **all** defaults for that task. No configuration is required.

