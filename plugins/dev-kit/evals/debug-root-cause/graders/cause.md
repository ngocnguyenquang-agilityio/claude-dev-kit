---
type: llm
---

PASS if the response names the root cause: the `Date` constructor rolls an out-of-range day (February 30) over into the next month instead of failing, so the old `NaN` check never fires.
FAIL if it does not explain why `2024-02-30` was accepted.
