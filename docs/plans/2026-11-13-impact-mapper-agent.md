# Plan: impact-mapper agent for the plan skill

## Goal

A read-only `impact-mapper` agent (Read, Grep, Glob) finds the files a described change affects and the code it can reuse, and the `plan` skill calls it at step 2 instead of reading code itself, backed by an eval that fails on the current `plan` and passes after the change.

## Reuse

- Agent layout and frontmatter: `plugins/dev-kit/agents/reviewer.md` (read-only wording, report levels), `plugins/dev-kit/agents/ui-verifier.md` (short tool list).
- Eval layout: `plugins/dev-kit/evals/plan-multi-file/` (`prompt.md`, `graders/criteria.md`, `graders/skill-fired.md`) and `plugins/dev-kit/evals/plan-skip-trivial/` (`case.yaml`, `fixture.sh` scaffold of a small JS app with a rename).
- Baseline method from #35 and #37: copy the plugin to the scratchpad and overwrite files with `git show main:<path>`; run `claude plugin eval <plugin> --scaffold --allow-tools Edit Write --ablation none --case <name>`.
- Docs to update, same as 0.8.0: `CHANGELOG.md`, `plugins/dev-kit/.claude-plugin/plugin.json` version, `README.md` (Agents line, `plan` row, eval list).

## Steps

1. **Write the fixture and the failing eval, no skill or agent change yet.**
   What: new case `plugins/dev-kit/evals/plan-impact-mapper/` with `case.yaml`, `fixture.sh`, `prompt.md`, `graders/criteria.md`, `graders/skill-fired.md`. `allowed_tools: [Read, Glob, Grep, Skill, Agent, Write]`.
   - Fixture (grew to 122 files and 11 ground-truth files during step 2; see the issue file): a small JS shop app of about 14 files. The change in the prompt: "add a `currency` argument to `formatPrice`". Ground truth: `src/lib/money.js` (definition), `src/lib/index.js` (barrel re-exporting it as `fmtPrice`), `src/components/Cart.js` (calls `fmtPrice` through the barrel), `src/pages/checkout/Summary.js` (far caller, imports `../../lib/money.js`), `src/emails/receipt.js` (calls it inside a template string), `tests/money.test.js` and `docs/api.md`. Reusable code: `src/lib/locale.js` exports `getCurrencySymbol`. The rest are unrelated files.
   - `criteria.md` (LLM judge, reads only the last message): PASS if the plan, shown in full in the reply, names every ground-truth file by path, names `src/lib/locale.js` `getCurrencySymbol` as reusable, and lists no path that does not exist. FAIL if any ground-truth file is missing or a path is invented.
   Done when: `claude plugin validate --strict plugins/dev-kit` passes and `bash fixture.sh` in an empty folder builds the files listed above.

2. **Baseline run on the current `plan`.**
   What: run `plan-impact-mapper` 3 times with `--ablation none` on the branch as it is (the `plan` skill is still `main`'s). Record the scores and cost in the issue file.
   Done when: the baseline scores and the mean main-session turns and cost per run are in the issue file. Result (2026-11-13): the fixture grew to 122 files and `criteria.md` still passes 3 of 3 (mean 19 turns, $0.296 per run), so there is no recall gap. The original "fails in at least 2 of 3 runs" was dropped with the user's agreement; the test is now fewer main-session turns at equal recall.

3. **Write the agent.**
   What: `plugins/dev-kit/agents/impact-mapper.md`. Frontmatter: `name`, third-person `description` with trigger phrases, `tools: Read, Grep, Glob`, `model: haiku`. Body: take a plain-language change description and derive the symbols; if it is too vague, say what is missing instead of guessing; search by term expansion (case variants, file names, string literals), chase aliases and barrel files until no new name appears, search config, docs, CI and tests, and scan for dynamic patterns (`import(` or `require(` with a built string, computed property access, string-keyed registries); report affected files with reason and `path:line` tagged Confirmed, Likely or Possible, reusable code by path, the terms searched and a "Blind spots" section; cap the report length.
   Done when: `grep -n "^tools:" plugins/dev-kit/agents/impact-mapper.md` prints exactly `tools: Read, Grep, Glob`, the file is under 60 lines, and `claude plugin validate --strict plugins/dev-kit` passes.

4. **Make `plan` call the agent.**
   What: `plugins/dev-kit/skills/plan/SKILL.md`. Step 2 spawns `dev-kit:impact-mapper` with the change description and uses its report for the Reuse list and the steps; if the agent fails or returns nothing usable, read the code itself as before. Step 3 adds: a step that renames or removes a symbol has a Done when that greps the old name for 0 hits and runs the typecheck and tests.
   Done when: `plan/SKILL.md` names `dev-kit:impact-mapper` once, mentions the fallback and the grep Done when, and stays under 40 lines.

5. **Add the negative case.**
   What: extend `plugins/dev-kit/evals/plan-skip-trivial/` so the agent is allowed (`Agent` in `allowed_tools`), then check from the run's `--json` evidence that no `Agent` call to `dev-kit:impact-mapper` happens. If the grader schema has no negated `tool_used`, keep that as a manual check of the JSON and say so in the issue file.
   Done when: 3 runs of `plan-skip-trivial` show 0 spawns and the case's criteria still pass.

6. **Run the evals after the change.**
   What: `plan-impact-mapper` 3 times with `--ablation none`, plus `plan-multi-file` and `plan-skip-trivial`. Check in the `--json` output that every `plan-impact-mapper` run spawned `dev-kit:impact-mapper`, and that the agent's report is in the last message.
   Done when: `plan-impact-mapper` criteria pass 3 of 3 with the agent spawned in each run, the main-session turns (counted from each run's trace, not the subagent's) have a mean below the baseline's 19, and `plan-multi-file` and `plan-skip-trivial` keep their baseline results. Scores, turns and cost go into the issue file. If the turns are not lower, stop: the agent is not shipped and the user decides what to do with the issue.

7. **Update docs and run the checks.**
   What: `CHANGELOG.md` entry `0.9.0` (Added: agent and eval; Changed: `plan` step 2), `plugin.json` version `0.9.0`, README (Agents line, `plan` row, eval list and its count of cases), tick the tasks in `docs/issues/39-impact-mapper-agent.md` and set #39 to its in-progress or closed status as the index does, link this plan from the issue file.
   Done when: `node --test tests/hooks.test.mjs` passes with 0 fail, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass, and every acceptance criterion in the issue maps to a result above.

8. **Review.**
   What: run the `review` skill on the pending work.
   Done when: the reviewer reports no Block items and every Should fix item is fixed; Scope items wait for your decision.

## Out of scope

- Related tests, task-splitting suggestions, LSP or typecheck, and git history search in the agent.
- Changes to `issue start` and to the other skills.
- The other agent ideas: test-gap-finder, ci-failure-triager, dependency-scout, pr-describer.
- Audit backlog items.
- Running the agent on a real task: the eval covers a fixture only.

## Decisions and assumptions

- From grill: read-only agent for the developer workflow; Grep/Glob only; called by `plan` step 2 with a plain-language change description; output is affected files plus reusable code; the safety net for missed callers is the grep Done when in `plan`, not the agent.
- The baseline decision uses `criteria.md` only: the agent-spawned check cannot pass on a plan without the agent, so it would make "baseline fails" true for free.
- Baseline is the current branch before step 4, since `plan/SKILL.md` is unchanged until then; no plugin copy is needed.
- Version `0.9.0`: a new agent is a minor bump, as 0.8.0 and 0.7.0 were.
- The fallback in `plan` is checked by reading the skill text, not by an eval: a failing agent is hard to produce on demand. Not verified by a run.
- The agent sets `model: haiku` in its frontmatter, because the work is search. Neither existing agent sets a model, so this is new for the kit; step 6 shows whether a small model still finds the ground truth, and the model is raised if it does not.

## Open questions

- Does the eval grader schema support "tool not used"? Step 5 finds out and falls back to a manual JSON check.
