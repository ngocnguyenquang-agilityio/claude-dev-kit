# Memory: flag stale topic files and ask for durable facts in issue finish

Plan: `docs/plans/2026-11-27-memory-staleness.md`

## Goal

Pillar 2 (session memory). The memory store has no way to notice a stale fact, and facts reach it only when the model remembers the working rule. Flag topic files that point at paths which no longer exist, and give `issue finish` a step that asks what durable fact the work taught, so memory stays both true and fed.

## Tasks

- [x] `plugins/dev-kit/hooks/session-start.mjs`: under the memory index, name each index link whose topic file is missing, and each repo path in backticks inside a topic file that no longer exists (only tokens with a `/` and a file extension)
- [x] `plugins/dev-kit/skills/issue/references/finish.md`: before the review, a step that writes any durable fact the work taught (a decision, a gotcha, a correction) to `docs/memory/<topic>.md` and the index, or says there is none
- [x] Hook tests in `tests/hooks.test.mjs`
- [x] New eval `issue-finish-memory`: the prompt carries a finished issue whose work found a gotcha; `tool_used` grader on a `Write` or `Edit` under `docs/memory/`
- [x] `README.md` and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- SessionStart names a stale path in a topic file and is silent when every path exists.
- `issue-finish-memory` passes 3 of 3 runs with the `sonnet` judge, `--ablation none`, `--scaffold`.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Deleting or rewriting stale facts automatically.
- Any change to the memory secret check in `safety-guard`.

## Depends on

none
