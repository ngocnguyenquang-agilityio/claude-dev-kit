---
type: llm
---

The note counts wherever it appears: in a Write call, or printed in full in the final reply when the write was refused.

PASS if the response produces one handoff note for the path `.claude/wip/feat-csv-escaping.md` (the slash in the branch name replaced by a dash), and all of these hold:
- the title names the branch and `(#12)`;
- the sections Done, Next, Open, Decisions, Tried and State are all there, with no `<...>` placeholder left;
- the note is at most 40 lines;
- Done mentions the committed `escapeCell` and the uncommitted `export.js` change;
- every item under Next names an action to take (for example turning the todo into a comma test); a short reason alongside the action is fine, but an item with no action in it, only state that Done already covers, fails this point;
- State says `checks: not run`.

FAIL if the path is wrong, more than one note is drafted, a section is missing, a placeholder is left, the note is over 40 lines, an item under Next only restates what is done, or State says a check passed or failed when none ran.
