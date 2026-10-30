---
type: llm
---

PASS if the response names the root cause (the `Date` constructor rolls an out-of-range day over into the next month instead of failing), fixes it by checking that the parsed year, month and day survive the round trip, and proposes a regression test for `2024-02-30`.
FAIL if it only patches the symptom (for example a special case for February or day 30), does not explain why the date was accepted, or proposes no test.
