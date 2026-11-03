# issue finish

Bring the current `<type>/<slug>` branch to a ready-to-commit state. You commit, push and open the PR only after the user says yes to each one, in the moment.

1. **Identify.**
   - **Type**: `branch.type` from the config. If it is `null` (the branch isn't `<type>/<slug>`), ask the user for the type.
   - **Issue `N`**: follow `references/issue-number.md` in this skill's folder.
   - With `N`, read the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view N`. With no issue, there is no spec: skip step 4.
   - If you started this mode on your own (the user didn't type `/dev-kit:issue finish`) and there is an issue, confirm with the user that it is done before going on, because step 4 marks it closed.
2. **Checks green.** Run every command under `checks` in the config. Done when all pass. Fix failures before going on. A check that is `null` doesn't exist here: say "not verified" for it in the report.
3. **Review.** Run the `review` skill with the issue number, if there is one. It spawns the `reviewer` agent, which reviews uncommitted and untracked work against the merge-base with `origin/<baseBranch>`. If `ship commit` or an earlier review already covered this same diff, don't review twice.
   - Fix every Block and Should fix item.
   - The `review` skill re-runs the checks after the fixes, so don't repeat step 2.
   - Keep the Nits for the report.
4. **Status docs.** Only with an issue, and when `issuesDir` is set.
   - In the issue file, tick `[x]` every task the diff actually completes. Leave the others unchecked and list them for the user.
   - If `<issuesDir>/README.md` has a status cell for this issue, set it to the "closed" value the table already uses for finished issues.
5. **Report.** Show the user:
   - The review: Block and Should fix items fixed, and the Nits still open.
   - The check results.
   - The commit message and the PR title and body, drafted by following `${CLAUDE_PLUGIN_ROOT}/skills/ship/references/commit.md` and `pr.md` with `N` (read the files; the `ship` skill itself is manual-only). Do not rewrite their format here. When the status docs are the only change left, draft a separate `<type>(#N): mark issue done` commit.
   - The exact commands, in order, each in its own `bash` block: `git add` with the paths, `git commit` with the drafted message, `git push -u origin <branch>`, and `gh pr create --base <baseBranch> --title "<title>" --body "<body>"` using the drafted title and body.

Then stop. When the user says yes to a command, run that one command, and ask again before the next. Once the PR is open, CI runs on it. Read `gh pr checks` and report failures; use `/dev-kit:pr-followup ci` for a red check and `/dev-kit:pr-followup comments` for review comments.

With an issue, after the user merges the PR, check that `Closes #N` closed the issue (`gh issue view N`; it only closes automatically when the PR targets the repo's default branch). If it's still open, offer `gh issue close N`.
