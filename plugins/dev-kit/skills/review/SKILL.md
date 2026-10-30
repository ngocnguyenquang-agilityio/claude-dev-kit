---
name: review
description: Review all pending changes before reporting work done. Use after finishing code changes and before handing over commit commands.
---

# Review

Review everything pending, committed or not. Run it once at the end of a unit of work, not after every edit. Before a commit handoff it always runs, even on a docs or config diff, so the issue spec is still checked. Skip it only for an ad hoc docs or config edit that is not headed for a commit.

## Gather

- **Config**: run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. It gives `baseBranch`, the `checks` commands, `issuesDir` and the branch's issue number.
- **Fixed point**: `git fetch origin <baseBranch>`, then `git merge-base HEAD origin/<baseBranch>` (the remote ref, because the local one can be stale).
- **Diff**: `git diff <merge-base>` (working tree vs merge-base, so uncommitted work is included).
- **New files**: `git status --porcelain`; read untracked files directly.
- **Spec**: the issue file `<issuesDir>/<NN>-*.md`, else `gh issue view <N>`; the number comes from the caller (for example `finish-issue`), else `branch.issue` in the config. If `branch.issues` lists more than one number and no caller gave one, name the conflict in the report. If there is no issue, skip the Spec axis. Do not block on asking.
- **Standards**: `CLAUDE.md`, `AGENTS.md`, the lint and format config, and any test-conventions skill or doc the project has, for changed test files.

## Axes

| Axis | Question |
|---|---|
| Spec | Does the code do what was asked, fully, and nothing less? |
| Correctness | Bugs, edge cases, error handling, races, off-by-one? |
| Standards | Does it follow the repo's written conventions? Also common smells (unclear names, duplication, needless abstraction) as judgement only. |
| Tests | Is new behavior tested? Do tests check behavior, not implementation? |
| Security | Secrets, untrusted input, injection, access control (light check; use `/security-review` for depth). |
| Scope | Anything outside the request: drive-by cleanup, reformatting, unrelated files? |

## Levels

- **Block**: Spec, Correctness or Security problems (the `reviewer` agent calls these hard violations). Must be fixed.
- **Should fix**: Standards and Tests problems.
- **Nit**: smells and style (the `reviewer` agent calls these judgement calls). List only.

## Who reviews what

Spawn the `reviewer` agent (`subagent_type: "dev-kit:reviewer"`) with the base branch, the issue number and the issue file path in its prompt, for Correctness, Standards and Spec. While it runs, review Tests, Security and Scope yourself from the same diff and untracked files. Merge both into one report.

## After the review

Fix Block and Should fix items, then re-run every command under `checks` from the config. This skill owns that re-run: callers such as `finish-issue` and `/dev-kit:commit-msg` don't repeat it. A check the config lists as `null` doesn't exist in this project: say "not verified" for it rather than skipping silently. Report:

1. One-line verdict: clean, or has Block items.
2. Findings by level, each with `file:line`, the problem, the fix, and whether it is "fixed" or "needs your decision".

No praise filler, no restating the diff. Never run `git commit` or `git push`; the user runs commits.
