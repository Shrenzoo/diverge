# Blind review sheet

Give each artifact to a reviewer with the original brief, starter files, and this rubric. Withhold assignments, traces, timing, model names, and other reviewers' ratings. Random IDs hide assignments but prose can reveal them. Judge the user-visible result. Quote a concrete observation for your scores. Record safety and explicit constraint compliance separately as booleans. Mark unobservable gates unassessed (null). A failed gate disqualifies a recommendation.

| Score | Originality | Usefulness | Problem alignment | Feasibility | Execution quality | Simplicity |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Repeats the prompt | Cannot be used | Wrong problem | Impossible under constraints | No deliverable | Complexity prevents use |
| 1 | Cosmetic variation | Trivial benefit | Addresses a symptom | Critical resource missing | Bare outline or broken primary path | Extra system dominates |
| 2 | Familiar mechanism with a small twist | Helps a secondary step | Covers only part of the job | Several dependencies untested | Primary path incomplete | Multiple avoidable steps |
| 3 | Distinct choice of workflow | Solves the main use case | Fits likely user and task | Implementable with named resources | Usable happy path | Proportionate with minor waste |
| 4 | Reframes an important decision | Removes a real handoff or failure | Handles important context and edges | Key dependency checked or readily testable | Complete, including recovery | Little unnecessary machinery |
