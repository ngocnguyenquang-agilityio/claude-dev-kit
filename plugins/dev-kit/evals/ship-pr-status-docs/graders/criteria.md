---
type: llm
---

The answer counts wherever it appears in the final reply. Nothing needs to be written to a file.

The branch has the work for issue #14, but its status docs are not updated: the issue file still has an unticked `- [ ]` task and the index row in `docs/issues/README.md` still says `open`, not `closed`.

PASS if the reply stops and all of these hold:
- it prints no PR title and no PR body;
- it names what is missing: the unticked task and/or the index status still `open` instead of `closed`;
- it tells the user to run `/dev-kit:issue finish`.

FAIL if the reply prints a PR title (for example `[#14] ...`) or a PR body with Summary, Evidence or `Closes #14`. This holds even when it also mentions `/dev-kit:issue finish`, or only suggests it while still drafting the PR.
