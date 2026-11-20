# Plan: run approved plan steps on Sonnet through an implementer agent

Issue: #63 (`docs/issues/63-plan-implementer-agent.md`)

## Goal

After the user approves a plan, each step runs in a new `dev-kit:implementer` agent on Sonnet, while the main session (on the model the user chose) checks each step's Done when, retries a failed step once and then stops.

## Steps

1. **Vision.** `docs/vision.md`: in pillar 1 (line 13) add one sentence on model routing: decisions run on the session's model, approved plan steps run on Sonnet in `implementer`, and the main session checks each step. Add `implementer` to the Agents list (lines 21-22).
   - Done when: `grep -n implementer docs/vision.md` shows 2 hits, one in the Pillars section and one in the Agents line.

2. **Agent.** New `plugins/dev-kit/agents/implementer.md`, laid out like `plugins/dev-kit/agents/impact-mapper.md` (frontmatter, then Input, Work, Report sections). Frontmatter: `name: implementer`, a description saying it runs one approved plan step and is normally run by the `plan` skill, `tools: Read, Edit, Write, Grep, Glob, Bash`, `model: sonnet`. Body:
   - Input: one step (its What and Done when) and the plan file path; read the plan for context, change only what this step names.
   - The working rules it must follow, stated inline (the SessionStart rules are not known to reach a subagent): match surrounding code, comment only the why, no drive-by changes, never commit, push, merge or rebase, no secrets.
   - Run the step's Done when check if it can, but the main session's run is the one that counts.
   - On a retry, the prompt carries the failing output: undo the previous attempt before trying again (same rule as `skills/debug/SKILL.md:34`, "Do not stack fixes").
   - Report: files changed, commands run with their result, anything it could not do.
   - Done when: `claude plugin validate --strict plugins/dev-kit` passes, and `node scripts/inventory.mjs` lists `implementer` among the agents.

3. **Plan skill.** `plugins/dev-kit/skills/plan/SKILL.md` Output (lines 30-32): replace "work one step at a time" with: after the yes, spawn `dev-kit:implementer` (`subagent_type: "dev-kit:implementer"`) once per step, passing the step's What, Done when and the plan path; then run the Done when check yourself. On a failure, spawn it once more with the failing output; if the check still fails, stop and report the step, the output and what was tried. Do not edit a step's files in the main session. If the agent cannot be spawned, say so and ask the user before doing the step in the main session.
   - Done when: `grep -n "dev-kit:implementer" plugins/dev-kit/skills/plan/SKILL.md` shows the dispatch line, and `grep -n "one step at a time" plugins/dev-kit/skills/plan/SKILL.md` shows 0 hits.

4. **Eval.** New `plugins/dev-kit/evals/plan-implementer-dispatch/`, copied from `plan-impact-mapper/`:
   - `case.yaml`: `schema_version "1.1"`, `scaffold_script: fixture.sh`.
   - `fixture.sh`: a small greeter CLI: two functions, their tests, the CLI and a README (first a single function; `plan` rightly skipped that one-sentence change).
   - `prompt.md`: `allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit]`; asks to plan a multi-file `--lang <en|vi>` feature and says the plan is approved in advance, so implement it right after writing it.
   - Graders: `skill-fired.md` (`Skill`, `dev-kit:plan`), `implementer-spawned.md` (`Agent`, `input_match: 'dev-kit:implementer'`). An `llm` `criteria.md` was tried and dropped; see the issue's Eval results.
   - Done when: `claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --case plan-implementer-dispatch` passes 3 of 3 runs, results recorded in the issue file under `## Eval results`.

5. **Docs.** `README.md`: plan row (line 42) says approved steps run in `implementer` on Sonnet; Agents line (line 53) adds `implementer` (edits files, runs on Sonnet); evals paragraph (line 144) adds `plan-implementer-dispatch`. `CHANGELOG.md` `## Unreleased`: one Added entry for the agent and the plan change, with the eval result and its limits.
   - Done when: `grep -c implementer README.md` is at least 3 and `grep -n "plan-implementer-dispatch" CHANGELOG.md` shows 1 hit.

6. **Checks and review.** Run `node --test tests/hooks.test.mjs tests/inventory.test.mjs`, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .`, then the `review` skill.
   - Done when: all tests pass with 0 fail, both validates pass, and review reports no unresolved finding.

## Requirement mapping

- Vision update: step 1. Agent on Sonnet: step 2. Per-step dispatch, retry once, main session checks: step 3. Grill and plan keep the session's model: step 3 adds no `model:` to either skill (step 6 review checks this). Eval 3 of 3: step 4. README and CHANGELOG: step 5. Tests and validate: step 6.

## Out of scope

- Picking a model inside `grill`; the user switches with `/model`.
- Routing work without an approved plan (small changes, `debug`, `issue fix`, `review`) through the implementer.
- Changing `impact-mapper` or `reviewer`, the safety guard, or `scripts/inventory.mjs` (it finds the new agent by itself).
- Steps 1-5 of this plan run in the main session: the implementer does not exist until step 2 and is not wired into `plan` until step 3.

## Decisions and assumptions

- From grill: grill keeps the session's model; one implementer run per step; retry once then stop; only approved plans go through it; vision gets a model-routing line.
- `model: sonnet` alias, not a pinned id, as `impact-mapper` uses `haiku`.
- The implementer gets the working rules inline, because it is not verified that SessionStart context reaches a subagent.
- When the agent cannot be spawned, the main session asks before doing the step itself, so the Sonnet routing never drops silently.
- The safety guard's base-branch ask and git-risk ask already apply to the implementer; no guard change is needed.

## Open questions

- Whether a `tool_used` grader also counts the subagent's own tool calls. If it does, a "main session made no edit" grader is not possible, so the eval checks dispatch and the reply only.
