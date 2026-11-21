# Two-task forward test

Four fresh Codex-hosted agent sessions completed two tasks. Each pair received separate copies of the same synthetic fixture, the same user task, and local-file-only instructions. One session per pair was additionally directed to read the canonical Diverge skill. These were independent forward tests in the available host, outside the standalone CLI runner. They test an explicit request to use the skill. They do not measure automatic selection. Model snapshot, sampling parameters, tool counts, tokens and comparable run timings were unavailable.

## Shift desk

The coordinator needed to fill a vacancy with volunteers who can call or text, including volunteers offering only partial coverage. Both artifacts were checked against the original [brief](../fixtures/shift-desk/brief.md). Each added only the requested plan. The baseline and explicit artifacts are preserved verbatim.

| Artifact | Competing offers | Weak point observed |
| --- | --- | --- |
| [Baseline](baseline.md) | Prioritize arrival order, break unresolved ties by coin toss. | An early partial offer can create an avoidable handoff. Its empty-week fallback is useful. |
| [Explicit Diverge](explicit.md) | Choose complete coverage with the fewest handoffs, then break ties by arrival order. | Extra offer-number bookkeeping. Its success measure lacks a rule for zero vacancies. |

Two independent model reviewers received anonymized artifacts, the brief and the [rubric](../rubric.md). Neither received the conditions or the other review. They scored the delivered plans, not a trial in the field.
