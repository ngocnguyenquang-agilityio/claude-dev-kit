---
type: llm
---

This is the writing half of a two-session round trip: the next session can only use the fact if it is in the memory store. The `topic-written` grader checks the `Write` to the topic file; this one checks the reply.

PASS if the reply says the staging fact (wiped every night and rebuilt from `fixtures/staging.sql`, so new staging data goes into that file) was saved to a topic file under `docs/memory/`, names that file, and says it was listed in the index `docs/memory.md`.
FAIL if the reply does not mention saving the fact to memory, names only `docs/memory.md` as where the fact went, or says the fact was saved somewhere other than `docs/memory/`.
Whether `fixtures/local.sql` was edited does not count either way.
