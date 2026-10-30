---
name: finish-issue
description: Wrap up the current issue branch for a PR. Runs the checks and the reviewer agent, updates the issue status docs, and hands the user the commit, push and PR commands. Use when the work on an issue is done, or before asking to commit.
argument-hint: "[issue number]"
---

Bring the current `<type>/<slug>` branch to a ready-to-commit state. You commit, push and open the PR only after the user says yes to each one, in the moment.

1. **Identify.** Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`.
   - **Type**: `branch.type`. If it is `null` (the branch isn't `<type>/<slug>`), ask the user for the type.
   - **Issue `N`**, the first of these that gives one:
     - `branch.issue`: set when the branch's commits name exactly one issue as `<type>(#N): ...`.
     - When `branch.issues` lists more than one number, ask the user which one this PR is for.
     - A number in `$ARGUMENTS` (`12` or `#12`).
     - Ask the user for the issue number, or whether there is none.
   - With `N`, read the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view N`. With no issue, there is no spec: skip step 4 and leave the issue parts out of step 5.
   - If you started this skill on your own (the user didn't type `/dev-kit:finish-issue`) and there is an issue, confirm with the user that it is done before going on, because step 4 marks it closed.
2. **Checks green.** Run every command under `checks` in the config. Done when all pass. Fix failures before going on. A check that is `null` doesn't exist here: say "not verified" for it in the report.
3. **Review.** Run the `review` skill with the issue number, if there is one. It spawns the `reviewer` agent, which reviews uncommitted and untracked work against the merge-base with `origin/<baseBranch>`. If `/dev-kit:commit-msg` or an earlier review already covered this same diff, don't review twice.
   - Fix every hard violation (the skill's Block items), spec gap and Should fix item (Standards and Tests problems).
   - The `review` skill re-runs the checks after the fixes, so don't repeat step 2.
   - Keep the judgement calls for the report.
4. **Status docs.** Only with an issue, and when `issuesDir` is set.
   - In the issue file, tick `[x]` every task the diff actually completes. Leave the others unchecked and list them for the user.
   - If `<issuesDir>/README.md` has a status cell for this issue, set it to the "closed" value the table already uses for finished issues.
5. **Report.** Show the user:
   - The review: hard violations fixed, and the judgement calls still open.
   - The check results.
   - The exact commands, in order, each in its own `bash` block:
     - `git add` with the paths.
     - `git commit` with message `<type>(#N): <summary>`, or `<type>: <summary>` with no issue, ending with the attribution line from the session's system reminder, if one is present. Use a separate `<type>(#N): mark issue done` commit when the status docs are the only change left.
     - `git push -u origin <branch>`.
     - `gh pr create --base <baseBranch> --title "[#N] <GitHub issue title>" --body "<summary, how it was verified, Closes #N>"`, plus the PR attribution line from the system reminder, if present. With no issue, the title is `<summary>` and the body has no `Closes` line.

Then stop. When the user says yes to a command, run that one command, and ask again before the next. Once the PR is open, CI runs on it. Read `gh pr checks` and report failures; use `/dev-kit:ci-fix` for a red check and `/dev-kit:pr-feedback` for review comments.

With an issue, after the user merges the PR, check that `Closes #N` closed the issue (`gh issue view N`; it only closes automatically when the PR targets the repo's default branch). If it's still open, offer `gh issue close N`.
