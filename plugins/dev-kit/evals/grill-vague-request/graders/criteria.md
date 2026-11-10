---
type: llm
---

PASS if the response asks one round of at most 4 questions about decisions that are open at this point (for example how users sign in, where accounts are stored), each with options to pick from and a recommended option first, marked "(Recommended)", either as numbered questions (Q1, Q2, ...) with lettered options in the text or through the AskUserQuestion tool, and stops to wait for answers without writing code or a plan.
FAIL if it starts implementing or planning, asks open-ended questions without options, asks more than 4 questions in the round, or asks questions that depend on answers it does not have yet.
