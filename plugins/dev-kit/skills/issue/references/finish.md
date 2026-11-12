# issue finish

Bring the current `<type>/<slug>` branch to a ready-to-commit state. You commit, push and open the PR only after the user says yes to each one, in the moment.

1. **Identify.**
   - **Type**: `branch.type` from the config. If it is `null` (the branch isn't `<type>/<slug>`), ask the user for the type.
   - **Issue `N`**: follow `issue-number.md`.
   - With `N`, read the issue: the issue file when `issuesDir` is set, else `gh issue view N`. With no issue, there are no status docs: skip step 4.
   - If you started this mode on your own (the user didn't type `/dev-kit:issue finish`) and there is an issue, confirm with the user that it is done before going on, because step 4 marks it closed.
   - **PR state**: run `gh pr view --json state`. "no pull requests found" or `CLOSED` means no PR yet. `OPEN` means the new commit goes in by push only, with no `gh pr create`. `MERGED` means this branch is done and any new commit would need a second PR: stop. Tell the user to start a new branch from `<baseBranch>` for further work, and that the issue's tick and status cell can ride in that branch's first commit.
2. **Checks green.** Run every command under `checks` in the config. Done when all pass. Fix failures before going on. A check that is `null` doesn't exist here: say "not verified" for it in the report.
3. **Review.** Run the `review` skill with the issue number, if there is one, unless it already ran on this same diff. It spawns the `reviewer` agent, which reviews uncommitted and untracked work against the merge-base with `origin/<baseBranch>`.
   - Fix every Block and Should fix item, except Scope items, which wait for the user's decision.
   - The `review` skill re-runs the checks after the fixes, so don't repeat step 2.
   - Keep the Nits for the report.
4. **Status docs.** Only with an issue, and when `issuesDir` is set.
   - In the issue file, tick `[x]` every task the diff actually completes. Leave the others unchecked and list them for the user.
   - If the index has a status cell for this issue, set it to the "closed" value the table already uses for finished issues.
5. **Report.** Show the user:
   - The review: Block and Should fix items fixed, Scope items waiting for the user's decision, and the Nits and Follow-ups still open.
   - The check results.
   - The reviewer's spec table with an evidence column. For each acceptance criterion, name what proves it: a test name, a check command and its result, or a manual step you ran. A criterion with no evidence is "not verified", never "met".
   - The commit message and the PR title and body, drafted by following `ship`'s `commit.md` and `pr.md` with `N` (the `ship` skill itself is manual-only). Do not rewrite their format here. The status docs go in the same commit as the work. Only when the work is already committed, draft a `<type>(#N): mark issue done` commit for them on this same branch, so they land in the same PR.
   - The exact commands, in order, each in its own `bash` block: `git add` with the paths, status docs included, `git commit` with the drafted message, `git push -u origin <branch>`, and, only when the branch has no PR yet, `gh pr create --base <baseBranch> --title "<title>" --body "<body>"` using the drafted title and body.

Then stop. When the user says yes to a command, run that one command, and ask again before the next. Once the PR is open, CI runs on it. Read `gh pr checks` and report failures; use `/dev-kit:pr-followup ci` for a red check and `/dev-kit:pr-followup comments` for review comments.

With an issue, after the user merges the PR, check that `Closes #N` closed the issue (`gh issue view N`; it only closes automatically when the PR targets the repo's default branch). If it's still open, offer `gh issue close N`.
