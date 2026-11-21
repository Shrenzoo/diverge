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
node scripts/run-evals.mjs --live --agent codex --model MODEL_ID --case shift-desk --case exact-label --repeat 2 --timeout 180
node scripts/run-evals.mjs --live --agent claude --model MODEL_ID --case shift-desk --case exact-label --repeat 2 --timeout 180
```

Use `--condition baseline|implicit|explicit` to run one arm. Default `all` runs three arms per case per repetition, in randomized order within each block. With 22 cases and one repetition, an unfiltered live run attempts 66 provider sessions. A wall-clock limit applies per session. It is not a spending cap. Use a dedicated account budget and a disposable evaluation machine.

## Controls

