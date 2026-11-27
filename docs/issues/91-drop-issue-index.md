# Drop the issue index table and the PR status guard that keeps it in sync

## Goal

`docs/issues/README.md` duplicates GitHub, the source of truth. It drifts (#72's status cell, the Order line) and costs a maintenance line per issue. #75 and #76 were added only to keep that copy in sync. Remove the index and what exists to guard it, keep the per-issue spec files and their task checklists, and move the ordering information the index alone holds into the open issues themselves.

## Tasks

- [ ] Move the ordering constraints of the open issues from the index's Order line into each issue's `Depends on`, with the reason (for example "same files as #84: `session-start.mjs`, `tests/hooks.test.mjs`"). Set a native GitHub `blocked-by` link for each, starting with #87 on #84.
- [ ] `plugins/dev-kit/skills/issue/references/new.md`: step 5 always passes `--blocked-by` when `Depends on` names issues, and says so when the flag is missing instead of skipping it. Step 6 writes the issue file only, with no index row and no Order line.
- [ ] `plugins/dev-kit/skills/issue/references/finish.md`, `start.md` and `SKILL.md`: drop the index and the status cell. The status docs become the ticked tasks only.
- [ ] `plugins/dev-kit/skills/ship/references/pr.md` and the working rules in `session-start.mjs`: remove the "stop before a PR whose status docs are not updated" rule from #76.
- [ ] Remove `hooks/pr-status-guard.mjs`, its `hooks.json` entry and its `describe` block in `tests/hooks.test.mjs`.
- [ ] Remove the `ship-pr-status-docs` eval and its results. Update the eval fixtures that build an index (`issue-new-bug`, `issue-start-plan`, `issue-start-small`) and re-run what changed.
- [ ] Delete `docs/issues/README.md`. Keep the `<NN>-<slug>.md` files.
- [ ] Update `docs/vision.md`, `README.md` and `CHANGELOG.md`, with a note that no existing project needs to act.
- [ ] Check #30, #55 and #67 for wording that assumes the index.

## Acceptance criteria

- No file under `plugins/` or `tests/` refers to the index or the status cell: `grep -r "status cell\|issues/README"` finds nothing outside `CHANGELOG.md` and old plans.
- Every open issue that depends on another has a native `blocked-by` link and a `Depends on` line with the reason.
- `issue new`, `start` and `finish` run end to end on a repo without a `README.md` in `issuesDir`.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes, and `node scripts/inventory.mjs` no longer lists `pr-status-guard`.
- The changed evals pass at the project's usual bar.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Per-issue spec files, their task checklists and `issue finish` ticking them.
- A replacement index: `gh issue list` serves that.
- Changes to `safety-guard.mjs`.

## Depends on

none
