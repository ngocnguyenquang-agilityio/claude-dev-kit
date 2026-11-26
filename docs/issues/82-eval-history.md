# Eval history: record pass rates per case and compare with a baseline

## Goal

Pillar 1 (quality workflow). Eval results live only as prose in `CHANGELOG.md` ("2 of 3, then 3 of 3"), and the kit says each time that three runs show a direction, not a rate. Keep a machine-readable history per case and commit, so a skill change can be compared with its baseline and flaky cases stand out.

## Tasks

- [x] `scripts/eval-history.mjs record <report.json>`: append one line per case to `docs/evals/history.jsonl` with the date, commit, case, runs, passes, judge and ablation
- [x] `scripts/eval-history.mjs compare [--base <ref>]`: per case, the pass rate of the latest record at the base against the newest record, plus all runs pooled per case
- [x] Tests in `tests/eval-history.test.mjs` with a report-shaped fixture; add the file to the test command in `.github/workflows/ci.yml`
- [x] `README.md` (evals paragraph) and `docs/memory/skill-evals.md`: record results with the script; `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Recording one real `claude plugin eval` report adds one line per case.
- `compare` prints every case with both rates, and `n/a` where one side has no record.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Running evals (#81) and backfilling past CHANGELOG results.
- Showing pass rates in `scripts/inventory.mjs`.

## Depends on

none

## Plan

[docs/plans/2026-11-26-eval-history.md](../plans/2026-11-26-eval-history.md)
