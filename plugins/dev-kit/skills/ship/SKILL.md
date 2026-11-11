---
name: ship
description: Draft the commit message or the pull request description for the current work, printed for the user to run or paste. Modes are commit and pr. Use when the work is reviewed and ready to commit, or the branch is ready for a PR.
argument-hint: "<commit|pr> [issue number, hint or target branch]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
disable-model-invocation: true
---

Mode and arguments: $ARGUMENTS

The first word is the mode: `commit` or `pr`. Everything after it is the mode's arguments, called `$ARGUMENTS` in the mode file. If the first word is not a mode, ask which one.

Print only; never run `git add`, `git commit`, `git push` or `gh pr create`.

First run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. It prints the config as JSON, so you never guess the base branch, issues folder or checks. A step, not a `!` injection: an injected command that cannot run stops the whole skill from loading, and plugin evals on Windows refuse every shell. If it cannot run, say so, and name every config value you then use and where you took it from, so the user can correct it.

Then read `references/<mode>.md` in this skill's folder and follow it. The issue number comes from `${CLAUDE_PLUGIN_ROOT}/skills/issue/references/issue-number.md`.
