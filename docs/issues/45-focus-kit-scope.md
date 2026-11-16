# Focus the kit on its purpose

## Goal

dev-kit has grown skill by skill without a written purpose. Write down what it is for (better code quality and memory across sessions, for one user, with the safety guard as a base layer) and remove the parts that do not serve it, so new ideas have something to be checked against. Plan: `docs/plans/2026-11-16-focus-kit-scope.md`.

## Tasks

- [ ] Write `docs/vision.md`
- [ ] Add two scope lines to `plugins/dev-kit/rules/working-rules.md`
- [ ] Remove skill `tdd`. Carry its red-step guidance in `plugins/dev-kit/skills/issue/references/fix.md` step 4 and drop the pointer in `plugins/dev-kit/skills/debug/SKILL.md`
- [ ] Remove skills `pr-followup` and `release`. Fix the pointer in `plugins/dev-kit/skills/issue/references/finish.md`
- [ ] Remove agent `ui-verifier`
- [ ] Update `README.md`, `plugins/dev-kit/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
- [ ] In `docs/audit-backlog.md`, drop A6, A9 and A22, rewrite A7 and keep A11
- [ ] Put the roadmap in `docs/vision.md`, add a CHANGELOG entry and bump the version to 0.10.0

## Acceptance criteria

- `grep -rni "tdd" plugins/` gives 0 hits.
- `grep -rn "pr-followup\|dev-kit:release\|skills/release\|ui-verifier" plugins/ README.md .claude-plugin/` gives 0 hits.
- `docs/vision.md` is at most 60 lines and places every remaining skill, agent and hook group under one pillar.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Doing A7 and A11 (they are only recorded in the roadmap).
- A kit-owned memory store, evals for `handoff` and `ship`, and other stacks.
- Past records: old CHANGELOG entries, `docs/issues/*` and earlier plans keep their mentions.

## Depends on

none
