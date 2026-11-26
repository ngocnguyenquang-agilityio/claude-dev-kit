# Inventory: count uses across every project and count hook decisions

## Goal

Pillar 1 (quality workflow), review cadence. `scripts/inventory.mjs` reads only this repo's transcript folder (6 files), so it flags `debug` and `handoff` as `unused` while the kit is also enabled in other projects under `~/.claude/projects`; hooks show `not counted`. Count real use across every project and count hook decisions, so "remove what is unused" in `docs/vision.md` rests on real numbers.

## Tasks

- [ ] `scripts/inventory.mjs`: read `dev-kit:*` `Skill`, `Agent` and slash-command calls from every folder under `--projects-dir`, not only this repo's; add a `--this-repo` flag for the old behavior
- [ ] Print uses per project as a second table, labelled by the last segment of the project path only, so the header's promise that no path is printed still holds; no transcript text
- [ ] Hooks: append one line per decision (`hook`, `decision` such as allow/ask/block/nudge, date) to the file at `git rev-parse --git-path dev-kit-usage`; never the command, path or prompt text. A hook added later (such as #84's) logs the same way
- [ ] `scripts/inventory.mjs`: read that file for `--root` and fill the hook rows' Uses, with `ask` and `block` counts for the guards
- [ ] Tests in `tests/inventory.test.mjs` and `tests/hooks.test.mjs`; `README.md`, the Review cadence in `docs/vision.md` and the header of `scripts/inventory.mjs` (both say "this repo's transcripts"), and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Run on this machine, `debug` and `handoff` show their uses from other projects, or still 0 with every project counted.
- Each hook row shows a count instead of `not counted` once that hook has fired in this repo.
- A failing usage write never changes a hook's decision.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Removing any component the new numbers flag; that is the review cadence's decision.
- Any change to what `safety-guard` blocks or asks. Edit it in small runnable steps (A25).

## Depends on

none

## Decisions

Settled in a `grill` round on 2026-11-26.

**Decisions**

- Hooks log only when they act: `ask` and `block` for the guards, `nudge` for context-nudge, `format` for format-file, `notify`, and one `fired` line for session-start and stop-checks. `allow` is never logged, so the hot path of `safety-guard` writes nothing.
- The hook log stays per repo at `git rev-parse --git-path dev-kit-usage`. Inventory reads only the `--root` log and its header says hook uses cover this repo only, while skill and agent uses cover every project.
- Per-project labels are the basename of the `cwd` read from the transcript. A worktree folder (`--claude-worktrees-`) is merged into its parent repo.
- Desktop scratch workspaces (`scratch-*`) are counted, merged into one `scratch` row.

**Assumptions**

- One JSON object per line (JSONL): `{hook, decision, date}` with `date` as `YYYY-MM-DD`. No rotation; `--since` filters by date.
- Outside a git repo, or when the write fails, the hook skips the write silently and its decision is unchanged.
- A hook's Uses cell shows the total of its actions; guards add a breakdown, for example `12 (ask 9, block 3)`.
- `--this-repo` keeps the current folder filter: this repo and its worktrees.
- A transcript with no `cwd` falls back to its folder name as the label.

**Out of scope**

- Removing any component the new numbers flag.
- Any change to what `safety-guard` blocks or asks.
- Counting hook uses in other repos.

**Open risks**

- Hook Uses and skill Uses differ in scope; readers rely on the header line to tell them apart.
- Each logged action spawns `git` once to find the log path. The cost only applies when a hook acts.
