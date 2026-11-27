# Plan: drop the issue index and the PR status guard (#91)

Goal: remove `docs/issues/README.md` and everything that exists to keep it in sync (the `pr-status-guard` hook, its rule in `ship pr` and the working rules, the `ship-pr-status-docs` eval), keep the per-issue spec files and their task checklists, and move the ordering reasons the index alone holds into the open issues.

Issue file: `docs/issues/91-drop-issue-index.md`

- [x] 1. Remove the PR status guard hook
  - **What**: delete `plugins/dev-kit/hooks/pr-status-guard.mjs`; remove its handler (`hooks.json:34-38` and the comma at `:33`); in `tests/hooks.test.mjs` remove `describe("pr-status-guard")` (about `:1652-1783`, 15 tests), the wiring test "registers pr-status-guard on PreToolUse" (about `:1805-1809`) and the `docs/issues/README.md` entry in the safety-guard silent-list loop (about `:766`); remove `"pr-status-guard"` from `GUARD_HOOKS` in `scripts/inventory.mjs:22`.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs` shows 0 fail and 17 fewer tests than the 453 before (436); `grep -rn "pr-status-guard" plugins tests scripts` prints 0 hits.
- [x] 2. Drop the index from the skills and the rules
  - **What**: `skills/issue/SKILL.md:28-29` (delete the Index term; "Status docs" becomes the issue file's ticked tasks); `references/new.md` step 5 (always pass `--blocked-by` when `Depends on` names issues, and say so when `gh issue create --help` lacks the flag instead of skipping it) and step 6 (write the issue file only, no index row, no Order line) and the closing paragraph; `references/start.md:5` (clean-tree rule names only the issue file and the plan); `references/finish.md` (`:10` PR-state sentence and step 4: ticks only, no status cell); `skills/ship/references/pr.md` step 4 (delete it and renumber), `skills/ship/references/commit.md` step 3 (status docs = ticked tasks), `agents/reviewer.md:26` and `references/issue-number.md:10` if they define status docs by the index; `rules/working-rules.md:17` (delete the "PR that closes an issue is opened only through `/dev-kit:issue finish`..." rule from #76).
  - **Done when**: `grep -rniE "status cell|issues/README|index row|Order line|index status" plugins` prints 0 hits, and `claude plugin validate --strict plugins/dev-kit` passes.
- [x] 3. Evals: remove the guard's case, strip the index from three fixtures
  - **What**: delete `plugins/dev-kit/evals/ship-pr-status-docs/`; remove the index heredoc from `issue-new-bug/fixture.sh:23-30`, `issue-start-plan/fixture.sh:53-61` and `issue-start-small/fixture.sh:37-45` (the project `README.md` at `issue-start-plan/fixture.sh:44` stays); check those cases' graders for any wording that expects an index row.
  - **Done when**: `ls plugins/dev-kit/evals` lists no `ship-pr-status-docs`; `grep -rn "docs/issues/README" plugins/dev-kit/evals --include=*.sh --include=*.md --exclude-dir=results` prints 0 hits; `issue-new-bug`, `issue-start-plan` and `issue-start-small` each pass 3 of 3 on Windows (`--scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --trust-plugin --no-publish --case <name>`). That run also shows `issue new` and `issue start` work with no index.
- [x] 4. Move the ordering reasons into the open issues, delete the index
  - **What**: open issues now are #84, #85, #86, #87, #71, #79 and #93. From the index's Order line: `docs/issues/84-session-state-hook.md` gets `Depends on #85` with the reason "same files as #85: `session-start.mjs`, `tests/hooks.test.mjs`"; `docs/issues/87-audit-quick-wins.md` keeps `#84` and gets the reason "both compute the `wipNote` name (A20)". Set the native GitHub `blocked-by` links for #84 on #85 and check #87 on #84 (look for the flag with `gh issue edit --help`, else `gh api`). The Order line's other pairs (81 before 85, 84 before 86) have no shared files or reason left, so they are dropped. Then delete `docs/issues/README.md`.
  - **Done when**: `docs/issues/README.md` does not exist; `grep -n "Depends on" -A2 docs/issues/84-session-state-hook.md docs/issues/87-audit-quick-wins.md` shows each reason; `gh issue view 84 --json` (or the API) shows the blocked-by link on #85 and #87's link on #84, or the step reports that GitHub lacks the field.
- [x] 5. Docs
  - **What**: `docs/vision.md:23` (remove the PR status guard from the hook list); `README.md:34` (hook row), `:143` (test count and breakdown, from the real run of step 1's command), `:145` and `:151` (remove `ship-pr-status-docs` from the case lists and the `allowed_tools` sentence); `CHANGELOG.md` under Unreleased: a "Removed" entry that names the guard, the rule, the eval and the index and says no existing project needs to act. Closed issue files #30, #55, #67, #75, #76 and old plans stay as history; the issue file `81` wording on `ship-pr-status-docs` also stays.
  - **Done when**: `grep -rn "PR status guard\|ship-pr-status-docs" README.md docs/vision.md` prints 0 hits; the README test count equals the total in the `node --test` output of step 1; the CHANGELOG entry exists.
- [x] 6. Checks and review
  - **What**: no edits. Run the repo checks and the `review` skill.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs` shows 0 fail; `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass; `node scripts/inventory.mjs` does not list `pr-status-guard`; `grep -rE "status cell|issues/README" plugins tests` prints 0 hits; the review has no Block items.

Acceptance mapping: no reference to the index under `plugins/` or `tests/`, steps 1, 2, 3 and 6; open issues carry `Depends on` reasons and blocked-by links, step 4; `issue new`, `start` and `finish` run with no index, steps 2 and 3 (`finish` has no eval: it is checked by reading the changed text); tests, inventory and validation, step 6; changed evals pass, step 3.

## Out of scope

- The per-issue spec files, their task checklists and `issue finish` ticking them.
- A replacement index (`gh issue list` serves that); changes to `safety-guard.mjs`.
- Editing closed issue files and old plans that mention the index; they stay as history.

## Decisions and assumptions

- Native `blocked-by` links change issues on GitHub, which is outward-facing; step 4 does it only with the user's yes to this plan.
- The impact map found no shared files for the Order pairs 81 → 85 and 84 → 86, so no `Depends on` is added for them. #81 is also closed now.
- Removing the guard's 15 describe tests, the wiring test and one generated silent-list test takes the suite from 453 to 436; the README count is set from the real run.
- `finish` has no eval; its change is covered by reading the changed text and the `issue-start-*` runs.
- `docs/issues/README.md` is currently modified on disk to carry the user's #91 row; deleting it in step 4 drops that edit, which is intended.
- Step 3: `issue-new-bug` scored 2 of 3 twice on this branch (main: 3 of 3). The failing run wrote `Out of scope: none`, which the grader read as a missing section, though `new.md` allows `none`. With the user's yes, `issue-new-bug/graders/criteria.md` now says a `none` section counts; the case then passed 3 of 3. `issue-start-plan` and `issue-start-small` passed 3 of 3 unchanged.

## Open questions

- None that block the plan.
