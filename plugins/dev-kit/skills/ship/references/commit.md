# ship commit

Draft a commit message for the pending work.

1. Run `git fetch origin <baseBranch>`, then find the merge-base of the current branch with `origin/<baseBranch>`. Read `git diff <merge-base>` and `git status --porcelain` (read untracked files too).
2. Run the `review` skill on this work, unless it already ran on this same diff (for example through `/dev-kit:issue finish`). Fix Block and Should fix items first; the skill re-runs the checks.
   - With an issue and `issuesDir` set, unless this runs from `/dev-kit:issue finish`, if the diff leaves the issue's status docs untouched, say so and suggest `/dev-kit:issue finish` first, so they ride in this commit and its PR instead of a second PR after the merge.
3. Print, in code blocks:
   - The commit message.
   - The exact `git add` and `git commit` commands for me to run.
   - The remaining Nit review findings, if any.

Message format: `<type>(#<task>): <summary>` or `<type>: <summary>` when there is no task.

- `type` is one of `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- Summary in the imperative mood, first line at most 72 characters.
- Body explains why the change was made, not what the diff already shows.
- Task number: the issue number found by `issue-number.md` (see the router). Hint text in the arguments is about the change and never goes into `(#...)`.
- End with the attribution line given in the session's system reminder, if one is present.
