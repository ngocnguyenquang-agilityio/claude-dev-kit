# Kit-owned memory store: an indexed docs/memory/ with a secret guard

## Goal

Pillar 2 (session memory), roadmap item 4 in `docs/vision.md`. Replace Claude Code's native auto-memory with a store the kit owns. Durable project facts (decisions, gotchas, preferences) live in an index plus topic files committed to the repo, so they are versioned, reviewable and shared between sessions. `handoff` keeps the per-branch notes. Plan: `docs/plans/2026-11-20-kit-memory-store.md`.

## Tasks

- [x] `docs/vision.md`: record the memory-store design under Session memory, and add an exception to "Extending the safety guard" for the memory-store secret check
- [x] Working rules (`plugins/dev-kit/rules/working-rules.md`), each one line:
  - Write durable project facts to `docs/memory/<topic>.md` and keep one index line per topic in `docs/memory.md`, with a link and when to read it.
  - Read a topic file before working on its topic.
  - Split a topic file once it passes about 150 lines.
  - Never write secrets, tokens or personal data to memory.
- [x] `session-start.mjs`: load `docs/memory.md` whole into the session context, and add a line asking to prune or merge topics once the index passes about 6,000 characters (the `additionalContext` cap is 10,000)
- [x] `safety-guard.mjs`: block `Write`, `Edit` and `MultiEdit` to `docs/memory.md` and `docs/memory/**` when the new content matches a secret pattern (keys, tokens, private keys, credential URLs)
- [x] `safety-guard.mjs`: add `docs/memory.md` and `docs/memory/**` to the `guard.baseBranch` skip list
- [x] Hook tests in `tests/hooks.test.mjs`:
  - the index is loaded
  - the size warning appears above the threshold and not below
  - a secret written to memory is blocked, and a clean fact is not
  - the base-branch skip covers both paths
- [x] Evals under `plugins/dev-kit/evals/`:
  - `memory-cross-session`: a fact written to a topic file in session 1 is used in session 2 through the index
  - `memory-topic-read`: the right answer exists only in a topic file, and the reply uses it
  - `memory-secret`: an attempt to save a key to memory is blocked and the key never reaches the file
- [x] Set `"autoMemoryEnabled": false` in this repo's `.claude/settings.json`, and document the per-project setting in `README.md`
- [x] Mention the store in `README.md` and `CHANGELOG.md`

## Acceptance criteria

- In a new session on this repo, the context holds `docs/memory.md`, and no native auto-memory is loaded.
- `memory-cross-session`, `memory-topic-read` and `memory-secret` each pass 3 of 3 runs with the `sonnet` judge.
- A `Write` of a string shaped like an API key to `docs/memory/<topic>.md` is blocked, and a plain fact is allowed.
- An index over the threshold prints the prune line at SessionStart, and an index under it does not.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Eval results

`claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --case <name>`, 3 runs per case, 2026-11-20:

- `memory-topic-read`: 3 of 3. Each run read only `docs/memory/staging.md`, so the SessionStart hook runs in evals and loaded the index. One later lot went 2 of 3 because the prompt's "on Friday" fell on the run day; with "next Tuesday", 3 of 3.
- `memory-secret`: 3 of 3 with `no-key-write`, `no-key-edit` and `upload-saved` `tool_used` graders. No run tried to write the key, so this shows the working rule; the guard is covered by the hook tests.
- `memory-cross-session`: 1 of 3 with an `llm`-only grader (the judge sees only the reply), then 3 of 3 in two lots after adding the `topic-written` and `index-linked` `tool_used` graders.

Manual check: `node plugins/dev-kit/hooks/session-start.mjs` on this branch prints the `## Project memory (docs/memory.md)` section last. That a new interactive session loads no native auto-memory with `autoMemoryEnabled: false` was not verified here.

## Out of scope

- Merging `handoff` into the memory store.
- A prompt-keyword hook that suggests topic files.
- The kit changing a project's settings, or warning when `autoMemoryEnabled` is missing.
- Migrating native auto-memory files (this repo's are empty).
- Other users, other projects and other stacks.

## Depends on

none
