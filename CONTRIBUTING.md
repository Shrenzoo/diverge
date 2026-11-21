# Contributing to Diverge

Start with a realistic request and the decision you want to improve. State the hard requirement, what should happen, and what would count as unnecessary exploration. A small counterexample is particularly valuable.

- **Technique or domain change.** Edit the guide that owns the decision. Include a concrete mechanism, a situation where it helps, and one where it adds cost. Keep the entry point short.
- **Integration.** Check the host's official documentation. Reuse the same skill. Add disposable install, reinstall, conflict and removal checks for every destination. Capture discovery and invocation evidence separately.
- **Evaluation case.** Add a redistributable starter under `evals/fixtures/` or reuse one. Add a case with a realistic prompt, required outputs, expected budget, selection expectation, and a reviewer question. Make machine checks match explicit contracts. Add a counterexample to a brittle check.
- **Failure report.** Describe the task, host, configuration, unwanted behavior, and smallest reproducible input. Identify synthetic examples and redact local paths and secrets. Use the security channel for vulnerabilities.

