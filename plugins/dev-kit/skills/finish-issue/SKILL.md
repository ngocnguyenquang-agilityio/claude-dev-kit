---
name: finish-issue
description: Wrap up the current issue branch for a PR. Runs the checks and the reviewer agent, updates the issue status docs, and hands the user the commit, push and PR commands. Use when the work on an issue is done, or before asking to commit.
---

Bring the current `<type>/<N>-<slug>` branch to a ready-to-commit state. You commit, push and open the PR only after the user says yes to each one, in the moment.

1. **Identify.** Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. Read `N` and `type` from `branch`, then the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view N`. If the branch name doesn't match `<type>/<N>-<slug>`, stop and ask. If you started this skill on your own (the user didn't type `/dev-kit:finish-issue`), confirm with the user that the issue is done before going on, because step 4 marks it closed.
2. **Checks green.** Run every command under `checks` in the config. Done when all pass. Fix failures before going on. A check that is `null` doesn't exist here: say "not verified" for it in the report.
3. **Review.** Run the `review` skill with the issue number. It spawns the `reviewer` agent, which reviews uncommitted and untracked work against the merge-base with `origin/<baseBranch>`. If `/dev-kit:commit-msg` or an earlier review already covered this same diff, don't review twice.
   - Fix every hard violation (the skill's Block items), spec gap and Should fix item (Standards and Tests problems).
   - The `review` skill re-runs the checks after the fixes, so don't repeat step 2.
   - Keep the judgement calls for the report.
4. **Status docs.** Only when `issuesDir` is set.
   - In the issue file, tick `[x]` every task the diff actually completes. Leave the others unchecked and list them for the user.
   - If `<issuesDir>/README.md` has a status cell for this issue, set it to the "closed" value the table already uses for finished issues.
5. **Report.** Show the user:
   - The review: hard violations fixed, and the judgement calls still open.
   - The check results.
   - The exact commands, in order, each in its own `bash` block:
     - `git add` with the paths.
     - `git commit` with message `<type>(#N): <summary>`, ending with the attribution line from the session's system reminder, if one is present. Use a separate `<type>(#N): mark issue done` commit when the status docs are the only change left.
     - `git push -u origin <branch>`.
     - `gh pr create --base <baseBranch> --title "[#N] <GitHub issue title>" --body "<summary, how it was verified, Closes #N>"`, plus the PR attribution line from the system reminder, if present.

Then stop. When the user says yes to a command, run that one command, and ask again before the next. Once the PR is open, CI runs on it. Read `gh pr checks` and report failures; use `/dev-kit:ci-fix` for a red check and `/dev-kit:pr-feedback` for review comments.

After the user merges the PR, check that `Closes #N` closed the issue (`gh issue view N`; it only closes automatically when the PR targets the repo's default branch). If it's still open, offer `gh issue close N`.
