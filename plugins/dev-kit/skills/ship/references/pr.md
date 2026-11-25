# ship pr

Draft a pull request description for me to paste into GitHub.

1. Target branch is the mode's arguments, else `origin/<baseBranch>` (after `git fetch origin <baseBranch>`). Find the merge-base with it. A number in the arguments is the issue number, not a branch.
2. Find the issue number `N` with `issue-number.md` (see the router).
3. Read `git log <merge-base>..HEAD` and `git diff <merge-base>`, and, with `N`, the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view <N>`.
4. **Status docs.** Only with `N` and `issuesDir` set, and not when this runs from `/dev-kit:issue finish`. Stop here if either holds: the issue file `<issuesDir>/<NN>-*.md` has an unticked task line (`- [ ]` or `* [ ]`, indented or not); the index `<issuesDir>/README.md` has no row for #N, or that row's Status cell is not `closed`. When you stop, name each missing item (which task, which status), tell the user to run `/dev-kit:issue finish` first so the status docs ride in this PR, and print no title and no body.
5. Only when step 4 did not stop: print the title `[#<N>] <GitHub issue title>` (with no issue, a short summary of the change), then the body in one code block with these sections:
   - **Summary**: what changed and why, in a few sentences.
   - **Evidence**: how it was verified (each command under `checks` in the config, manual checks) and anything not verified.
   - **Merge danger**: risks, migrations, breaking changes, or "none".
   - A final line `Closes #<N>`, only with an issue.
6. End with the attribution line given in the session's system reminder, if one is present.
