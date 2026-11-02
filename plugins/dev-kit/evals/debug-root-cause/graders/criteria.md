---
type: llm
---

PASS if the response names the root cause (the `Date` constructor rolls an out-of-range day over into the next month instead of failing), fixes `isValidDate` by checking that the parsed year, month and day survive the round trip, and says how to confirm the fix (running the existing tests).
FAIL if it only patches the symptom (for example a special case for February or day 30), does not explain why the date was accepted, or edits the failing test instead of the function.
