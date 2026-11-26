# Session state: write the handoff State from a hook when a session ends

## Goal

Pillar 2 (session memory). `handoff` runs only when the user types it (`disable-model-invocation`), and the inventory shows 0 uses, so most sessions leave no note. When a session ends or is compacted, write the mechanical part of the note (HEAD, dirty files, commits since the base) from a hook, so the next session always has State, while a richer note written by `handoff` is never lost.

## Tasks

- [ ] Find which of `SessionEnd` and `PreCompact` fire in the desktop app and the CLI on Windows, and record the result in `docs/memory/`
- [ ] A hook `plugins/dev-kit/hooks/session-state.mjs`, wired in `hooks.json`: with no note for the branch, write one with Done (commits since the base and dirty files), Next "run /dev-kit:handoff for a full note" and State; with a note, rewrite only its State line and mark it `auto`
- [ ] Never run on the base branch; never write file contents, diffs or anything secret
- [ ] `session-start.mjs`: say when the loaded note holds only an auto State
- [ ] Hook tests in `tests/hooks.test.mjs`; `README.md`, the session memory hooks under Components in `docs/vision.md`, and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Ending a session on a feature branch with no note leaves `.claude/wip/<branch>.md` with a correct State line.
- A note written by `handoff` keeps every section except State.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Letting the model run `handoff` on its own.
- Changing the note format or the context nudge.

## Depends on

none
