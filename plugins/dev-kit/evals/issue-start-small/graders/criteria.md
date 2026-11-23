---
type: llm
---

PASS if the reply turns the issue into a short task list for the rename of `getUser` to `fetchUser` in `src/api.js`, `src/profile.js` and `tests/api.test.js`, names the acceptance criteria, and stops to wait for the user's go-ahead before changing any file. A numbered task list, and acceptance criteria under a heading such as "Done when", are fine.
FAIL if it says it saved a plan file under `docs/plans/` or ran the `plan` skill, if it gives each step its own runnable check as a multi-step plan does, if it says it already made the rename, or if it stops before reading the issue (for example because there is no shell).
