# Add a read-only impact-mapper agent that plan calls at step 2

## Goal

`plan` finds the files a change affects and the code it can reuse by reading code itself, which fills the main context and can miss far callers. A read-only `impact-mapper` agent does that search in its own context and returns a short, evidence-backed report, so plans list every affected file and name reusable code by path.

Plan: `docs/plans/2026-11-13-impact-mapper-agent.md`

## Tasks

Agent (`plugins/dev-kit/agents/impact-mapper.md`, modelled on `reviewer.md`):

- [x] Frontmatter: `tools: Read, Grep, Glob` only (no Bash, no git), a cheaper model, a third-person description with trigger phrases.
- [x] Input is a plain-language description of the change; the agent derives the symbols to search. A vague description makes it say what it needs instead of guessing.
- [x] Search with Grep/Glob only, language-independent. Expand terms (case variants, file names, string literals), chase aliases and barrel files in a loop until no new name appears, search config, docs, CI and tests, and scan for dynamic patterns near the area.
- [x] Report: affected files with reason and `path:line`, each tagged Confirmed, Likely or Possible; reusable code by path; the terms searched; a "Blind spots" section. Report length is capped.

Skill (`plugins/dev-kit/skills/plan/SKILL.md`):

- [x] Step 2 spawns the agent (`subagent_type: "dev-kit:impact-mapper"`) instead of reading code itself, and falls back to reading code itself if the agent fails. Calling the agent by hand still works.
- [x] Steps that rename or remove a symbol get a Done when such as "grep for the old name returns 0 hits, typecheck and tests pass".

Evals (`plugins/dev-kit/evals/`), written and run on the current `plan` skill first to get a baseline:

- [x] Fixture repo with known ground truth: a change that touches a known set, a far caller, indirect callers through an alias, a second alias level and a string-keyed registry, a same-prefix decoy, one reusable function. Grew from 14 to 23 to 122 files (`plan-impact-mapper/fixture.sh`).
- [x] Case `plan-impact-mapper`: the plan lists the 11 ground-truth files and names the reusable function by path, with no invented paths. The full plan with its file list is in the last message, because the judge reads only that.
- [x] Case: a trivial change does not spawn the agent.
- [x] Baseline of the new case on the current `plan` (3 runs each, `--ablation none`, 2026-11-13):
  - 14 files: `criteria` 1 of 3, $1.01. It failed only because the criteria required a re-export file (`src/lib/index.js`) to need a change; the plans were right. Criteria fixed.
  - 23 files, with the second alias level, registry caller and `scripts/` caller: 3 of 3, $0.77.
  - 122 files, with two callers hidden among about 90 filler files: 3 of 3, $0.89. Main-session `turns` 18, 22, 17 (mean 19); `costUsd` per run 0.296, 0.313, 0.278 (mean 0.296).
  - So the current `plan` already finds every caller on this fixture, and a bigger repo does not change that. The eval cannot show a recall gain; the claim left to test is context and effort in the main session.
- [x] Run 3 times after the change on the 122-file fixture. Check in the transcript that the agent was spawned (`subagent_type` `dev-kit:impact-mapper`), and compare main-session turns and cost with the baseline above. Record scores here.
  - After the change, 2026-11-13, two sets of 3 runs, $0.70 and $1.07 (`agent-spawned` grader added for the second set; the first set's traces were gone, so the spawn is confirmed for the second set only, 3 of 3):
  - `criteria` 2 of 3, then 0 of 3. Every run named all 11 files with `path:line` and `getCurrencySymbol`. The judge failed them because the plan put the 7 callers under "no edit: they keep the USD default", where the baseline plans changed them to pass `order.currency`. The agent finds the callers; the plan decides differently once the main session no longer reads them. A cause is not shown.
  - Main-session `turns` 9, 10, 11, 16, 10, 10 (mean 11, baseline 19). `costUsd` per run mean 0.295 (baseline 0.296): fewer turns, no saving in cost.
  - Third set, 2026-11-13, after adding "read the lines the report cites" to `plan` step 2, $0.74: `criteria` 1 of 3, agent spawned 3 of 3, turns 12, 12, 12, cost mean 0.248. All 11 files and `getCurrencySymbol` named in all 3 runs. Two plans kept the callers unchanged on a `"USD"` default and asked where a currency would come from; the baseline plans changed them to pass `order.currency`, a field the fixture's callers never show.
  - Across the three sets with the agent: `criteria` 3 of 9 against 3 of 3 on the baseline; recall of the 11 files 9 of 9 (checked by path in the judged text); main-session turns mean 11.3 against 19; cost equal.
  - The criteria could not tell a plan that misses callers from one that finds them and decides not to edit them. On 2026-11-13, after seeing the results above, they were changed to check discovery only: a file counts when the plan names it, even as "left unchanged for a stated reason". Plan design quality is no longer measured. This was a change of the bar after the data, made with the user's agreement.
  - Fourth set, new criteria, 3 runs each, $0.77 with the agent and $0.86 baseline (`main`'s `plan/SKILL.md` in a copy of the plugin): with the agent `criteria` 3 of 3 (one 2-to-1 vote), agent spawned 3 of 3, turns 10, 15, 13 (mean 12.7), cost mean 0.255. Baseline `criteria` 3 of 3, turns 15, 18, 23 (mean 18.7), cost mean 0.285.
  - So at equal discovery the main session takes about a third fewer turns and costs about 10% less. The ranges overlap at 15 turns and there are 3 runs per side, so this is a direction, not a measured effect size.
  - Negative case: `plan-skip-trivial` with `Agent` allowed and a `no-agent` grader (`min: 0, max: 0`): the agent was called 0 times in 3 of 3 runs, `criteria` 3 of 3, twice (before and after the fixes below).
  - Regression found and fixed: `plan-multi-file` (an empty folder, nothing to map) passed 3 of 3 on `main`'s `plan` and failed 0 of 3 with the agent. The agent searched parent folders and reported it could not rule out another location, and `plan` stopped to ask or did not save the plan. The agent now searches only the folder it is given, and `plan` carries on, marks assumed paths and lists them under Open questions. After the fix: `plan-multi-file` 3 of 3, `plan-impact-mapper` 3 of 3 with the agent spawned 3 of 3 (turns 12, 11, 11, cost mean 0.235).
  - After the review fixes (reworded `plan` step 2 as sub-bullets, agent report and done-when wording, `no-agent` match widened, portable fixture), 2026-11-13, 3 runs each, $2.36: `plan-impact-mapper` 3 of 3 with the agent spawned 3 of 3, but turns 20, 11, 18 (mean 16.3) and cost 0.293, 0.230, 0.642 (mean 0.388); `plan-skip-trivial` 3 of 3, agent called 0 times; `plan-multi-file` 3 of 3.
  - So the turn saving shrank from a third (12.7 against 18.7, then 11.3) to about 13% (16.3), and cost was higher on average because of one $0.64 run. With 3 runs per set this may be noise or an effect of the reworded step; the data cannot tell. The saving is not settled.
  - Second set on the final text, 2026-11-13, $0.79: `criteria` 3 of 3 (one 2-to-1 vote), agent spawned 3 of 3, turns 9, 14, 13 (mean 12.0), cost mean 0.263.
  - Final text, 6 runs: turns 20, 11, 18, 9, 14, 13 (mean 14.2), cost mean 0.326, median about 0.27. Baseline, 6 runs on the same fixture and the `main` `plan` (two sets): turns 15, 18, 23, 18, 22, 17 (mean 18.8), cost mean 0.290, median about 0.29. About a quarter fewer main-session turns, cost equal at the median and 12% higher at the mean because of one $0.64 run. Six runs per side: a direction, not a measured effect.
  - Not verified: the fallback when the agent errors out (no way to make it fail on demand), and a real project instead of the fixture.

Docs:

- [x] Update `CHANGELOG.md`, the plugin version and the README agents list and eval list.

## Acceptance criteria

- `plan-impact-mapper` passes 3 of 3 runs after the change with the agent spawned in each run (recall no worse than the baseline's 3 of 3), and the main session needs fewer turns than the baseline mean of 19. If it does not, the agent is not shipped and the issue is reopened for a decision. Changed on 2026-11-13: the baseline passes, so "fails before, passes after" cannot be met.
- The trivial-change case does not spawn the agent in any run.
- The agent file declares only `Read, Grep, Glob`.
- A plan that renames or removes a symbol has a Done when with a grep for the old name, typecheck and tests.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Related tests, task-splitting suggestions, LSP or typecheck, and git history search in the agent.
- Changes to `issue start`.
- The other agent ideas: test-gap-finder, ci-failure-triager, dependency-scout, pr-describer.
- Audit backlog items.

## Depends on

none

## Decisions

- Aimed at the developer workflow of plugin users, not at fixing this repo.
- Read-only; Grep/Glob only keeps it language-independent. Grep can miss dynamic callers: the report says so, and the Done when check in `plan` is the safety net.
- `plan` depends on the agent, so the fallback to reading code itself is required.
- Unknown until the eval runs: whether the agent beats `plan` reading code itself. Baselines showed no recall gap to close, so the test is fewer main-session turns at equal recall (2026-11-13, agreed with the user).
