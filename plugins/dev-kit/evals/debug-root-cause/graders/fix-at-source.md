---
type: llm
---

PASS if the fix is in `isValidDate` and compares the parsed year, month and day with the ones the built `Date` reports (a round-trip check). Edge cases the response mentions as follow-ups, such as years 0-99, do not make it fail.
FAIL if it special-cases February, day 30 or specific dates, or edits the failing test instead of the function.
