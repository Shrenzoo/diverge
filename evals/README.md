# Running a comparison

The research question is whether useful originality improves while reliability, compliance, and efficiency remain acceptable. Each case specifies a fixture, task, allowed deliverables, expected exploration budget, activation expectation, machine-checkable contracts, and a separate reviewer question.

## Run

From the repository root:

```sh
node scripts/run-evals.mjs --list
node scripts/run-evals.mjs --agent codex --case shift-desk
node scripts/run-evals.mjs --agent claude --case exact-label
```

The last two commands probe the native executable and write a preflight report. For live trials choose a pinned model identifier supported by your account and provider. Set `CODEX_API_KEY` for Codex or `ANTHROPIC_API_KEY` for Claude in the invoking environment. The runner starts with a fresh home and does not reuse desktop login information. The following commands are templates for authenticated evaluation:

```sh
