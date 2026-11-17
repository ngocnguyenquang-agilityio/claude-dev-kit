---
type: llm
---

The note counts wherever it appears: in a Write call, or printed in full in the final reply when the write was refused.

PASS if the response produces a handoff note whose first item under Next is about the quoting rules for names that contain a double quote (the focus the user passed as the argument), ahead of every other Next item, and the note still has the sections Done, Next, Open, Decisions, Tried and State.
FAIL if that focus is missing from Next, is not the first item, or the note has lost a section.
