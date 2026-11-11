# Plan skill: approval gate, out of scope, saved plans and stricter checks

## Goal

The `plan` skill produces plans the user approves before any code changes, with explicit boundaries (out of scope), recorded decisions, and checks that state the expected result. Plans are often carried out in a later session through `handoff`, so they must stand on their own, and `review` needs the scope line to check the scope axis.

## Tasks

Evals (`plugins/dev-kit/evals/`), written and run against the current skill first to get a baseline:

- [x] Tighten `plan-multi-file/graders/criteria.md`: PASS also needs an Out of scope section, each Done when check naming its expected result, the plan written to `docs/plans/` with its path given, and the response stopping for approval instead of starting work. Add `Write` to the eval's `allowed_tools`.
- [x] `plan-skip-trivial`: a one-sentence change across 3 files (a rename). Passes when the skill states the change and does not produce a full multi-step plan.

Skill (`plugins/dev-kit/skills/plan/SKILL.md`):

- [x] Description in the third person ("Breaks non-trivial work ...") and say when to skip: a change you can describe in one sentence.
- [x] Done when: the command or manual check plus the result that means it passed (for example "3 new tests pass, 0 fail").
- [x] Add an **Out of scope** list after the steps, `none` when nothing is close.
- [x] Split the end section into **Decisions and assumptions** (what was chosen and why, carried over from `grill` when it ran) and **Open questions** (only what blocks the plan).
- [x] Ban placeholders in steps ("TBD", "handle edge cases") and full implementation code in the plan.
- [x] Self-check before showing the plan: every requirement or acceptance criterion maps to at least one step.
- [x] If the work has independent parts, suggest separate plans instead of one.
- [x] Always write the plan to `docs/plans/YYYY-MM-DD-<slug>.md` and give its path, so `handoff` and a later session can pick it up. When the work has an issue, link the plan from the issue file. Replace the current "plan stays in chat" Output section. The plan file is committed with the work, and `issue start` (`skills/issue/references/start.md` step 1) lets files under `docs/plans/` through its clean-tree check.
- [x] End by showing the plan and waiting for the user's yes before implementing. While implementing, move to the next step only after the current step's check passes.

Docs:

- [x] Update `CHANGELOG.md` and the plugin version.

## Acceptance criteria

- `plan-multi-file` with the tightened criteria fails on the baseline and passes after the change. `plan-skip-trivial` passes before and after, as a guard that the heavier skill does not fire on a rename. Scores before and after are in the PR.
- `SKILL.md` stays under 40 lines.
- A plan run leaves a file in `docs/plans/` and the response names its path.
- `issue start`'s closing paragraph and the `plan` skill both wait for the user's yes before implementing.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Bite-sized 2-5 minute steps with a commit per task (superpowers style): conflicts with the rule that git writes need the user's yes, and `tdd` already covers the test-first loop.
- A rollback section: none of the reviewed sources asks for one.
- Changes to `grill`, `issue` or `handoff` beyond keeping their wording consistent with the plan skill and letting plan files through `issue start`.

## Depends on

none

## References

- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Agent Skills best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- obra/superpowers writing-plans: https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md
