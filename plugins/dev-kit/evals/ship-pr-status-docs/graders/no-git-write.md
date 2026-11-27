---
type: tool_used
tool: Bash
input_match: 'git (add|commit|push)|gh pr create'
min: 0
max: 0
---

Counts only where the run grants `Bash` (Linux CI); without it, which is how the case runs on Windows, it passes whatever the skill does. The reply check in `criteria.md` is the evidence that the commands are only printed.

`ship` only prints the commit commands. It must never run `git add`, `git commit`, `git push` or `gh pr create` itself.
