# Plan: inventory across every project, with hook counts (#80)

Issue: [docs/issues/80-inventory-all-projects.md](../issues/80-inventory-all-projects.md). Branch: `feat/inventory-all-projects`.

## Goal

`scripts/inventory.mjs` counts dev-kit skill and agent uses across every project under `--projects-dir` and fills each hook's Uses from a per-repo usage log that the hooks append to when they act, so the review cadence rests on real numbers.

## Steps

### 1. Usage log helper in `plugins/dev-kit/hooks/lib.mjs`

**What**: add an exported helper that takes a hook name and a decision and appends one JSONL line `{hook, decision, date}` (`date` as `YYYY-MM-DD`) to the file at `git rev-parse --git-path dev-kit-usage`, resolved against `projectDir`. Reuse `run()` (`lib.mjs:63`) and the git-path pattern of `stop-checks.mjs:88-89`. Any failure (not a git repo, write error) is swallowed. No command, path or prompt text is written. Wire it into `package-manager-guard.mjs` (block at line 28-30) so the helper is exercised end to end, called before `process.exit(2)`.

**Done when**: `node --test tests/hooks.test.mjs` passes, with new tests in the `package-manager-guard` describe block: a block in a git project appends one line with `hook` `package-manager-guard` and `decision` `block`; an allowed command writes no file; a block in a non-git project still exits 2 with the same stderr and writes nothing.

### 2. Guards log `ask` and `block`

**What**: `safety-guard.mjs` logs inside `askOrBlock()` (366-381) and at the direct blocks (392-397, 400-403, 414-419); `pr-status-guard.mjs` logs in `deny()` (58-61). The allow paths (`safety-guard.mjs` 421, 426; `pr-status-guard.mjs` 27, 30) log nothing. What each guard blocks or asks is unchanged.

**Done when**: `node --test tests/hooks.test.mjs` passes, with new tests in the `safety-guard` describe blocks (one ask, one block, one allow with no log line) and in `pr-status-guard` (one block, one pass with no log line). All existing tests still pass unchanged.

### 3. Other hooks log when they act

**What**: `context-nudge.mjs` logs `nudge` where it prints the `systemMessage` (line 65, inside its try); `format-file.mjs` logs `format` after a prettier or eslint fix (20, 23) and `block` at 24-27; `notify.mjs` logs `notify` (line 7); `session-start.mjs` logs `fired` (line 85); `stop-checks.mjs` logs `block` at 101 and 105 and `fired` when checks ran and passed (108-109). The early exits of `stop-checks` that run no check (23, 48, 90) log nothing.

**Done when**: `node --test tests/hooks.test.mjs` passes, with one new test per hook in its own describe block asserting the logged decision in a git project.

### 4. Inventory counts every project, with a per-project table

**What**: in `scripts/inventory.mjs`, `transcriptFiles()` (84-96) reads every folder under `--projects-dir` by default; `--this-repo` keeps today's filter (this repo plus its `--` worktree folders). `countUses()` (104-135) also tallies uses per project, labelled per transcript file by the basename of the first `cwd` in the file (the cwd follows every `cd`, so a per-entry label split one project into several rows): a cwd under `<repo>/.claude/worktrees/<name>` counts as `<repo>`, a basename starting with `scratch-` counts as `scratch`, and a file with no `cwd` falls back to its folder name. Print the per-project table after the main table, only for projects with at least one use. Update the header comment (8-10) and the no-transcripts message (193). In `tests/inventory.test.mjs`, the fixtures gain a `cwd` field; the test at 159-167 moves to `--this-repo` and a new default-mode test counts the `-other` folder.

**Done when**: `node --test tests/inventory.test.mjs` passes, with new tests: default mode counts another project; `--this-repo` does not; the per-project table labels a worktree cwd as its repo, merges two `scratch-*` cwds into one `scratch` row, and contains no `/` or `\`.

### 5. Inventory reads the hook log

**What**: `scripts/inventory.mjs` resolves `git -C <root> rev-parse --git-path dev-kit-usage`, reads its lines, applies `--since` on `date`, and fills hook Uses (187, 199): the total of actions, plus `(ask N, block N)` for `safety-guard`, `pr-status-guard` and `package-manager-guard`. With no log file the cell stays `not counted`. A line above the table says hook uses cover this repo only. In `tests/inventory.test.mjs`, the test at 262-267 keeps its no-log case; new tests cover counts and the guard breakdown.

**Done when**: `node --test tests/inventory.test.mjs` passes, with new tests: a fixture log with 2 asks and 1 block for `safety-guard` shows `3 (ask 2, block 1)`; a log line before `--since` is not counted; a repo with no log shows `not counted`.

### 6. Docs

**What**: `README.md` (143 test counts, 153 inventory paragraph), `docs/vision.md` Review cadence (48), and `CHANGELOG.md` under Unreleased (one `Changed:` entry naming #80, the `--this-repo` flag, the usage log path and that `allow` is not logged). Leave historical issue files (57, 65) alone.

**Done when**: `rg -n "this repo's (Claude Code )?transcripts" README.md docs/vision.md scripts/inventory.mjs` gives 0 hits, and the README test counts match the totals printed by step 7's test run.

### 7. Checks, real run and review

**What**: no file changes; runs in this session.

**Done when**:
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` reports 0 failures.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` both pass.
- `node scripts/inventory.mjs` on this machine reads more than this repo's folders, and the `debug` and `handoff` rows show their uses from other projects (or 0 with every project counted).
- The `review` skill reports no Block.

## Coverage of the acceptance criteria

- `debug` and `handoff` counted across projects: steps 4 and 7.
- Hook rows show a count once fired: steps 1 to 3 and 5.
- A failing usage write never changes a decision: step 1 (non-git test).
- Tests pass: every step; validate: step 7.

## Out of scope

- Removing any component the new numbers flag.
- Any change to what `safety-guard` blocks or asks.
- Counting hook uses in other repos.
- Rotating or trimming the usage log.

## Decisions and assumptions

From `grill` (see the issue's Decisions): no `allow` logging; per-repo hook log; `cwd` basename labels with worktrees merged into their repo; one `scratch` row.

Chosen here:
- The helper lives in `lib.mjs` so a later hook (#84) logs with one call.
- `stop-checks` logs `fired` only when checks actually ran and passed; an early exit that ran nothing is not an action.
- Hook rows never get the `unused` flag: a guard that never had to block is not unused. Their count is shown for the review to judge.
- Worktree detection uses the `.claude/worktrees/` segment of `cwd`, which matches the folders on this machine.
- The per-project table lists only projects with at least one dev-kit use.

## Open questions

none
