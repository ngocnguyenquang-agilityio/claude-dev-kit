# Debug skill: gates, escalation and behavior evals

## Goal

The `debug` skill follows Anthropic's skill authoring best practices and holds the rules its callers now repeat: it gates each step, says what to do when a fix fails, gives concrete tracing techniques, and has evals that grade how it debugs, not only whether it fires.

## Tasks

Should fix:

- [x] Add step gates to `plugins/dev-kit/skills/debug/SKILL.md`: go to step 2 only when the loop shows the symptom (red); go to step 3 only after stating the root cause in one sentence.
- [x] Remove the rules the callers restate, keeping each step's own check:
  - `plugins/dev-kit/skills/issue/references/fix.md` step 3: drop "build one command that shows the symptom, then find the cause. Do not patch the symptom." Keep "Use the `debug` skill" and "State the root cause in one sentence before changing code" as the step's check.
  - `plugins/dev-kit/skills/pr-followup/references/ci.md` step 4: drop "A flaky test is a cause to fix or isolate, not a reason to re-run until green." once the debug skill says it. Steps 3 and 5 stay: they are CI-specific (reproduce locally, run every check).
- [x] Add a failed-fix rule: if the loop is still red after a fix, revert that attempt and return to step 2; do not stack fixes. After 3 failed fixes, stop, question the design and ask the user before trying again.
- [x] Move the detail of step 2 into `plugins/dev-kit/skills/debug/references/tracing.md`, linked from SKILL.md: read the full error and stack trace, check recent changes (`git log`, `git diff`), trace bad data backward to where it is created and fix there, log values at each component boundary in multi-part systems, and what to do when no cause is found (record what was tried, add logging, report to the user).
- [x] Make the regression test order explicit: if the loop is a test, it is the regression test; otherwise turn the loop into a failing test before fixing. Point to the `tdd` skill.
- [x] Strengthen the evals under `plugins/dev-kit/evals/`. Cases cannot use shell tools on Windows (README "Test" section), so graders check the response and the edits only:
  - Extend `debug-root-cause/graders/criteria.md` with two checks: the root cause is stated in one sentence before the fix, and a regression test is added or the existing failing test is named as the regression test.
  - Add at least two cases: a symptom that cannot be reproduced from the repo (should ask for logs or access, not fix blind) and a flaky test (should propose raising the reproduction rate and a condition wait, not re-running until green).
  - Run the debug cases and confirm the `debug` skill fires in each (`skill-fired` grader). If it does not, find out why before closing; the latest saved results under `evals/results/` cover only `grill-vague-request`.
- [x] Update the eval paragraph in `README.md` ("Test" section) if the cases, tools or run command change.

Judgement calls (decide during planning):

- [x] A short "red flags" list (3-4 lines, e.g. "just try X and see", "one more fix attempt", several changes at once) instead of a full rationalization table.
- [x] A flexible output template: Symptom, Loop command, Root cause, Fix, Regression test, Not verified.
- [x] One line for flaky bugs: wait on a condition instead of a fixed `sleep`.
- [x] Description in third person ("Finds root causes...").
- [x] Keep the name `debug`; do not rename to `debugging` (breaks `dev-kit:debug` references).

## Acceptance criteria

- SKILL.md states both gates, the failed-fix rule with the 3-attempt stop, and the regression test order, and stays under 500 lines.
- `references/tracing.md` exists, is linked directly from SKILL.md, and covers the five techniques above.
- The sentences listed in the second task are gone from `fix.md` and `ci.md`; the kept step checks are still there.
- At least three debug eval cases exist. `claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit --ablation none` passes every grader on them, including `skill-fired`. A run with the default no-plugin baseline fails `criteria` on at least one of them. Both results are noted in the PR.
- Each judgement-call item is either done or closed with a reason in the PR.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

none
