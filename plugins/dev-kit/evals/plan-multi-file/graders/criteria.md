---
type: llm
---

PASS if the response restates the goal in one sentence, then gives ordered steps where each names the files or areas it changes and a "Done when" check that can be run (a test, typecheck or a specific manual check), and ends with risks or open questions.
FAIL if a step has no check or only a vague one ("works correctly"), if the steps are not ordered so each leaves the app working, or if it writes the implementation instead of a plan.
