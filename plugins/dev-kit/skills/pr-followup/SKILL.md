---
name: pr-followup
description: Follow up on an open pull request. Modes are ci (diagnose and fix a failing CI check) and comments (triage and address review comments). Use when CI is red or a PR has new review comments.
argument-hint: "<ci|comments> [PR number or run id]"
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
---

Mode and arguments: $ARGUMENTS

The first word is the mode: `ci` or `comments`. Everything after it is the mode's arguments, called `$ARGUMENTS` in the mode file. If the first word is not a mode, infer it from the request (a red check is `ci`, review comments are `comments`) and say which one you chose. When nothing tells you, ask.

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

Read `references/<mode>.md` in this skill's folder and follow it. `checks` comes from the config above.
