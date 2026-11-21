# Diverge

*Think beyond the prompt.*

Diverge is a creative reasoning skill for coding agents. It helps an agent find a useful alternative when the implementation is open, choose within the user's constraints, and deliver the requested work. A precise fix still gets a precise fix.

A dashboard brief, for example, often leaves a decision unstated. A student who needs to know the score required on the next assignment may get more value from a forecast inside the dashboard than from another chart. Diverge asks which decision the design improves and what the change costs.

## Install

Requires Node.js 20+ for the installer. Run from this source checkout. No npm install, account, API key, or network connection is needed to install.

| Destination | Command |
| --- | --- |
| Codex, this project | `node scripts/install.mjs --agent codex --scope project` |
| Claude Code, this project | `node scripts/install.mjs --agent claude --scope project` |
| Codex, this user | `node scripts/install.mjs --agent codex --scope user` |
| Claude Code, this user | `node scripts/install.mjs --agent claude --scope user` |
| Both, this project | `node scripts/install.mjs --agent both --scope project` |

To install into a different existing checkout, add `--project-dir "path to project"` with project scope. Append `--dry-run` to inspect the destination. Repeating an identical install is safe. An existing different copy requires `--replace`, which backs up the full previous directory and carries forward extra files. The command prints the backup path.

Open a fresh session in the target project and try one of these prompts:

```text
Codex: $diverge Design a dashboard that helps students choose what to work on next.
Claude Code: /diverge Design a dashboard that helps students choose what to work on next.
```

“Use Diverge in first-principles mode to rethink this event system” also describes the desired behavior. A host may implicitly select the skill for an open brief. Explicit invocation is easier to check. Optional project preference for a maintainer to add to `AGENTS.md` or `CLAUDE.md`:

> Use Diverge for open-ended design, workflow, or architecture choices when several mechanisms could serve the user. Preserve exact instructions and keep narrow fixes narrow.

For removal, use the same agent, scope and optional project directory with `node scripts/uninstall.mjs`. For example, `node scripts/uninstall.mjs --agent both --scope project`. Hash checks protect local edits, and unrelated files remain in place. Both tools accept `--help`.

**Manual install.** Copy the entire `skills/diverge` directory into the chosen skills directory in the table below. Use an absent destination, or back up the existing one first. No symlink is required. To remove a manual install, compare its contents with the source, retain any local files, and remove only your copy. The managed uninstaller needs an installer receipt.

## How it works

1. **Intent.** Identify the audience, job, evidence, explicit constraints, and delegated decisions.
2. **Opportunity.** Budget zero exploration for exact tasks. Use light, standard, or deep exploration where the expected benefit justifies it.
3. **Exploration.** Compare mechanisms. Inversion, analogies, and removing steps can change what a user can do. Cosmetic variation alone is insufficient.
4. **Evaluation.** Gate on hard requirements, then compare user benefit, feasibility, accessibility, maintenance effort, simplicity and risk.
5. **Execution.** Build or write the selected deliverable. Seek approval for consequential choices outside existing authorization.
6. **Reflection.** Try the defining path and an edge case. Make a bounded improvement when evidence warrants it.

The [entry point](skills/diverge/SKILL.md) is the portable instruction set. Domain guides load when relevant. Node scripts perform the deterministic work of configuration validation, installation, and evaluation. There is no daemon, model service, persistent memory, telemetry, or change to model weights. Offline use requires a host/model that can itself operate offline.

## One observed difference

In a volunteer shift-desk pilot, the baseline plan assigned offers by arrival time. The Diverge plan selected full coverage with the fewest handoffs before breaking ties. Both blinded model reviewers preferred the second rule. The baseline handled a week with zero vacancies more clearly. In a separate exact bug fix, both agents made the same single-value repair and passed the route test. These are two tasks with one repetition each. [Artifacts, scores, and limitations](evals/pilot/README.md)

For illustrative UI, product, architecture, diagnosis, and Wildcard use cases, see [decision examples](examples/decisions.md).

## Modes and configuration

| Mode | Use |
| --- | --- |
| Adaptive | Match exploration to the task. |
| Director | Examine hierarchy, interaction, feedback, and consistency. |
| First Principles | Reconstruct the problem and test which layers or steps it needs. |
| Wildcard | Explore a larger reframing and test the functional value of the strongest idea. |

Place an optional `diverge.config.json` in the project root. These are the defaults:

```json
{
  "mode": "adaptive",
  "creativity": "balanced",
  "interaction": "autonomous",
  "maxCandidates": 3,
  "maxRefinementPasses": 1,
  "respectExistingDesignSystem": true,
  "allowMajorRedesignWithoutApproval": false,
  "showCreativeRationale": "brief",
  "excludedPaths": ["vendor", "node_modules", "dist"]
}
```

Creativity accepts `low`, `balanced`, `high`, or `experimental`. Interaction accepts `autonomous` or `collaborative`. Candidate caps range from 1–5 and refinement caps from 0–2. Rationale accepts `none`, `brief`, or `detailed`. Use lowercase mode names, including `first-principles`. A malformed configuration produces a diagnostic and falls back to all defaults. From the checkout, run `node skills/diverge/scripts/config.mjs diverge.config.json` to print the effective settings. The [schema](skills/diverge/references/config.schema.json) and [configuration guide](skills/diverge/references/configuration.md) cover every field.

Host policy and permissions come first, then explicit current instructions, applicable repository instructions, project preferences, and defaults, subject to the host's instruction hierarchy. Creative freedom grants no new execution permissions.

## Compatibility and current evidence

| Host | Skills directory under project or home | Local verification |
| --- | --- | --- |
| Codex CLI 0.170.0 | `.agents/skills/diverge/` | Installation and removal at both scopes. App-server `skills/list` returned the enabled project skill. |
| Claude Code 2.1.330 | `.claude/skills/diverge/` | Installation and removal at both scopes. Normal print-mode initialization listed the project skill and its slash command. |
| Cursor, Gemini CLI, GitHub Copilot | Future adapters | Unverified. |

Native CLI discovery was checked on macOS. Authenticated CLI execution and implicit selection rates remain unverified. The independent host pilot used explicit access to the skill. Linux and Windows are included in CI; their CI results were not available at local release preparation. Other hosts that read the open format may differ in discovery, metadata, or permissions.

Codex supports separate `agents/openai.yaml` interface metadata and can discover skills along a repository path. Claude exposes a slash command and applies its own precedence to same-named skills. The shared frontmatter contains only name and description. See the [Agent Skills specification](https://agentskills.io/specification), [Codex skills](https://developers.openai.com/codex/skills), and [Claude Code skills](https://code.claude.com/docs/en/skills).

## Verification and evaluation

```sh
node scripts/validate.mjs
node --test
node scripts/run-evals.mjs --list
```

Local verification passed all 23 tests on macOS with Node 24.22.3 and 26.10.0. The skill also passed the skill-creator metadata validator.

