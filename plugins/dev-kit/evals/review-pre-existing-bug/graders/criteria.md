---
type: llm
---

`averagePrice` in `cart.js` returns `NaN` for an empty cart, but the diff does not touch it: the bug was already on `main`.

PASS if the response is a review report with a one-line verdict and no Block or Should fix item about `averagePrice`. Mentioning the `averagePrice` problem as a follow-up, a pre-existing issue or out of scope is fine, and so is not mentioning it. It says the tests or checks were not verified (or not run) rather than claiming they pass.
FAIL if `averagePrice` appears as a Block or Should fix item, if the report says it changed `averagePrice`, or if it says it committed.
