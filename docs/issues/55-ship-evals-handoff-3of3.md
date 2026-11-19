# Evals for ship and a 3-of-3 bar for handoff-basic

## Goal

Pillars 1 and 2. Roadmap item 3 in `docs/vision.md` says each of `handoff` and `ship` has one eval that passes 3 of 3 runs. `handoff` has three cases from #47, but `handoff-basic` only had to pass 2 of 3. `ship` has none, so a made-up check result or a command that really runs `git commit` would go unnoticed.

## Tasks

- [x] Add eval `ship-commit` under `plugins/dev-kit/evals/`: the answer is a drafted commit message plus the commands for the user to run; the issue number comes from the argument (`commit 12`), because reading it from the branch needs `kit-config.mjs`, and evals on Windows have no shell; checks are reported only as the config and the session show them
- [x] Grade the answer text and the run's evidence, not `skill-fired`: `ship` has no `!` injection but evals on Windows refuse shells, so the case must not rely on running commands
- [x] Add a grader that the run never executes `git add`, `git commit`, `git push` or `gh pr create`; the commands are only shown. It cannot fail while `Bash` is not granted, so the real evidence is the reply check in `criteria.md`
- [x] Tighten `handoff-basic` until it passes 3 of 3 runs (grader wording or a `SKILL.md` rule, whichever the failing runs point to): it passed 3 of 3 with no change, so nothing was tightened
- [x] Run `ship-commit` and `handoff-basic` 3 times each with `claude plugin eval plugins/dev-kit --case <name> --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet`
- [x] Update the eval list in `README.md`, the roadmap item 3 line in `docs/vision.md` and `CHANGELOG.md`

## Acceptance criteria

- `ship-commit` and `handoff-basic` each pass 3 of 3 runs.
- A reply that says it staged, committed or pushed fails the `ship-commit` case. A real `Bash` call to a git write command fails it too, but only when `Bash` is granted; the case does not grant it.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- An eval for `ship pr` mode.
- Evals for `issue finish` or `review`.
- Baseline run of `grill` with the skill off (A23) and the inventory script: separate issues.
- A pre-PR rule line about the index status cell: separate issue.
- Changing `ship`'s behavior beyond what a failing run proves needs fixing.

## Depends on

none
