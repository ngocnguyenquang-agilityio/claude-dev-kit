# Re-run the grill baseline and tighten grill-pushback

## Goal

Pillar 1 (quality workflow). Audit point A23 says the `grill` score of 1.0 has no baseline. PR #24 did record one (3 runs each: `grill-repo-fact` 1.00 with the skill and 0.00 without, `grill-vague-request` 0.67 and 0.00, `grill-pushback` 1.00 and 0.67), but only in the PR text, and before the last skill change. The weak spot is `grill-pushback`: it still passes 2 of 3 runs with no skill, so it barely shows what the skill adds. Record a fresh baseline in the repo and make that case fail without the skill.

## Tasks

- [x] Run the three `grill` cases with the default no-plugin comparison (leave out `--ablation none`) and with `--ablation none`, 3 runs each, `--judge-model sonnet`: `claude plugin eval plugins/dev-kit --case 'grill-*' --scaffold --allow-tools Edit`
- [x] Note the with-skill and no-skill score of each case in `CHANGELOG.md`, with the run counts and the judge model
- [x] Read the no-skill runs of `grill-pushback` that passed and name what they do that `plugins/dev-kit/evals/grill-pushback/graders/criteria.md` accepts
- [x] Tighten that grader on what only the skill does (for example the options are lettered with `(Recommended)` on the first, at most 4 questions in the round, no plan or implementation steps), without failing the with-skill runs: it passed 5 of 6 runs with the skill (the default lot 2 of 3, the `--ablation none` lot 3 of 3) and 0 of 6 without, so the criterion "3 of 3 with the skill" held only in the second lot; `grill-vague-request` also needed a fixture (its folder was empty)
- [x] Re-run `grill-pushback` 3 times with the skill and 3 without; the no-skill score must be below the with-skill score
- [x] Remove A23 from `docs/audit-backlog.md` and add it to the "Done since the audit" line

## Acceptance criteria

- The CHANGELOG lists the with-skill and no-skill score for each of the three `grill` cases, from runs made on the current skill.
- `grill-pushback` passes 3 of 3 runs with the skill and fails at least 1 of 3 without it.
- The other two `grill` cases keep their with-skill score of at least 0.67 and their no-skill score below it.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Changing the `grill` skill itself, unless a tightened grader shows a real gap in it.
- Baselines for the other skills' evals.
- The `AskUserQuestion` path, which non-interactive evals cannot exercise.
- The pre-PR rule line: a separate issue.

## Depends on

none
