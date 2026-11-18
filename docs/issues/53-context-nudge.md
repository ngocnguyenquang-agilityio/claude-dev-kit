# Context nudge: suggest handoff when a session gets long

## Goal

Pillar 2 (session memory). When a session's context is nearly full, remind the user once to run `/dev-kit:handoff` and continue in a fresh session, so a structured note (Next, Decisions, Tried) is kept instead of only the auto-compact summary.

## Tasks

- [x] Add `plugins/dev-kit/hooks/context-nudge.mjs` and register it as a `UserPromptSubmit` entry in `plugins/dev-kit/hooks/hooks.json`
- [x] Read the last assistant `usage` from `transcript_path`; context size is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
- [x] Add `contextWarnTokens` to `.claude/kit.json` (default 150000, suits a 200k window) and to `loadConfig` in `hooks/lib.mjs`
- [x] When the size passes the threshold, print one line naming `/dev-kit:handoff` and the branch note path
- [x] Nudge once per session: a marker file in the temp dir keyed by `session_id`
- [x] Skip the nudge when the branch's note mtime is later than the transcript's first entry (handoff already written this session)
- [x] Never block, and fail open: any error or missing field prints nothing and exits 0
- [x] Add tests to `tests/hooks.test.mjs` using a real-shaped transcript fixture: below threshold silent, above nudges, second run silent, bad or missing transcript silent, fresh note skips
- [x] Update `README.md` (hooks table and `kit.json` keys), `docs/vision.md` (Session memory hooks) and `CHANGELOG.md`; recheck any hook-count text

## Acceptance criteria

- In a session past the threshold, the next prompt shows the nudge once; the one after shows nothing.
- `handoff` still has `disable-model-invocation`; nothing runs it for the user.
- A transcript with renamed or missing `usage` fields produces no output and exit 0.
- Eval or test evidence: hook code, so the hook tests above are its evidence. Say so in the PR.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Scanning the repo.
- Letting Claude run `handoff` itself.
- Changing auto-compact.
- A real long-session eval.

## Depends on

none

