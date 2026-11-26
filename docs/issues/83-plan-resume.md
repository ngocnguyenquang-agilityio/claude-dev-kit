# Plan: tick steps as they pass and resume a half-done plan in a new session

## Goal

Pillar 2 (session memory). When a session ends in the middle of an approved plan, nothing records which steps passed their Done when check, so the next session either asks or starts over. Tick each step in the plan file once its check passes, and have SessionStart name the plan in progress, so a fresh session resumes at the first open step.

## Tasks

- [x] `plugins/dev-kit/skills/plan/SKILL.md`: write each step as a `- [ ]` line; in Implement, tick it in the plan file right after its Done when check gives the expected result, never before
- [x] `plan`: when asked to continue a plan, start at its first unticked step and do not redo ticked ones
- [x] `plugins/dev-kit/hooks/session-start.mjs`: name each plan under `docs/plans/` changed on this branch (committed against the base, or uncommitted) that has both ticked and unticked steps, as "Plan in progress: <path>, step k of n"
- [x] Hook tests in `tests/hooks.test.mjs`
- [x] New eval `plan-resume`: a fixture plan with 2 of 4 steps ticked; the prompt asks to continue it. `tool_used` grader: `dev-kit:implementer` is spawned for step 3 and never for steps 1 or 2
- [x] `README.md` and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- `plan-resume` passes 3 of 3 runs with the `sonnet` judge, `--ablation none`, `--scaffold`; `plan-implementer-dispatch` scores no lower than on `main`.
- SessionStart names a half-done plan on its branch and stays silent with none.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Ticking the issue file's tasks (`issue finish` owns that).
- Rewriting existing plans under `docs/plans/`.

## Depends on

none

## Plan

[docs/plans/2026-11-26-plan-resume.md](../plans/2026-11-26-plan-resume.md)
