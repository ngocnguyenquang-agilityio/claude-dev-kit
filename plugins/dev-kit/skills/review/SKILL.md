---
name: review
description: Review all pending changes before reporting work done. Use after finishing any file changes and before handing over commit commands.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
---

# Review

Review everything pending, committed or not. Run it once at the end of a unit of work, not after every edit. It always runs when the work changed any file, docs and config included, so the issue spec is still checked.

## Hand over to the reviewer

- **Config**: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`
  It gives `baseBranch`, the `checks` commands, `issuesDir` and the branch's issue number.
- **Issue**: the number comes from the caller (for example `issue finish`), else `branch.issue` in the config. Pass the issue file path `<issuesDir>/<NN>-*.md` too when `issuesDir` is set. If `branch.issues` lists more than one number and no caller gave one, name the conflict in the report. Do not block on asking.

Spawn the `reviewer` agent (`subagent_type: "dev-kit:reviewer"`) with the base branch, the issue number and the issue file path in its prompt. It owns the diff handling, the six axes and the levels. Do not repeat its review here. It reports Block, Should fix and Nit items, plus a spec table.

## After the review

Fix Block and Should fix items, then re-run every command under `checks` from the config. This skill owns that re-run: callers such as `issue finish` and `/dev-kit:ship commit` don't repeat it. A check the config lists as `null` doesn't exist in this project: say "not verified" for it rather than skipping silently. Report:

1. One-line verdict: clean, or has Block items.
2. Findings by level, each with `file:line`, the problem, the fix, and whether it is "fixed" or "needs your decision".

No praise filler, no restating the diff. This skill never runs `git commit` or `git push`.
