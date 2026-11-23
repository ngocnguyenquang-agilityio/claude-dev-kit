# Plan: issue start routes multi-file issues through plan (#69)

## Goal

`issue start` runs the `plan` skill, or reuses a plan the issue file links, for any issue that meets `plan`'s own bar, so approved steps run in `dev-kit:implementer` instead of the main session.

## Steps

1. **`start.md` step 5 and closing paragraph**
   - What: `plugins/dev-kit/skills/issue/references/start.md`. Step 5 gets three branches, in order:
     - The issue file links a plan under `docs/plans/`: show that plan and, after the user's yes, follow `plan`'s Implement section.
     - The issue changes 3 or more files or needs several dependent steps, and the whole change does not fit in one sentence (the rename exception in `plugins/dev-kit/skills/plan/SKILL.md:3`): run the `plan` skill with the issue's tasks and acceptance criteria.
     - Otherwise: keep today's task list.
     Refer to `plan` by name; do not copy its steps. The closing paragraph says that when `plan` ran, its approval is the go-ahead, so the user is asked once.
   - Done when: `grep -c "plan" plugins/dev-kit/skills/issue/references/start.md` finds the new step 5 lines, `grep -n "one sentence" plugins/dev-kit/skills/issue/references/start.md` finds 1 hit, and `node --test tests/hooks.test.mjs tests/inventory.test.mjs` reports 398 pass, 0 fail.

2. **Eval `issue-start-plan`**
   - What: new folder `plugins/dev-kit/evals/issue-start-plan/` with the layout of `plan-implementer-dispatch`:
     - `case.yaml`, schema 1.1, `scaffold_script: fixture.sh`.
     - `fixture.sh`: a small JS project in git on branch `feat/<slug>`, and `docs/issues/12-<slug>.md` whose tasks touch at least 4 files. `docs/issues/` must exist so `issuesDir` is detected (`plugins/dev-kit/hooks/lib.mjs:250`).
     - `prompt.md`: `allowed_tools: [Read, Glob, Grep, Skill, Agent, Write]`. Asks in plain words to start issue 12, and says the branch is already created and checked out and that there is no shell, so the git and `gh` steps are skipped.
     - Graders:
       - `skill-fired.md`: `Skill` matching `dev-kit:issue`.
       - `plan-fired.md`: `Skill` matching `dev-kit:plan`.
       - `plan-written.md`: `Write` matching `docs.{1,2}plans`.
   - Done when: the folder holds those 6 files, and `claude plugin validate --strict plugins/dev-kit` passes.

3. **Eval `issue-start-small`**
   - What: new folder `plugins/dev-kit/evals/issue-start-small/` with the same layout.
     - The issue file asks for a one-sentence rename across 3 files.
     - Graders:
       - `skill-fired.md`: `dev-kit:issue`.
       - `no-plan.md`: `Skill` matching `dev-kit:plan`, `min: 0`, `max: 0`, in the form of `plan-skip-trivial/graders/no-agent.md`.
   - Done when: the folder holds those 5 files, and `claude plugin validate --strict plugins/dev-kit` passes.

4. **Docs**
   - What:
     - `README.md:46` (issue row): say `start` hands multi-file issues to `plan`.
     - `README.md:144` (evals paragraph): add both cases. `README.md:150`: add `issue-start-*` to the `--scaffold` list.
     - `CHANGELOG.md`: add an entry under `## Unreleased`.
     - `docs/issues/69-issue-start-plan.md`: link this plan.
   - Done when: `grep -c "issue-start-plan\|issue-start-small" README.md` is at least 1, and `grep -n "#69" CHANGELOG.md` finds 1 entry.

5. **Run the evals and checks** (main session, no file edits beyond eval results recorded in CHANGELOG)
   - What:
     - `claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --case issue-start-plan`, then the same with `--case issue-start-small`.
     - `node scripts/inventory.mjs`.
     - `node --test tests/hooks.test.mjs tests/inventory.test.mjs`.
     - `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .`.
   - Done when: each eval passes 3 of 3, the inventory lists `issue` with 5 evals, the tests show 0 fail, and both validations pass.

6. **Review**: run the `review` skill on the branch. Done when it reports no Block or Should fix item left open.

## Out of scope

- `issue fix`, `debug` and `review` stay in the main session (#63). `fix.md` reuses only steps 1 to 4 of `start.md`.
- No change to the `implementer` agent, to `plan`'s Implement section or to `handoff`.
- No eval that checks the main session runs each Done when check (`Bash` cannot be granted to evals on Windows).

## Decisions and assumptions

- The eval prompts say the branch exists and there is no shell. Evals on Windows refuse `Bash`, so steps 1 to 4 of `start.md` (git and `gh`) cannot run there; this way the case reaches step 5.
- No `llm` grader in either case. The judge sees only the final reply, and #63 dropped such a grader for that reason; the `tool_used` graders are the evidence.
- `issue-start-plan` does not check that the implementer runs: the plan waits for the user's yes, and that path is already covered by `plan-implementer-dispatch`.
- `start.md` keeps `plan`'s one-sentence rename exception, so a 3-file rename stays on the task list. This matches `plan-skip-trivial`.

## Open questions

none
