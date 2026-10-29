---
name: start-issue
description: Start work on a GitHub issue. Creates its branch from an up-to-date base branch and loads its tasks as the plan.
argument-hint: <issue number>
disable-model-invocation: true
---

Start issue `#$ARGUMENTS`. Each step ends when its check holds. Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"` first for `baseBranch` and `issuesDir`.

1. **Clean tree.** `git status --porcelain` lists nothing except this issue's own docs, left uncommitted by `/dev-kit:new-issue`: `<issuesDir>/<NN>-*.md` and `<issuesDir>/README.md`. Those carry over to the new branch and get committed with the issue. If anything else shows up, stop and ask the user what to do with it.
2. **Up-to-date base.** Run `git fetch origin <baseBranch>`. Then `git checkout <baseBranch>` and `git merge --ff-only origin/<baseBranch>`. Done when `git rev-parse <baseBranch>` equals `git rev-parse origin/<baseBranch>`. If the fast-forward fails, stop and tell the user: the local base has diverged.
3. **Read the issue.**
   - Run `gh issue view <N>`.
   - If `issuesDir` is set, also read `<issuesDir>/<NN>-*.md` (`NN` is the number zero-padded to two digits). If the two disagree, the GitHub issue wins. Tell the user about the difference.
4. **Branch.** Pick the type from the issue's main purpose: `feat`, `fix`, `chore`, `docs`, `test` or `refactor` (`feat` when unsure). Pick a 2-4 word kebab-case slug from the issue title. Then run `git checkout -b <type>/<N>-<slug>`. Done when `git branch --show-current` prints that name.
5. **Plan.** Turn every unchecked `[ ]` task (or, with no task list, every requirement in the issue body) into a task-list step. Name the acceptance criteria that will prove the issue done.
6. **Framework context.** If a task touches an API from a framework whose docs the project bundles or whose version is newer than you know, read those docs before writing code.

Finish by telling the user the branch name, the type you chose and why, and the plan. Then wait for a go-ahead before implementing.
