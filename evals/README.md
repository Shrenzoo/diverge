# Running a comparison

The research question is whether useful originality improves while reliability, compliance, and efficiency remain acceptable. Each case specifies a fixture, task, allowed deliverables, expected exploration budget, activation expectation, machine-checkable contracts, and a separate reviewer question.

## Run

From the repository root:

```sh
node scripts/run-evals.mjs --list
node scripts/run-evals.mjs --agent codex --case shift-desk
node scripts/run-evals.mjs --agent claude --case exact-label
```

