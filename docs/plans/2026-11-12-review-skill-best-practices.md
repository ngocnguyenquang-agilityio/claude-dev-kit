# Plan: review skill and reviewer agent best practices

## Goal

The `review` skill and `reviewer` agent report fewer false positives (each Block finding verified, an explicit do-not-flag list), check design and scoped project rules, set levels by impact, re-check their own fixes once and never revert scope changes without asking, backed by three new evals with a baseline.

## Reuse

- Eval layout and fixture style: `plugins/dev-kit/evals/review-boundary-bug/` (`case.yaml`, `fixture.sh`, `prompt.md`, `graders/criteria.md`, `graders/skill-fired.md`).
- Baseline method from #35: copy the plugin to the scratchpad, overwrite `skills/review/SKILL.md` and `agents/reviewer.md` with `git show main:<path>`, run `claude plugin eval <copy> --scaffold --ablation none --case <name>`.
- Issue file format: `docs/issues/35-plan-skill-best-practices.md`.

## Steps

1. **File the issue.** Done: #37, `docs/issues/37-review-skill-best-practices.md`, branch `feat/review-verified-findings`.
   What: `/dev-kit:issue new` drafts `docs/issues/37-review-skill-best-practices.md` with the nine points as tasks, the acceptance criteria below and the sources from the comparison; it links this plan. Add a row to `docs/issues/README.md`. Then `issue start` cuts the branch.
   Done when: the GitHub issue exists (after your yes to `gh issue create`), the issue file links `docs/plans/2026-11-12-review-skill-best-practices.md`, and `git branch --show-current` shows the new branch.

2. **Write the three evals (point 8), no skill change yet.**
   What: under `plugins/dev-kit/evals/`, each with `case.yaml`, `fixture.sh`, `prompt.md`, `graders/criteria.md`, `graders/skill-fired.md`, `allowed_tools: [Read, Glob, Grep, Skill, Agent]` like `review-boundary-bug`:
   - `review-clean-diff`: a correct change containing code that looks like a bug but is not (for example `value == null` used on purpose to catch `undefined` too, with a test). PASS: verdict clean, no Block item. FAIL: any Block item.
   - `review-pre-existing-bug`: the committed base has a bug in one function; the diff changes a different function in the same file correctly. PASS: no Block item about the untouched function; it may appear as a follow-up. FAIL: it is listed under Block or Should fix.
   - `review-scope-change`: the request asks for one fix; the diff also renames an unrelated helper. PASS: a Scope finding on the rename marked "needs your decision" and not reverted. FAIL: no Scope finding, or the report says it reverted or fixed it.
   Done when: the three folders exist and `claude plugin validate --strict plugins/dev-kit` passes.

3. **Baseline run.**
   What: run the three new cases and `review-boundary-bug` against the current skill (`main` copy, method above), 1 run each.
   Done when: scores are recorded in the issue file. Expected: `review-scope-change` fails on baseline (Should fix items are fixed today); the other two may pass and then count as regression guards, said so in the issue (handoff decision: do not reword prompts until a case fails).

4. **Reviewer: scoped rules, design, do-not-flag, levels, verify (points 1–5).**
   What: `plugins/dev-kit/agents/reviewer.md`
   - Gather step 6: read `CLAUDE.md` and `AGENTS.md` at the root and in every directory on the path of a changed file; a rule applies only to files under its directory (point 3).
   - Standards: a finding quotes the broken rule verbatim and names its file; with no quotable rule it is at most a Nit. Add design and complexity: needless abstraction, code that could be deleted, a simpler existing pattern ignored. Drop "needless abstraction" from the judgement-only smells (point 4). The axis count stays six, so the description and README stay true.
   - New `## Do not flag`: problems in code the diff does not touch (note them under Follow-ups instead), code that looks wrong but is correct, what a linter or formatter catches, rules silenced in the code, nitpicks a senior engineer would not raise (point 2).
   - Levels: the axis mapping becomes the default; a finding may move up or down one level with a one-line reason tied to impact (point 5).
   - New `## Verify` before Report: for each Block item, re-read the cited lines and state the input or state that triggers it; an item that cannot be shown drops to Nit or is removed (point 1).
   - Report: add a Follow-ups list (pre-existing problems), `none` when empty.
   Done when: `reviewer.md` stays under 70 lines, `claude plugin validate --strict plugins/dev-kit` passes, and `node --test tests/hooks.test.mjs` passes (reviewer guard tests unchanged).

5. **Review skill: scope decisions, re-review, wording (points 6, 7, 9).**
   What: `plugins/dev-kit/skills/review/SKILL.md`
   - Description in the third person with trigger phrases: "Reviews all pending changes ... Use after finishing file changes, before handing over commit commands, or when the user asks to review or check their changes." (point 9)
   - No-issue paragraph: pass the plan's file path under `docs/plans/`; drop "when it lives only in chat" (point 9).
   - After the review: fix Block and Should fix items except Scope items, which are reported as "needs your decision" and never reverted (point 7). When a Block fix changes more than a few lines, spawn the reviewer once more on the new diff; no third run, anything left is reported (point 6).
   - Report: add the Follow-ups list.
   Done when: `SKILL.md` stays under 35 lines and `claude plugin validate --strict plugins/dev-kit` passes.

6. **Callers say the same thing.**
   What: `plugins/dev-kit/skills/issue/references/finish.md` (lines 13, 20) and `plugins/dev-kit/skills/ship/references/commit.md` (line 6): "Fix Block and Should fix items" gains "except Scope items, which wait for the user's decision".
   Done when: `grep -rn "Should fix" plugins/dev-kit/skills` shows no instruction that fixes Scope items without asking.

7. **After run.**
   What: same four cases on the changed plugin, 1 run each.
   Done when: all four cases pass their criteria and `review-clean-diff` fires the skill in 3 of 3 runs (baseline: every criteria grader passed once the diff was pasted, skill fired 1 of 3 on `review-clean-diff`). Before and after scores go into the issue file and the PR.

8. **Docs and version.**
   What: `CHANGELOG.md` 0.8.0 entry (Changed: reviewer verify, do-not-flag, scoped rules, design, levels; review scope decisions and re-review; Added: three evals), `plugins/dev-kit/.claude-plugin/plugin.json` version 0.8.0, `README.md` line 44 (scope items wait for a decision) and line 128 (list the new review cases).
   Done when: `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

9. **Checks and review.**
   What: `node --test tests/hooks.test.mjs`, both validates, then the `review` skill on this branch.
   Done when: tests pass with 0 failures, both validates pass, the review has no open Block items. Then I show the commit and PR commands and wait.

## Requirement map

| Point | Step |
|---|---|
| 1 Verify Block findings | 4 |
| 2 Do-not-flag list | 4 |
| 3 Quote rule, nested CLAUDE.md | 4 |
| 4 Design/complexity | 4 |
| 5 Levels by impact | 4 |
| 6 Re-review fixes once | 5 |
| 7 Scope needs a decision | 5, 6 |
| 8 Three evals + baseline | 2, 3, 7 |
| 9 Description, plan wording | 5 |

## Out of scope

- Splitting the reviewer into parallel specialist agents or a separate verify subagent per finding: too costly for a review that runs after every unit of work.
- Confidence scores (0–100) on findings: the Verify step covers the same need with less text.
- Audit backlog items about the reviewer: A21 (`git fetch` without a remote), A26 (guard and Windows paths), A7 (personal rules disagree on Should fix).
- Changes to `/security-review` or `pr-followup comments`.

## Decisions and assumptions

- Verification lives inside the reviewer (a Verify section), not in an extra subagent: most of the precision gain at no extra agent cost.
- Design and complexity fold into the Standards axis, so "six axes" in the agent description and README stays true.
- Only Scope items move to "needs your decision". Standards and Tests Should fix items are still fixed automatically.
- Re-review runs only after a Block fix of more than a few lines, at most once.
- Evals run 1 time per case for baseline and after, as in #35; more runs only if a result looks flaky.
- One issue and one PR for all nine points, since steps 4–6 touch the same two files.

## Open questions

none
