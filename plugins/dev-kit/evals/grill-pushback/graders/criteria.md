---
type: llm
---

PASS if the response points out that the two requirements conflict (data that follows the user across devices has to be stored somewhere off the device, so "nothing stored on the server" cannot hold as stated), explains why, and asks one round of at most 4 questions, either as numbered questions (Q1, Q2, ...) with lettered options in the text or through the AskUserQuestion tool. Every question has options to pick from. The question that settles the conflict offers ways to resolve it (for example a hosted auth or storage service, a minimal server-side store, or giving up cross-device data) and puts a recommended option first, marked "(Recommended)". It stops to wait for answers without writing code or a plan.
FAIL if it accepts both requirements without naming the conflict, silently drops one of them, starts implementing or planning, asks open-ended questions without options, asks more than 4 questions in the round, or offers ways to resolve the conflict without marking a recommended one first with "(Recommended)".
