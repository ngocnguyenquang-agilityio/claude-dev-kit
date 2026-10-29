---
name: new-issue
description: Draft a new issue (as a spec file when the project keeps them, else in chat), then create it on GitHub after a yes.
argument-hint: <what the issue is about>
disable-model-invocation: true
---

Draft an issue for: $ARGUMENTS

Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"` first. If `issuesDir` is set, the project keeps issue specs as files and steps 2 to 4 write one. If it is `null`, draft the same sections in chat and skip the file and index.

1. **Number.** Only when writing a file. Use the next free GitHub number: check `gh issue list --state all -L 1` and `gh pr list --state all -L 1`, because issues and PRs share the counter, and take the higher one plus one. GitHub assigns the real number, and step 5 reconciles it.
2. **Draft.** Use exactly these `##` sections, in this order. Copy the tone and granularity of the most recent issue file when there is one.
   - **Goal**: one or two sentences on the outcome.
   - **Tasks**: `- [ ]` checkboxes, each small enough for one sitting. Name files and functions when you know them.
   - **Acceptance criteria**: observable checks. End with the project's checks from the config.
   - **Depends on**: `#N` references, or `none`.
3. **File.** Write it to `<issuesDir>/<NN>-<slug>.md`.
4. **Index.** If `<issuesDir>/README.md` has a table of issues, add a row for this one and update its "Order" line if the dependency order changed.
5. **Review.** Show the user the draft and wait for edits or a yes.
6. **Create on GitHub.** After an explicit yes, run `gh issue create --title "<title>" --body-file <file>` (or `--body` with the draft when there is no file). It prints the issue URL. If its number differs from `NN`, rename the file and fix its index row.

Creating the issue is the end of this skill. The doc changes stay uncommitted. `/dev-kit:start-issue <N>` carries them onto the issue branch, where they are committed with the work.
