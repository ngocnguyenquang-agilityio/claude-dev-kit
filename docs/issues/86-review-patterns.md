# Review patterns: remember recurring finding kinds and check them in plan

## Goal

Pillar 1 (quality workflow). Each `reviewer` run starts from nothing, so a kind of mistake it catches twice is not prevented the third time. Keep a short list of recurring finding kinds in memory and have `plan` and `implementer` read it before writing code, so the kit learns from its own reviews.

## Tasks

- [ ] Settle the design with `grill` first: what counts as the same kind of finding, the count that promotes it, and where the list lives (proposed: `docs/memory/review-patterns.md`, one line per kind with a count, linked from `docs/memory.md`)
- [ ] `plugins/dev-kit/skills/review/SKILL.md`: after the review, add or bump one line per Block or Should fix kind; one line of words, never code or secrets
- [ ] `plugins/dev-kit/skills/plan/SKILL.md` and `plugins/dev-kit/agents/implementer.md`: read the list when it exists and name, per step, any kind that applies
- [ ] New eval `plan-review-patterns`: a fixture whose pattern list holds an off-by-one kind and a change that invites it; `llm` grader: the plan names that risk on the step it applies to
- [ ] `README.md` and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- `plan-review-patterns` passes 3 of 3 runs with the `sonnet` judge, `--ablation none`, `--scaffold`; the `review-*` cases score no lower than on `main`.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Changing the reviewer's axes or levels.
- Turning patterns into working rules.

## Depends on

none
