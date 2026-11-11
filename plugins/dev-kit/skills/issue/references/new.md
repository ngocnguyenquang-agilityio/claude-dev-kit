# issue new

Draft an issue for: $ARGUMENTS

With `issuesDir` set, the project keeps an issue file per issue and step 6 writes it. With `issuesDir` `null`, the issue lives on GitHub only: skip step 6.

1. **Duplicates.** Run `gh issue list --search "<2-4 keywords>" --state all -L 5`. If one looks like the same problem, show it and ask whether to go on, add to that issue instead, or stop. Done when nothing matches or the user chose. If `gh` cannot run, say duplicates were not checked and go on.
2. **Template.** If `.github/ISSUE_TEMPLATE/` has a Markdown template for this kind of issue (pick by its `name` and `about`), read it. The draft uses the template's `##` sections in its order, then adds any section from step 3 it lacks: `finish` needs Tasks to tick. Drop the template's `<!-- -->` hint comments from the draft. The template's `labels` go on the issue, keeping only the ones `gh label list` shows.
3. **Draft.** A title and these `##` sections, in this order unless a template set it. Copy the tone and granularity of the most recent issue file when there is one.
   - **Goal**: one or two sentences on the outcome and why it matters.
   - **Steps to reproduce** (bugs only): the fewest numbered steps that still show the bug, with the exact input, command or file.
   - **Expected / Actual** (bugs only): one line each.
   - **Tasks**: `- [ ]` checkboxes, each small enough for one sitting. Name files and functions when you know them.
   - **Acceptance criteria**: observable checks. For a bug, start with a regression test that fails before the fix and passes after. End with the project's checks from the config.
   - **Out of scope**: what this issue leaves alone, so the work does not grow. `none` when nothing is close.
   - **Depends on**: `#N` references, or `none`.
4. **Review.** Show the user the title, the draft and the labels, and wait for edits or a yes. Nothing goes to GitHub or into the repo before that.
5. **Create on GitHub.** After an explicit yes, write the draft to a file in the system temp folder and run `gh issue create --title "<title>" --body-file <file>`. Add `--label <name>` for each label. When Depends on names issues and `gh issue create --help` lists `--blocked-by`, add `--blocked-by <numbers>`. The command prints the issue URL; the number at its end is `N`. Then delete the temp file.
6. **Issue file and index.** Write the issue file with `# <title>` followed by the draft, using `N` from step 5. If the index has a table of issues, add a row for this one with the status the table uses for open issues, and update its "Order" line if the dependency order changed.

Creating the issue is the end of this mode. The issue file and the index stay uncommitted. `/dev-kit:issue start <N>` carries them onto the issue branch, where they are committed with the work.
