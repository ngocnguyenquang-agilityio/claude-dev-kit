# Plan: eval history, record pass rates per case and compare with a baseline (#82)

Issue: [docs/issues/82-eval-history.md](../issues/82-eval-history.md). Branch: `feat/eval-history`.

## Goal

A script `scripts/eval-history.mjs` records each `claude plugin eval` report as one JSON line per case in `docs/evals/history.jsonl` and compares a case's pass rate at a base ref with its newest record and with all its runs pooled, so a skill change can be judged against its baseline and flaky cases stand out.

## Steps

- [x] 1. `record` subcommand
  - **What**: new `scripts/eval-history.mjs` in the style of `scripts/inventory.mjs` (`node:` imports, a header comment with the usage lines, `option(name, fallback)` on `process.argv`, root from `import.meta.url`, `--root` override, git through `spawnSync("git", ["-C", root, ...])` with the status checked as at `inventory.mjs:196-198`). `record <report.json>` reads an `aggregate-result.json` and appends, for each `cases[]` entry with at least one run in `arms.with`, one line `{"date","commit","case","runs","passes","judge","ablation"}`: `date` is the day of the report's `startedAt` (YYYY-MM-DD), `commit` is `git rev-parse HEAD` or the `--commit <ref>` value resolved to a full hash, `case` is `cases[].name`, `runs` is `arms.with.length`, `passes` counts runs with `passed === true`, `judge` is `suite.judgeModel`, `ablation` is `suite.ablation`. The history file defaults to `docs/evals/history.jsonl` under the root (created with its folder when missing); `--history <path>` overrides it. Lines end with `\n`. It prints `Recorded <n> cases to <path>`. A missing or unreadable report, or one without `cases`, exits 1 with a message. New `tests/eval-history.test.mjs` (pattern of `tests/inventory.test.mjs`: temp dirs under `os.tmpdir()`, a `git init -q` repo with one commit, the script spawned with `spawnSync`, cleanup in `after()`) with a report-shaped fixture of two cases (one 2 of 3, one 3 of 3) built in the test.
  - **Done when**: `node --test tests/eval-history.test.mjs` passes with tests that: recording the fixture appends exactly 2 lines with the expected fields and values; recording twice gives 4 lines; `--commit` stores that commit's full hash; a missing report file exits 1 and writes nothing.

- [x] 2. `compare` subcommand
  - **What**: `compare [--base <ref>]` in the same script, base default `main`. The ref is resolved with `git rev-parse --verify --end-of-options <ref>^{commit}`; an unknown ref exits 1 with a message. History lines are read splitting on `\r?\n` and skipping blank lines. For each case in the history, in first-seen order: base = the last record whose commit is the base commit or an ancestor of it (`git merge-base --is-ancestor`, one call per distinct commit); newest = the last record; pooled = summed passes over summed runs of all records. Prints a Markdown table `| Case | Base | Newest | All runs |`, each cell as `passes/runs (NN%)`, and `n/a` where the base side has no record. An empty or missing history prints `No eval history at <path>` and exits 0.
  - **Done when**: `node --test tests/eval-history.test.mjs` passes with new tests in a repo of two commits A then B: records at A and at B give Base from A when `--base A` and Newest from B; a case recorded only at B shows `n/a` for Base; the All runs cell sums both records (e.g. `5/6 (83%)`); `--base nope` exits 1; a missing history prints the no-history line.

- [x] 3. CI runs the new tests
  - **What**: `.github/workflows/ci.yml:24`, append `tests/eval-history.test.mjs` to the `node --test` command. Keep the file's CRLF line endings.
  - **Done when**: `rg -n "eval-history.test.mjs" .github/workflows/ci.yml` shows 1 hit on the `node --test` line.

- [x] 4. Docs
  - **What**: `README.md`: the test command block (139-141) gains the new file, the test counts at 143 match step 5's run, and the evals paragraph (145-151) says to record each report with `node scripts/eval-history.mjs record <plugin>/evals/results/<timestamp>/aggregate-result.json` and to compare with `node scripts/eval-history.mjs compare --base main`. `docs/memory/skill-evals.md`: one bullet saying results are recorded with the script after each eval run and compared against the base, instead of prose counts only. `CHANGELOG.md`: one `Added:` entry at the top of Unreleased naming #82.
  - **Done when**: `rg -n "eval-history" README.md docs/memory/skill-evals.md CHANGELOG.md` shows at least one hit in each file.

- [x] 5. Checks, real report and review
  - **What**: no file changes. Record one real local report (the newest `plugins/dev-kit/evals/results/*/aggregate-result.json`) into a scratch history file with `--history`, then run `compare` against it; run the acceptance commands; run the `review` skill.
  - **Done when**: the real report adds as many lines as its `cases` array has entries with runs, and `compare` prints one row per case; `node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs` passes with 0 failures; `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass; `review` reports no blocking findings.

## Out of scope

- Running evals in CI (#81) and backfilling past CHANGELOG results into the history.
- Showing pass rates in `scripts/inventory.mjs`.
- Committing a history line from the existing local reports: they were run on earlier commits, and recording them now would be a backfill.

## Decisions and assumptions

- The input is the saved `aggregate-result.json` (all 33 local reports share one shape, `schemaVersion: 1`); `--json` output is assumed to be the same run result.
- Only the `with` arm is recorded. No local report has a `without` arm, so its shape is unverified; the `ablation` field still says which mode ran, so a later change can add the baseline arm.
- A run that errored counts as a failed run, as the report's own `passed` says.
- `commit` is the checkout at record time (or `--commit`), not read from the report, which has no commit field. Commit the change the eval ran on, then record: `record` refuses uncommitted changes unless `--commit REF` names the commit (added after review).
- Base means the last record at the base commit or any ancestor of it, not only that exact commit, so records from a merged branch count as the base and a base with no record of its own still finds the one before it.
- Tests spawn the script, as `tests/inventory.test.mjs` does, so the script needs no exports.
- The script lives in `scripts/` and does not import `plugins/dev-kit/hooks/lib.mjs`, matching `inventory.mjs`.

## Open questions

none
