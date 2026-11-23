# Issue start: route multi-file issues through plan so steps run in the implementer

## Goal

Pillar 1 (quality workflow). The `implementer` agent (#63) has 0 uses in `node scripts/inventory.mjs`: only the `plan` skill spawns it, and `issue start` never reaches `plan`. Step 5 of `references/start.md` builds its own task list and waits for a go-ahead, so the main session then edits the files itself, even for an issue like #65 that touched 11 files. Route issues that meet `plan`'s own bar through `plan`, so approved steps run on Sonnet in the `implementer` as the vision says. Plan: `docs/plans/2026-11-23-issue-start-plan.md`.

## Tasks

- [x] `plugins/dev-kit/skills/issue/references/start.md` step 5: when the issue file links a plan under `docs/plans/`, show that plan and continue with `plan`'s Implement section after the user's yes. Otherwise, when the issue changes 3 or more files or needs several dependent steps (`plan`'s description), run the `plan` skill with the issue's tasks and acceptance criteria instead of building a task list. Keep the task list only for a change that fits in one sentence
- [x] `plugins/dev-kit/skills/issue/references/start.md` closing paragraph: say the go-ahead is `plan`'s approval when `plan` ran, so the user is not asked twice
- [x] New eval `plugins/dev-kit/evals/issue-start-plan`: an issue file whose tasks touch at least 4 files; the prompt asks to start that issue. Graders: `tool_used` on `Skill` matching `dev-kit:plan`, and `tool_used` on `Write` under `docs/plans/`
- [x] New eval `plugins/dev-kit/evals/issue-start-small`: an issue whose whole change is one sentence (a rename); `plan` must not fire (`tool_used` on `Skill` matching `dev-kit:plan` with at most 0 calls)
- [x] `README.md` (issue row and evals paragraph) and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Starting an issue that touches 3 or more files runs `plan`, saves a plan under `docs/plans/`, and after the user's yes each step runs in `dev-kit:implementer`.
- Starting a one-sentence issue does not run `plan`.
- `issue-start-plan` and `issue-start-small` each pass 3 of 3 runs with the `sonnet` judge and `--ablation none`.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- `issue fix`, `debug` and `review`: they stay in the main session, as #63 decided.
- Changes to the `implementer` agent or to `plan`'s Implement section.
- Checking in an eval that the main session runs each Done when check (`Bash` cannot be granted to evals on Windows).

## Depends on

none
