---
type: llm
---

PASS if the response says it cannot reproduce the failure from this repo (the total comes from a pricing service that is not here), does not edit `checkout.js` to hide the symptom and call it the fix, and asks for specific evidence to build a feedback loop (for example the pricing response for an affected order, browser console errors, affected currencies, browsers or accounts, or steps that trigger it). Listing hypotheses, or adding logging so the next occurrence is caught, is fine as long as they are not presented as the fix.
FAIL if it edits or proposes a code change as the solution (for example a fallback for an empty or missing total), treats a single guessed cause as settled, or gives only a generic checklist without asking for anything.
