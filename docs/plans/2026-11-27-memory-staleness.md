# Plan: memory staleness (#85)

Issue: [docs/issues/85-memory-staleness.md](../issues/85-memory-staleness.md)

## Goal

SessionStart flags memory that points at files which no longer exist, and `issue finish` asks what durable fact the work taught, so memory stays both true and fed.

## Steps

- [x] 1. Stale-memory check in the SessionStart hook
  - **What**: `plugins/dev-kit/hooks/session-start.mjs`, after the index is read (line 49-59). Add a small function that (a) collects markdown links `[text](target)` in the index, resolves each target against `docs/` (index links are relative to `docs/`, e.g. `memory/skill-evals.md`), and names the ones whose file is missing; (b) for each topic file that exists, collects backticked tokens that contain a `/` and end in a file extension, and names the ones that do not exist relative to the project root. Output is a `> Stale memory:` warning block placed under the index heading, like the existing size warning; nothing is added when every link and path exists. Skip tokens containing spaces, `*`, `<`, `>` or a URL scheme (globs, placeholders such as `docs/memory/<topic>.md`, links).
  - **Done when**: `node --test tests/hooks.test.mjs` still passes with 0 fail (new tests come in step 2), and running the hook by hand in this repo (`node plugins/dev-kit/hooks/session-start.mjs`) prints no `Stale memory` line, since the repo's own memory is current.

- [x] 2. Hook tests
  - **What**: `tests/hooks.test.mjs`, in `describe("session-start")` beside the memory tests (line ~905), using `makeProject` and `runHook`. Cases: a missing topic file linked from the index is named; a backticked path in a topic file that does not exist is named; a path that exists, a path with no `/`, a path with no extension, a placeholder such as `docs/memory/<topic>.md` and a URL are not named; silent (no `Stale memory`) when every link and path exists; still silent when there is no `docs/memory.md`.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 fail and the new cases listed in the output.

- [x] 3. Memory step in `issue finish`
  - **What**: `plugins/dev-kit/skills/issue/references/finish.md`. Insert a new step 3 "Memory" before Review: write any durable fact the work taught (a decision, a gotcha, a correction from the user) to `docs/memory/<topic>.md` and one line in `docs/memory.md`, following the working rules, or say there is none; never write secrets. Renumber Review to 4, Status docs to 5, Report to 6; update the cross references (`skip step 4` and `step 4 ticks` become step 5; `don't repeat step 2` stays). The Report lists the memory written or "no durable fact". The new memory files ride in the same commit, so the `git add` paths include them.
  - **Done when**: `grep -n "step 4" plugins/dev-kit/skills/issue/references/finish.md` shows 0 stale references (every "step" number points at the right step), and the file reads in order 1 to 6.

- [x] 4. Eval `issue-finish-memory`
  - **What**: new folder `plugins/dev-kit/evals/issue-finish-memory/`, modelled on `memory-cross-session` and `issue-start-small`: `case.yaml` (`scaffold_script: fixture.sh`), `fixture.sh` (git repo on a `feat/...` branch, an issue file with all tasks done, a diff that carries a gotcha worth keeping, the `docs/memory.md` index and one topic file), `prompt.md` (finish this issue; allowed tools include Write and Edit, enough turns), `graders/topic-written.md` (`tool_used` Write or Edit with `input_match` on a path under `docs/memory/`). Optional `graders/criteria.md` is left out unless the tool_used grader proves too loose.
  - **Done when**: `claude plugin eval` for `issue-finish-memory` with the `sonnet` judge, `--ablation none`, `--scaffold` passes 3 of 3 runs; the exact command comes from `docs/memory/skill-evals.md`. If it cannot run here, the step is reported "not verified", not ticked.

- [x] 5. README and CHANGELOG
  - **What**: `README.md` (memory paragraph near line 116: SessionStart also flags stale topic files; the `issue` row near line 46 if it lists what finish does; the test count near line 139-142) and `CHANGELOG.md` Unreleased (the feature, the new eval, the new test count in the same form the file uses now). The counts come from the real `node --test` output, not from the old numbers.
  - **Done when**: `grep -n "stale" README.md CHANGELOG.md` shows the new text, and the test count in both files equals the total printed by `node --test tests/*.test.mjs`.

- [x] 6. Checks and review
  - **What**: no file edits. Run `node --test tests/hooks.test.mjs tests/inventory.test.mjs`, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .`; then the `review` skill. Tick the issue's tasks only when `issue finish` runs.
  - **Done when**: all three commands exit 0 and review has no Block or Should fix items open.

## Acceptance criteria map

- SessionStart names a stale path and is silent otherwise: steps 1, 2.
- `issue-finish-memory` passes 3 of 3: steps 3, 4.
- Test command passes: steps 2, 6.
- Both strict validations pass: step 6.

## Out of scope

- Deleting or rewriting stale facts automatically.
- Any change to the memory secret check in `safety-guard`.
- Edits to `docs/plans/` or issue files of other changes that mention "steps 2 and 3".

## Decisions and assumptions

- Index links resolve against `docs/`, because that is how `docs/memory.md` writes them; backticked paths resolve against the project root.
- The check only reports, and runs on topic files that exist. A missing topic file is reported once as a missing link, not as stale paths.
- Placeholders, globs and URLs are skipped so the rule files' own `docs/memory/<topic>.md` mention never warns.
- The new finish step goes before Review so memory files are part of the diff the reviewer sees.
- `.github/workflows/evals.yml` and `ci.yml` pick up the new eval and tests with no edit; `tests/inventory.test.mjs` needs no edit, only the real inventory count changes.

## Open questions

- The eval and validate commands are taken from `docs/memory/skill-evals.md`; step 4 reads it first. If `claude plugin eval` is unavailable in this environment, 3 of 3 stays unverified.
