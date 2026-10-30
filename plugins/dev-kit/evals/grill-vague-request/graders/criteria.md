---
type: llm
---

PASS if the response asks a round of numbered questions (Q1, Q2, ...) about decisions that are open at this point (for example how users sign in, where accounts are stored), gives lettered options for each with a recommended option first and marked "(Recommended)", and stops to wait for answers without writing code or a plan.
FAIL if it starts implementing or planning, asks open-ended questions without options, or asks questions that depend on answers it does not have yet.
