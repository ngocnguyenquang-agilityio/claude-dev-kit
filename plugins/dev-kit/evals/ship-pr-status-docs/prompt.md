---
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

/dev-kit:ship pr 14

If a shell is available, run the git and gh steps; if not, skip them. These fixtures have no `origin` remote, so a failed `git fetch origin` is expected and the local branch is already up to date; carry on. Read the issue from `docs/issues/`.
