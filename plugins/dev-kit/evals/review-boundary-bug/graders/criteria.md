---
type: llm
---

PASS if the response is a review report that has all of: a one-line verdict; findings sorted under the levels Block, Should fix and Nit; a Block finding that an order of exactly 100 gets no discount because `total.js` uses `> 100` where the request says "100 or more", with the file and line; and it says the tests or checks were not verified (or not run) rather than claiming they pass.
FAIL if any of those is missing, if it reports the change as clean, or if it says it committed.
