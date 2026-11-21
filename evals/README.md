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

Each arm receives identical fixture bytes and its own workspace, home, and temporary directory. Baseline has no installed Diverge. Implicit has a project copy and the identical prompt. Explicit has that copy and a host-specific invocation prefix. Thus the explicit arm deliberately changes one prompt detail. Model, per-host command options, tools, permissions, and time limit stay fixed across each block. No session resumes another. Repeat with a pinned model, CLI version, and unchanged checkout to reduce drift. The recorded order enables auditing; model sampling and server versions can vary.

Codex runs `exec --json` with workspace-write sandboxing, approval requests disabled (sandbox failures are returned), ephemeral sessions, and no user config. Claude runs in print mode with JSON event streaming, isolated project settings, strict MCP configuration, and only local read, skill, edit and write tools. Claude's restricted mode on the tested build hid project skills, so this adapter selects tools explicitly. Adapters check required flags and skip unsupported binaries. Windows needs directly executable native CLIs on PATH. Unavailable credentials and binaries yield skipped rows with reasons.

## Evidence and scoring

Every invocation creates a unique subdirectory under `eval-results/` (override with `--out`). `results.json` records assignments, model, CLI, budgets, execution status, measured metrics, declared checks and unexpected filesystem changes. `summary.md` shows per-task results, counts, means, sample standard deviations and paired cost flags. Failed or timed-out sessions retain available evidence. `raw/` holds local stdout/stderr and unexpected ordinary deliverables. `blind/` contains randomly labeled task briefs, starting fixtures, and submitted artifacts. Only the reviewer bundle and rubric go to the reviewer.

A successful exit alone cannot pass. Required files must change, unexpected changes fail, declared contracts must pass, and agent failures or observed permission denials are recorded. Some cases perform byte-for-byte checks or walk public state transitions. Static JSON parsing checks syntax where applicable. HTML and written proposals require human inspection. The harness never runs model-generated application code. An artifact pass does not certify all business requirements, usability, runtime behavior, or absence of off-workspace actions.

A host tool call or a successful command reading the skill can supply invocation evidence. Discovery alone is weaker. Direct injection of a skill into model context may leave no separate event. An unobserved read is inconclusive. Negative implicit cases with observed activation and contaminated baselines are flagged. Explicit negative cases are expected to use minimal exploration. Quality and scope compliance are assessed from their outputs.
