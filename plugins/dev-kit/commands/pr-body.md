---
description: Draft a pull request description for the current branch (print only)
argument-hint: "[target branch]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
disable-model-invocation: true
---

Draft a pull request description for me to paste into GitHub. Print only; never create the PR or push.

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

1. Target branch is `$ARGUMENTS`, else `origin/<baseBranch>` (after `git fetch origin <baseBranch>`). Find the merge-base with it.
2. Read `git log <merge-base>..HEAD` and `git diff <merge-base>`, and the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view <N>` (number from `branch.issue`).
3. Print the title `[#<N>] <GitHub issue title>`, then the body in one code block with these sections:
   - **Summary**: what changed and why, in a few sentences.
   - **Evidence**: how it was verified (each command under `checks` in the config, manual checks) and anything not verified.
   - **Merge danger**: risks, migrations, breaking changes, or "none".
   - A final line `Closes #<N>`.
4. End with the attribution line given in the session's system reminder, if one is present.
