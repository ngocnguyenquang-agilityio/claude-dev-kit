---
type: llm
---

PASS if the issue draft follows the repo's bug template in `.github/ISSUE_TEMPLATE/bug.md`: it has the template's Summary, Steps to reproduce, Expected, Actual and Environment sections (extra sections are fine), and the response says the issue will be created with the `bug` and `needs-triage` labels.
FAIL if the draft ignores the template's sections or does not mention those labels.
