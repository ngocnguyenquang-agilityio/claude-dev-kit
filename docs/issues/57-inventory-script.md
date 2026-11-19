# Inventory script for the review cadence

## Goal

Pillar 1 (quality workflow), and the review cadence in `docs/vision.md`: before every minor release, check how often each component was used and which have an eval, then remove what is unused or unproven. Today that is done by hand, so it is easy to skip. One script prints the table.

## Tasks

- [ ] Add `scripts/inventory.mjs`, plain Node with no dependencies, run as `node scripts/inventory.mjs`
- [ ] List the components from the files: skills (`plugins/dev-kit/skills/*`), agents (`plugins/dev-kit/agents/*.md`) and hooks (`plugins/dev-kit/hooks/*.mjs` that `hooks.json` registers)
- [ ] Count skill and agent use from this project's Claude Code transcripts (`~/.claude/projects/<project>/*.jsonl`): `Skill` and `Agent` tool calls by name, plus the slash-command forms, over all sessions or a `--since <date>` window
- [ ] Mark which skills and agents have an eval case under `plugins/dev-kit/evals/` (by `input_match` and by case name prefix); for hooks, count the tests in `tests/hooks.test.mjs` that name them
- [ ] Print one table: component, kind, uses, evals or tests, and a flag `unused` or `unproven` when uses is 0 or there is no eval or test
- [ ] Read only tool names and counts from the transcripts; never print or store a prompt, a reply or a path from them. If the transcript folder is missing, say so and still print the eval and test columns
- [ ] Add tests in `tests/inventory.test.mjs` with a small transcript fixture: counts per component, `--since` window, a component with no eval is flagged, missing folder
- [ ] Mention the script in `docs/vision.md` (review cadence), `README.md` and `CHANGELOG.md`

## Acceptance criteria

- On this repo it lists all 7 skills, 2 agents and every registered hook, each with a count and an eval or test column.
- A component with no `Skill`, `Agent` or slash-command call in the window shows `unused`; one with no eval or test shows `unproven`.
- Hook use is not counted from transcripts (a hook leaves no tool call); the table says "not counted" for the uses of a hook instead of showing 0.
- The output holds no text from any transcript beyond component names and numbers.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Deleting or changing any component the table flags; that is a decision for the review before each minor release.
- The `grill` baseline run (A23) and the pre-PR rule line: separate issues.
- Other users, other projects and other stacks.
- A new skill, agent or hook: this is a repo script, not a component, so the eval gate does not apply; the tests are its evidence.
- Hook usage counts (no data in transcripts).

## Depends on

none
