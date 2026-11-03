# ship pr

Draft a pull request description for me to paste into GitHub.

1. Target branch is the mode's arguments, else `origin/<baseBranch>` (after `git fetch origin <baseBranch>`). Find the merge-base with it. A number in the arguments is the issue number, not a branch.
2. Find the issue number `N` with the shared rule.
3. Read `git log <merge-base>..HEAD` and `git diff <merge-base>`, and, with `N`, the issue: `<issuesDir>/<NN>-*.md` when `issuesDir` is set, else `gh issue view <N>`.
4. Print the title `[#<N>] <GitHub issue title>` (with no issue, a short summary of the change), then the body in one code block with these sections:
   - **Summary**: what changed and why, in a few sentences.
   - **Evidence**: how it was verified (each command under `checks` in the config, manual checks) and anything not verified.
   - **Merge danger**: risks, migrations, breaking changes, or "none".
   - A final line `Closes #<N>`, only with an issue.
5. End with the attribution line given in the session's system reminder, if one is present.
