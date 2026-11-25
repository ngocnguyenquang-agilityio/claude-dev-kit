---
type: tool_used
tool: Bash
input_match: 'git (add|commit|push)|gh pr create'
min: 0
max: 0
---

Inert while `Bash` is not in the case's `allowed_tools`, which is how the case runs on Windows: it passes whatever the skill does. It starts to count if someone grants `Bash`. The reply check in `criteria.md` is the evidence that the commands are only printed.

`ship` only prints the commit commands. It must never run `git add`, `git commit`, `git push` or `gh pr create` itself.
