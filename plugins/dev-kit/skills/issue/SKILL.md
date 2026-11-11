---
name: issue
description: Works a GitHub issue from draft to PR. Modes are new (draft and file an issue), start (branch and plan), finish (checks, review, status docs, commands) and fix (bug flow with a regression test). Use when the user asks to file, start, pick up, finish or hotfix an issue or bug.
argument-hint: "<new|start|finish|fix> [issue number or description]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
---

Mode and arguments: $ARGUMENTS

The first word is the mode: `new`, `start`, `finish` or `fix`. Everything after it is the mode's arguments, called `$ARGUMENTS` in the mode files. If the first word is not a mode, infer it from the request (a bug report is `fix`, "file an issue" is `new`) and say which one you chose. When nothing tells you, ask.

First run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. It prints the config as JSON, so you never guess the base branch, issues folder or checks. A step, not a `!` injection: an injected command that cannot run stops the whole skill from loading, and plugin evals on Windows refuse every shell. `baseBranch`, `issuesDir`, `checks` and `branch` come from that config. If it cannot run, say so, and name every config value you then use and where you took it from, so the user can correct it.

Then read every file listed for the mode, all from this skill's folder unless a path says otherwise, and follow the first one:

| Mode | Files |
|---|---|
| `new` | `references/new.md` |
| `start` | `references/start.md` |
| `finish` | `references/finish.md`, `references/issue-number.md`, `${CLAUDE_PLUGIN_ROOT}/skills/ship/references/commit.md`, `${CLAUDE_PLUGIN_ROOT}/skills/ship/references/pr.md` |
| `fix` | `references/fix.md`, `references/start.md`, the four `finish` files |

When a mode file says "the `start` mode's step N", it means that step of `references/start.md`, which you have already read.

Terms used in every mode file:

- **Issue file**: `<issuesDir>/<NN>-<slug>.md`, the issue's spec with its task checkboxes. `NN` is the number zero-padded to two digits; find an existing one by `<issuesDir>/<NN>-*.md`. Only exists when `issuesDir` is set.
- **Index**: `<issuesDir>/README.md`, the table of issues with a status cell per issue.
- **Status docs**: the issue file's ticked tasks plus the issue's status cell in the index.
