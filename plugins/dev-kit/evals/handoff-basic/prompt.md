---
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

/dev-kit:handoff

I'm stopping for today. This branch is for issue #12: commas in invoice names break the CSV export. `escapeCell` is committed, `toCsv` uses it but I haven't committed that, and the test is still a todo. I haven't run any checks.
