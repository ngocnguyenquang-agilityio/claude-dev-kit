# Session state: write the handoff State from a hook when a session ends

Plan: `docs/plans/2026-11-27-session-state-hook.md`

## Goal

Pillar 2 (session memory). `handoff` runs only when the user types it (`disable-model-invocation`), and the inventory shows 0 uses, so most sessions leave no note. When a session ends or is compacted, write the mechanical part of the note (HEAD, dirty files, commits since the base) from a hook, so the next session always has State, while a richer note written by `handoff` is never lost.

## Tasks

- [x] Find which of `SessionEnd` and `PreCompact` fire in the desktop app and the CLI on Windows, and record the result in `docs/memory/`
- [x] A hook `plugins/dev-kit/hooks/session-state.mjs`, wired in `hooks.json`: with no note for the branch, write one with Done (commits since the base and dirty files), Next "run /dev-kit:handoff for a full note" and State; with a note, rewrite only its State line and mark it `auto`
- [x] Never run on the base branch; never write file contents, diffs or anything secret
- [x] `session-start.mjs`: say when the loaded note holds only an auto State
- [x] Hook tests in `tests/hooks.test.mjs`; `README.md`, the session memory hooks under Components in `docs/vision.md`, and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Ending a session on a feature branch with no note leaves `.claude/wip/<branch>.md` with a correct State line.
- A note written by `handoff` keeps every section except State.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Letting the model run `handoff` on its own.
- Changing the note format or the context nudge.

## Depends on

#85. It changes the same files (`plugins/dev-kit/hooks/session-start.mjs` and `tests/hooks.test.mjs`), so it starts after #85 is merged.

## Decisions

- With an existing note written by `handoff`, the hook keeps its State line untouched (old sha, `checks:`, `skills:`) and adds or updates one line `Auto: HEAD <sha> · <n> dirty files` right below it. `session-start.mjs` takes the sha for its stale warning from the handoff line, so "N commits since" stays true.
- With no note, the hook writes a new one: Done (commits since the base and dirty files), Next "run /dev-kit:handoff for a full note", and a State line marked `auto`.
- A branch with no commits of its own and no dirty files gets no note.
- Event discovery: a temporary probe hook logs timestamps to the scratchpad. The user closes a session and runs `/compact` in the desktop app; the CLI part is run from the session. The result goes to `docs/memory/`, and only events that fire are wired in `hooks.json`.

## Assumptions

- The hook never runs on the base branch or on a detached HEAD.
- It writes only file names and commit subjects (at most about 10 each), never file contents or diffs; anything that looks like a secret becomes `<REDACTED>`.
- A hook-made note is recognized by its fixed Next line plus `auto` in State; `session-start.mjs` adds its "only an auto State" message for that kind only.
- The hook sets a short `timeout` and uses a few fast git commands, because `SessionEnd` is cut early.
- The note is written atomically (temp file, then rename).
- The "Depends on" line in this file (#85, already merged) and the GitHub issue body (`none`) are synced when work starts.

## Open risks

- The `Auto:` line adds a line inside State; it is not a new section, but it is close to "changing the note format".
- It is unknown whether `SessionEnd` or `PreCompact` fire in the desktop app on Windows; if neither does, the scope needs another look.
- The hook writes on every session end, so `.claude/wip/` must stay in `.gitignore`.
