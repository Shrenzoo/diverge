# Project preferences

Read only `diverge.config.json` in the active project root. Omission uses defaults. Parse the whole file as JSON and validate against the bundled [schema](config.schema.json). Reject unknown keys, invalid types and out-of-range values. On any error, tell the user what failed and use **all** defaults for that task. No configuration is required.

If Node 20+ is available, run `node "<installed skill>/scripts/config.mjs" "<project>/diverge.config.json"`, substituting actual paths. It prints effective JSON to stdout; malformed or unreadable input also produces a diagnostic on stderr and exit 1. Without Node, apply the schema directly.

| Preference | Effect |
| --- | --- |
| mode, creativity, interaction | Select the reasoning lens, breadth, and decision owner independently. |
| maxCandidates | Ceiling across all explored directions, including the conventional one. SKIP uses zero. |
| maxRefinementPasses | Limit on creative rework after the initial implementation. Zero still requires verification. |
| respectExistingDesignSystem | True reuses project patterns. False allows proposals that depart from them within explicit constraints. |
| allowMajorRedesignWithoutApproval | True permits a materially different **design** where the user already delegated that decision. It cannot authorize core workflow replacement, cost, deployment, or data changes. Collaborative interaction still requires agreement on material choices. |
