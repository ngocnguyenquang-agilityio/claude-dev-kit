# Reviewer agent: evals that check it is spawned, and a pasted-diff case

## Goal

Pillar 1 (quality workflow). The `reviewer` agent runs in every review, but `node scripts/inventory.mjs` flags it as "unproven" with 0 evals, which breaks the vision's gate. The four `review-*` evals already exercise it through the `review` skill; they just never check that the agent was spawned. Add that check, and one eval for a reviewer behavior nothing covers yet: reviewing a pasted diff that is not the pending work on the branch.

## Tasks

- [x] Add `graders/agent-spawned.md` (`type: tool_used`, `tool: Agent`, `input_match: 'dev-kit:reviewer'`) to `review-boundary-bug`, `review-clean-diff`, `review-pre-existing-bug` and `review-scope-change` in `plugins/dev-kit/evals/`
- [x] New eval `plugins/dev-kit/evals/review-pasted-diff` with the same layout as the other `review-*` evals (`case.yaml`, `fixture.sh`, `prompt.md`, `graders/`): the branch has no pending changes, the prompt pastes a diff from elsewhere that holds one clear bug. Graders: `skill-fired`, `agent-spawned` and an `llm` criteria grader that passes when the report names the bug in the pasted text and says it reviewed the pasted diff, not the branch
- [ ] `README.md` (evals paragraph) and `CHANGELOG.md`; bump the plugin version in `plugins/dev-kit/.claude-plugin/plugin.json`

## Acceptance criteria

- `node scripts/inventory.mjs` shows `reviewer` with 5 evals and no "unproven" flag.
- `review-pasted-diff` passes 3 of 3 runs with the `sonnet` judge.
- The four existing `review-*` evals each pass one run with the new `agent-spawned` grader.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- An eval for the reviewer's second run after a large Block fix.
- Changes to `reviewer.md` or the `review` skill, unless an eval exposes a real defect (then note it as a follow-up).
- Reading transcripts from other projects in `inventory.mjs`, a memory staleness check, and an eval trend report.

## Depends on

none
