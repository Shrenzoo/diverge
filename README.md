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
