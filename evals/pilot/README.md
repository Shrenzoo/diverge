# Two-task forward test

Four fresh Codex-hosted agent sessions completed two tasks. Each pair received separate copies of the same synthetic fixture, the same user task, and local-file-only instructions. One session per pair was additionally directed to read the canonical Diverge skill. These were independent forward tests in the available host, outside the standalone CLI runner. They test an explicit request to use the skill. They do not measure automatic selection. Model snapshot, sampling parameters, tool counts, tokens and comparable run timings were unavailable.

## Shift desk

The coordinator needed to fill a vacancy with volunteers who can call or text, including volunteers offering only partial coverage. Both artifacts were checked against the original [brief](../fixtures/shift-desk/brief.md). Each added only the requested plan. The baseline and explicit artifacts are preserved verbatim.

| Artifact | Competing offers | Weak point observed |
| --- | --- | --- |
| [Baseline](baseline.md) | Prioritize arrival order, break unresolved ties by coin toss. | An early partial offer can create an avoidable handoff. Its empty-week fallback is useful. |
| [Explicit Diverge](explicit.md) | Choose complete coverage with the fewest handoffs, then break ties by arrival order. | Extra offer-number bookkeeping. Its success measure lacks a rule for zero vacancies. |

Two independent model reviewers received anonymized artifacts, the brief and the [rubric](../rubric.md). Neither received the conditions or the other review. They scored the delivered plans, not a trial in the field.

| Blinded review | Originality | Usefulness | Alignment | Feasibility | Execution | Simplicity | Constraints | Artifact safety |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Rowan, baseline | 3 | 4 | 4 | 4 | 4 | 4 | Pass | Pass |
| Cedar, baseline | 3 | 4 | 4 | 4 | 4 | 4 | Pass | Pass |
| Rowan, explicit | 4 | 5 | 5 | 4 | 4 | 4 | Pass | Pass |
| Cedar, explicit | 4 | 5 | 5 | 4 | 4 | 4 | Pass | Pass |

Both reviewers preferred the fewer-handoffs rule. They agreed on every numeric score and both gates. Rowan additionally questioned the baseline denominator and missing confirmation-time field in the explicit plan. Cedar flagged ambiguous ownership after an unfilled shift starts in the baseline. Both found the explicit plan's zero-vacancy denominator unresolved. Within each artifact reviewer score range was zero on all six dimensions. A single task per condition has no estimable between-run variability.

After this review, the product guide gained a trial-specific check for eligible cases, event recording, and an empty observation period. The plans and scores above predate that change. Its effect has not been measured.

## Narrow repair

Both agents received the same [broken workflow](../fixtures/broken/flow.json). The task required correcting only the confirm target. Both changed `don` to `done`, preserved all other values and files, produced valid JSON, and passed the public route test (`continue`, `save`, `confirm`). The two outputs were byte-identical. See the [resulting workflow](fixed-flow.json). This case used the deterministic grader and received no subjective ratings.

