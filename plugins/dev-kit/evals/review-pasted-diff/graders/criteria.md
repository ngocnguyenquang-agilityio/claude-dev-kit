---
type: llm
---

PASS if the response is a review report of the pasted diff with all of: a one-line verdict; a Block (or Should fix) finding that `removeExpired` in `src/sessions.js` keeps the expired sessions and drops the live ones, because `expiresAt < now` selects the sessions to remove rather than the ones to keep; and a statement that it reviewed the pasted diff, such as "a review of the diff you pasted"; it does not need to mention the local branch.
FAIL if it reports the diff as clean, if it reviews `total.js` or the current branch instead, if it says there is nothing to review because the branch has no changes, or if it says it edited or committed anything.
