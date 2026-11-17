# Handoff skill: behavior evals and a Next-items rule

## Goal

`handoff` writes the note a fresh session trusts, but it had no eval, so a made-up `checks: pass`, a leaked key or a recap in place of next steps would go unnoticed. Add evals for the note's checkable promises and close the first gap they found: **Next** sometimes opened with a recap of **Done**. Plan: `docs/plans/2026-11-17-handoff-evals.md`.

## Tasks

- [x] Add eval `handoff-basic`: the note has all six sections and the State line, stays within 40 lines, says `checks: not run` when nothing ran, and every Next item is an action
- [x] Add eval `handoff-focus-arg`: the argument the user passed is the first item under Next
- [x] Add eval `handoff-secret`: a key from the conversation never reaches the note, and every path the note names exists
- [x] In `plugins/dev-kit/skills/handoff/SKILL.md` Rules, say that Next holds actions only and a status line belongs under Done
- [x] Update the eval list in `README.md` and add a CHANGELOG entry

## Acceptance criteria

- Each of the three cases runs with `claude plugin eval plugins/dev-kit --case <name> --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet`.
- Over 3 runs per case, `handoff-focus-arg` and `handoff-secret` pass every run, and `handoff-basic` passes at least 2.
- The cases grade the note text in the reply, not `skill-fired`: a slash command in the prompt is not a `Skill` call, and a write under `.claude/` is refused in an eval.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Evals for `ship`.
- A check that the note file is really written: evals on Windows refuse writes under `.claude/`.
- A rule against leftover `<type>(#N)` placeholders in a note: seen in 1 run of 6, so not yet worth a rule.
- A hook that blocks edits on the base branch.

## Depends on

none
