# Grill: propose ordered vertical-slice issues when the settled scope is bigger than one issue

## Goal

Pillar 1 (quality workflow). `grill` settles decisions but stops at a chat summary, and nothing in the kit turns a large idea into issues: `issue new` drafts one issue at a time. When the settled scope is bigger than one issue, `grill` should end with a proposed, ordered list of issues so the work can be done in small steps. Plan: `docs/plans/2026-11-25-grill-proposed-issues.md`.

## Tasks

- [x] `plugins/dev-kit/skills/grill/SKILL.md` Output: add a **Proposed issues** section only when the settled scope holds two or more parts that each merge, deliver value and can be checked on their own (a Goal that needs "and" to join two outcomes is the signal). Each item has a title, a one-sentence goal and `Depends on` as `[N]` labels. A technical layer is an item only when it is checked and useful alone (a shared library with its own tests, a migration several features need). Keep "Write no files"
- [x] `plugins/dev-kit/skills/grill/SKILL.md` description: also trigger on requests to split an idea or project into issues
- [x] New eval `plugins/dev-kit/evals/grill-breakdown`: a prompt that gives an idea with every decision already settled (so the frontier is empty in one turn) and a scope of at least three shippable parts. Graders: `tool_used` on `Skill` matching `dev-kit:grill`, and an `llm` criterion that the summary lists ordered vertical slices with `Depends on` and no layer-only items
- [x] New eval `plugins/dev-kit/evals/grill-small-no-breakdown`: a settled change that fits one PR; an `llm` criterion that the summary has no Proposed issues section
- [x] `README.md` (grill row and evals paragraph) and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- A grill whose settled scope has several shippable parts ends with an ordered Proposed issues list; a one-PR scope does not.
- `grill-small-no-breakdown` passes 3 of 3 runs and `grill-breakdown` 2 of 3 with the `sonnet` judge, `--ablation none` and `--scaffold` (2 of 3 accepted by the user on 2026-11-25).
- Existing `grill-*` evals score no lower than on `main`.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Creating issues or writing files from `grill`.
- Parent issues, GitHub sub-issues and a hard task-count threshold.
- A separate `breakdown` skill.

## Depends on

none
