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

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

Read `references/<mode>.md` in this skill's folder and follow it. The issue number comes from `${CLAUDE_PLUGIN_ROOT}/skills/issue/references/issue-number.md`.
