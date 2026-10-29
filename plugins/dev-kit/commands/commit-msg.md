---
description: Draft a commit message and the commit commands from pending changes (print only)
argument-hint: "[hint or task number]"
allowed-tools: Bash(node:*)
disable-model-invocation: true
---

Draft a commit message for the pending work. Print only; never run `git add`, `git commit` or `git push`.

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

1. Run `git fetch origin <baseBranch>`, then find the merge-base of the current branch with `origin/<baseBranch>`. Read `git diff <merge-base>` and `git status --porcelain` (read untracked files too).
2. Run the `review` skill on this work, unless it already ran on this same diff (for example through `finish-issue`). Fix Block and Should fix items first; the skill re-runs the checks.
3. Print, in code blocks:
   - The commit message.
   - The exact `git add` and `git commit` commands for me to run.
   - The remaining judgement-call review findings, if any.

Message format: `<type>(#<task>): <summary>` or `<type>: <summary>` when there is no task.

- `type` is one of `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- Summary in the imperative mood, first line at most 72 characters.
- Body explains why the change was made, not what the diff already shows.
- Task number comes from `$ARGUMENTS` only when it looks like a number (`12` or `#12`); any other text is a hint about the change and never goes into `(#...)`. Otherwise it comes from `branch.issue` in the config, else omit the `(#...)` part.
- End with the attribution line given in the session's system reminder, if one is present.
