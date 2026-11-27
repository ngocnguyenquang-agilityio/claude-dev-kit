# Plan: session state hook (#84)

Issue: [docs/issues/84-session-state-hook.md](../issues/84-session-state-hook.md)

## Goal

When a session ends or is compacted, a hook writes the mechanical part of the handoff note (HEAD, dirty files, commits since the base) to `.claude/wip/<branch>.md`, so the next session always has State, and a note written by `handoff` keeps every line it wrote.

## Steps

- [x] 1. Probe which events fire
  - **What**: a throwaway script in the scratchpad that appends `{event, time, stdin}` to a log file, wired for `SessionEnd` and `PreCompact` in `.claude/settings.local.json` (not committed). The session runs the CLI part (`claude -p` with a trivial prompt, then a `/compact` run if the CLI allows it). The user closes one desktop-app session and runs `/compact` in another, then says when done.
  - **Done when**: the log shows, per event and per client (CLI, desktop app), `fired` or `did not fire`, and the probe wiring is removed from `.claude/settings.local.json` (`git status` shows no change there and `grep -c probe .claude/settings.local.json` prints 0 or the file is gone).

- [x] 2. Record the result in memory
  - **What**: new `docs/memory/hook-events.md` (which of `SessionEnd` and `PreCompact` fire in the desktop app and the CLI on Windows, the stdin fields seen, the `SessionEnd` timeout behaviour) and one line in `docs/memory.md` saying when to read it. No secrets, no session ids.
  - **Done when**: `node plugins/dev-kit/hooks/session-start.mjs` prints the new index line and no `Stale memory` line.

- [x] 3. Share the secret patterns and the note path
  - **What**: move `SECRET_CONTENT` from `plugins/dev-kit/hooks/safety-guard.mjs:49-57` into `plugins/dev-kit/hooks/lib.mjs` as an export and import it back in `safety-guard.mjs`. Add `wipNoteName(branch)` to `lib.mjs` (`.claude/wip/<branch with "/" as "-">.md`) and use it in `session-start.mjs:31` and `context-nudge.mjs:51`. No behaviour change.
  - **Done when**: `node --test tests/hooks.test.mjs` passes with 0 fail and the same test count as before, and `grep -n "SECRET_CONTENT = \[" plugins/dev-kit/hooks` shows 1 hit, in `lib.mjs`.

- [x] 4. The `session-state` hook and its tests
  - **What**: new `plugins/dev-kit/hooks/session-state.mjs`, built on `run`, `baseRef`, `detectBaseBranch`, `issuesFromCommits`, `recordUsage`, `wipNoteName` and `SECRET_CONTENT` from `lib.mjs`. It always exits 0 and prints nothing.
    - Skips on the base branch, on a detached HEAD, and when the branch has no commit since the base and no dirty file and no note.
    - Commits since the base: `git log --format=%s <baseRef>..HEAD`; dirty files: `git status --porcelain`. Names only, at most 10 each with `+N more`, a subject cut at 100 characters, anything matching `SECRET_CONTENT` replaced by `<REDACTED>`. No file contents, no diffs.
    - No note: writes the full note format (title with `(#N)` when exactly one issue, Done, Next `run /dev-kit:handoff for a full note`, Open, Decisions and Tried as `none`, State `HEAD <sha> · <n> dirty files · checks: not run · skills to use next: none · auto`). A note that has this Next line is hook-made and is rewritten whole on each run.
    - A note written by `handoff`: keeps every line, and adds or replaces one line `Auto: HEAD <sha> · <n> dirty files` right after its State line, never duplicating it.
    - Writes to a temp file in `.claude/wip/` and renames it; creates the folder when missing. After rewriting a handoff note it restores the note's old modified time (`fs.utimesSync`), so the context nudge does not mistake the `Auto:` line for a handoff written in this session.
    - `tests/hooks.test.mjs`: new `describe("session-state")` using `makeProject`, `runHook` and `branchWithCommits`. Cases: note created on a feature branch with commits (correct sha, dirty count, subjects); nothing written on the base branch, on a detached HEAD and on an empty branch; handoff note keeps every line, gets one `Auto:` line, and a second run replaces it; hook-made note is rewritten with new commits; a token-like subject and file name become `<REDACTED>`; no file contents in the note; lists capped at 10; slash in the branch name becomes `-` in the path.
  - **Done when**: `node --test tests/hooks.test.mjs` passes with 0 fail and the new `session-state` cases listed in the output.

- [x] 5. Wire the events that fire
  - **What**: `plugins/dev-kit/hooks/hooks.json`: a group for each event step 1 found firing, running `session-state.mjs` with `"timeout": 10`. The `hooks.json` wiring test (`tests/hooks.test.mjs` near line 1709) gets one case that the handler exists and is under the right event.
  - **Done when**: `node --test tests/hooks.test.mjs` passes with 0 fail, and `node plugins/dev-kit/hooks/session-state.mjs` run by hand on this branch (after one commit) leaves `.claude/wip/feat-session-state-hook.md` with a State line whose sha equals `git rev-parse --short HEAD`.

- [x] 6. `session-start.mjs` reads State, says when only State is automatic, and the nudge ignores hook-made notes
  - **What**: `plugins/dev-kit/hooks/context-nudge.mjs:54-55`: a note that has the hook's Next line (hook-made) no longer counts as "a note written during this session", so the nudge still fires; a test in `describe("context-nudge")` beside the existing note case (near line 1683) covers it. `plugins/dev-kit/hooks/session-start.mjs`: `noteSha` takes the sha from the `HEAD <sha>` State line only, never from an `Auto:` line, so the stale warning still measures from when `handoff` wrote the note. When the note is hook-made (it has the `run /dev-kit:handoff for a full note` Next line), add a line under the note saying it holds only an automatic State and that `/dev-kit:handoff` writes the full note. Tests in `describe("session-start")`: a handoff note with an `Auto:` line warns from the handoff sha, not the auto sha; a hook-made note shows the new line; a handoff note shows no such line.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 fail and the three new cases listed.

- [x] 7. Docs
  - **What**: `README.md` (hooks table row for `session-state`, the `handoff` row mentions the automatic note, test totals from the real run), `docs/vision.md` (session memory hooks under Components), `CHANGELOG.md` Unreleased (the feature in the file's form, the events that fire, the new test count, "tests, not an eval, because evals on Windows cannot run Bash and the hook is not a skill", limits: only events that fire, the `Auto:` line is lost when `handoff` overwrites the note).
  - **Done when**: `grep -n "session-state" README.md docs/vision.md CHANGELOG.md` shows a hit in each of the three files, and the test totals in README and CHANGELOG equal the total printed by `node --test tests/*.test.mjs`.

- [x] 8. Checks and review
  - **What**: run the issue's acceptance checks in this session, then the `review` skill.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 fail, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` both pass, and the review reports no unresolved finding.

## Out of scope

- Letting the model run `handoff` on its own.
- Changing the note format, and any change to the context nudge beyond ignoring hook-made notes (step 6).
- An eval for the hook (see decisions).

## Decisions and assumptions

From `grill`, settled with the user and recorded in the issue file:
- A note written by `handoff` keeps its State line; the hook adds or replaces one `Auto:` line below it, so the stale warning stays true.
- No note and nothing to report (no commits since the base, no dirty files): nothing is written.
- Events are found with a probe the user runs in the desktop app; only events that fire are wired.

Chosen while planning:
- The `.gitignore` already has `.claude/wip/` (impact map), so it is not touched.
- `SECRET_CONTENT` moves to `lib.mjs` and the note path gets one helper (step 3), since this hook is the fourth user of the path rule and the second user of the patterns. No behaviour change.
- Hook tests are enough: `working-rules.md:34` asks for an eval for plugin changes, but evals on Windows cannot run Bash (precedent: #75 and #80 shipped hook tests with that reason in `CHANGELOG.md`).
- The `Auto:` line is lost when `handoff` overwrites the note; that is acceptable, since `handoff` writes a fresh State.

## Open questions

none. Settled after step 1: both `SessionEnd` and `PreCompact` fire in the desktop app and the CLI (`docs/memory/hook-events.md`), and the user chose to wire both and let the nudge ignore hook-made notes, which touches the nudge a little beyond the issue's out of scope. The hook keeps a handoff note's modified time for the same reason (step 4).
