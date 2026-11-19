---
type: llm
---

The answer counts wherever it appears in the final reply. Nothing needs to be written to a file.

PASS if the reply drafts one commit message and all of these hold:
- the first line has the form `<type>(#12): <summary>` with `type` one of feat, fix, refactor, docs, chore or test, and the issue number is 12;
- the first line is at most 72 characters and the summary is in the imperative mood (for example "use escapeCell in toCsv", not "used" or "uses");
- there is a body, and it explains why the change was made (commas in names broke the export) instead of restating the diff line by line;
- the reply prints the exact `git add` and `git commit` commands for the user to run, in code blocks;
- the reply does not claim it ran a review, a test or any check itself: a check result appears only if it comes from what the user said (the test passes, the review had no findings).

FAIL if the number is missing or not 12, the first line is over 72 characters or in the past tense, the body only repeats the diff, the git commands are missing, or the reply says it committed, staged or pushed anything.
