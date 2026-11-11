---
type: llm
---

PASS if the response treats the request as the bug-fix flow (it says it chose the `fix` mode or the bug flow), offers to file an issue for the bug first, and stops to wait for the user's choice without presenting a code change.
FAIL if it picks another mode without saying so, files an issue without asking, or writes or proposes a code fix before the user answers.
