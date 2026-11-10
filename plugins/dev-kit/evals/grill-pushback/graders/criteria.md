---
type: llm
---

PASS if the response points out that the two requirements conflict (data that follows the user across devices has to be stored somewhere off the device, so "nothing stored on the server" cannot hold as stated), explains why, offers options to resolve it with a recommended option first (for example a hosted auth or storage service, a minimal server-side store, or giving up cross-device data), and stops to wait for the user's choice without writing code.
FAIL if it accepts both requirements without naming the conflict, silently drops one of them, or starts implementing.
