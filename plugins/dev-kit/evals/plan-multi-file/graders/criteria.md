---
type: llm
---

PASS if the response has all of: the goal in one sentence; ordered steps where each names the files or areas it changes and a "Done when" check that can be run (a test, typecheck or a specific manual check) together with the result that means it passed; an Out of scope list (or `none`); the path of a plan file it wrote under `docs/plans/`; and it ends by asking for the user's go-ahead instead of starting the work.
FAIL if any of those is missing, if a step has no check or only a vague one ("works correctly", "TBD", "handle edge cases"), if the steps are not ordered so each leaves the app working, or if it writes the implementation instead of a plan.
