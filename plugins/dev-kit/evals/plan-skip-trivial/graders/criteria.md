---
type: llm
---

PASS if the response does the rename in `src/api.js`, `src/hooks/useUser.js` and `src/pages/Profile.js`, or states the change in a sentence or two, without a multi-step plan.
FAIL if it produces a plan with numbered steps and "Done when" checks, writes a plan file under `docs/plans/`, or stops to ask for approval of a plan before renaming.
