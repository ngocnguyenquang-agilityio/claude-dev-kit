# Plan: tick plan steps as they pass and resume a half-done plan (#83)

Issue: [docs/issues/83-plan-resume.md](../issues/83-plan-resume.md). Branch: `feat/plan-resume`.

## Goal

Each plan step is a `- [ ]` line that `plan` ticks right after its Done when check passes, `plan` resumes at the first unticked step, and SessionStart names a half-done plan on the branch, so a fresh session picks up where the last one stopped.

## Steps

- [x] 1. SessionStart names a half-done plan
  - **What**: in `plugins/dev-kit/hooks/session-start.mjs`, inside the `sessionStart.context` block (12-43), add one line `Plan in progress: <path>, step k of n` for each Markdown file under `docs/plans/` that is changed on this branch and has at least one ticked and one unticked step. Changed means: committed since the merge-base with the base (reuse the merge-base pattern of `issuesFromCommits`, `lib.mjs:313-320`), modified but uncommitted, or untracked (as `stop-checks.mjs:62` lists them). A step is a top-level (unindented) `- [ ]` or `- [x]` line; `n` is their count and `k` the position of the first unticked one. Skip a branch already merged into the base (reuse `isMergedInto`, as the handoff note does at 34). On the base branch only uncommitted and untracked plans count. Paths are repo-relative with `/`.
  - **Done when**: `node --test tests/hooks.test.mjs` passes, with new tests in the `session-start` describe block: a committed plan on a branch with 2 of 4 steps ticked prints `Plan in progress: docs/plans/<file>, step 3 of 4`; an untracked half-done plan is named; a plan with all steps ticked, one with none ticked, and a plan file unchanged on the branch print no such line; `sessionStart.context: false` hides it.

- [x] 2. `plan` writes checkbox steps, ticks them and resumes
  - **What**: in `plugins/dev-kit/skills/plan/SKILL.md`: step 3 says each step is a top-level `- [ ] N. <title>` line with What and Done when nested under it; Implement says to tick the step (`- [x]`) in the plan file right after its Done when check gives the expected result, never before, and never for a step whose check failed; a new rule says that when asked to continue a plan, start at its first unticked step and do not re-run ticked ones. Leave `agents/implementer.md` as is (it already reads the steps before its own).
  - **Done when**: `rg -n "\- \[ \]" plugins/dev-kit/skills/plan/SKILL.md` shows the step format; `claude plugin validate --strict plugins/dev-kit` passes; the existing evals `plan-implementer-dispatch` and `plan-multi-file` still pass 1 run each.

- [x] 3. Eval `plan-resume`
  - **What**: new case `plugins/dev-kit/evals/plan-resume/` following `plan-implementer-dispatch`: `case.yaml` with `scaffold_script: fixture.sh`; a fixture project with a plan under `docs/plans/` of 4 steps, steps 1 and 2 ticked and already done in the code, each step naming a distinct file; `prompt.md` (allowed tools as in `plan-implementer-dispatch`) that names the `plan` skill and asks to continue the plan, with pre-approval; graders: `tool_used` on `Agent` matching `dev-kit:implementer` together with step 3's distinct file (min 1), and `tool_used` on `Agent` matching step 1's file and step 2's file with `min: 0, max: 0`. If the runner turns out to match only part of the Agent input, adjust the regexes and record the finding in `docs/memory/skill-evals.md`.
  - **Done when**: `claude plugin eval` on `plan-resume` with the `sonnet` judge, `--ablation none`, `--scaffold` passes 3 of 3 runs; `plan-implementer-dispatch` run on `main` and on this branch, same settings, scores no lower on the branch.

- [x] 4. Docs
  - **What**: `README.md` (plan row near 43: steps are ticked and a plan resumes; session-start description if it lists what it prints) and `CHANGELOG.md`: one `Added:` entry under Unreleased naming #83, with the eval results and limits.
  - **Done when**: `rg -n "Plan in progress" README.md CHANGELOG.md` shows at least one hit in each file; README test counts match the totals of step 5's test run.

- [x] 5. Checks and review
  - **What**: no file changes; runs in this session.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs` reports 0 failures; `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass; the `review` skill reports no Block.

## Coverage of the acceptance criteria

- `plan-resume` 3 of 3, `plan-implementer-dispatch` no lower than `main`: step 3.
- SessionStart names a half-done plan and stays silent with none: step 1.
- Tests pass and both validates pass: steps 1 and 5.

## Out of scope

- Ticking the issue file's tasks (`issue finish` owns that).
- Rewriting the existing plans under `docs/plans/` to the new step format.
- How `review` and `reviewer` read ticked steps as spec.

## Decisions and assumptions

- This plan uses the new step format itself, so its own steps are ticked as they pass.
- A step is only a top-level checkbox line, so nested sub-bullets with checkboxes never count.
- `k` is the position of the first unticked step, which is where `plan` resumes.
- The plan line lives in the project-context block, so `sessionStart.context: false` hides it with the rest.
- Plans on an already merged branch are skipped, matching the handoff note.
- On the base branch only uncommitted and untracked plans count, since nothing is committed "on the branch" there.
- The graders tell steps apart by each step's distinct file name, since the implementer's prompt carries the step's What, not its number.

## Open questions

none
