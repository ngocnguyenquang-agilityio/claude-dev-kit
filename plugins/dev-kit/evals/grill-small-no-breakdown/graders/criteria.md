---
type: llm
---

PASS if the response is grill's summary of the request, with Decisions, Assumptions, Out of scope and Open risks sections, has no Proposed issues section and no list of issues, and ends by asking "Is this right?".
FAIL if it splits the change into issues or lists proposed issues, asks questions about decisions the prompt already settled (field names, exit code, no new dependency), or writes code.
