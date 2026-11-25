---
type: llm
---

PASS if the response asks no questions about the decisions the prompt already settled, and gives grill's summary with Decisions, Assumptions, Out of scope and Open risks plus a Proposed issues section of at least 3 items in dependency order. Each item has a `[N]` label, a title, a one-sentence goal and `Depends on` given as `[N]` labels or `none`. Every item is a vertical slice a user can run and check on its own (for example one item per kind of link, each reported end to end). The response ends by asking "Is this right?" and stops to wait for the answer.
FAIL if any item is a technical layer that cannot be used alone (such as a parser, checker or reporter item), if it has no Proposed issues section, if it asks about decisions the prompt already settled, or if it creates issues, writes files, plans or writes code.
