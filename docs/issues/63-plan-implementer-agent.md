# Plan skill: run approved steps on Sonnet through an implementer agent

## Goal

Pillar 1 (quality workflow). Keep decisions on the model the user chose for the session (grill and plan run on it), and run approved plan steps on Sonnet through a new `implementer` agent. The main session stays the checker: it runs each step's "Done when" itself, so execution gets cheaper without losing the step gate. Plan: `docs/plans/2026-11-20-plan-implementer-agent.md`.

## Tasks

- [x] `docs/vision.md`: under Quality workflow, record model routing (decisions on the session's model, approved plan steps on Sonnet) and add `implementer` to the Agents list
- [x] New agent `plugins/dev-kit/agents/implementer.md` with `model: sonnet` and tools `Read, Edit, Write, Grep, Glob, Bash`. Input: one plan step (What, Done when) and the plan file path. It does that step only, follows the working rules, and reports the files changed and what it ran
- [x] `plugins/dev-kit/skills/plan/SKILL.md` (Output): after the user's yes, dispatch each step to `dev-kit:implementer`, one agent run per step. The main session runs the step's Done when check. On a failure, send the output back to the implementer once; if it still fails, stop and report to the user
- [x] Eval `plugins/dev-kit/evals/plan-implementer-dispatch`: with a plan already approved, the first step goes to `dev-kit:implementer` (a `tool_used` grader on the `Agent` call), and the main session runs the Done when check
- [x] `README.md` (plan row, Agents line, evals paragraph) and `CHANGELOG.md`

## Acceptance criteria

- After a plan is approved, each step runs in a `dev-kit:implementer` agent on Sonnet, and the main session does not edit the step's files itself.
- A step whose check fails gets one retry through the implementer, then the session stops and reports.
- `grill` and `plan` are unchanged in which model they run on (the session's model).
- `plan-implementer-dispatch` passes 3 of 3 runs with the `sonnet` judge.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Eval results

`claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --case plan-implementer-dispatch`, 3 runs per lot, 2026-11-20:

- Final graders `skill-fired` and `implementer-spawned`: 3 of 3, with 2, 3 and 3 implementer spawns.
- First fixture (a one-sentence change to three tiny files): 0 of 3, `plan` never fired, which its description says is right. The fixture now asks for a multi-file `--lang` feature.
- An `llm` grader on the final reply passed 0, 2 and 1 of 3 across three lots while dispatch passed; it was dropped because the judge sees no tool calls and the skill does not require the reply to name the agent. Across the 12 runs on the new fixture, `plan` fired 11 times, and every time it fired the steps went to the implementer.
- Not covered: that the main session runs each Done when check (`Bash` cannot be granted to evals on Windows), and that it makes no edit itself. With no `llm` grader, the `sonnet` judge is not used.

## Out of scope

- Picking a model inside `grill` (a `--model` argument or frontmatter); the user switches with `/model`.
- Routing work without an approved plan through the implementer: small changes, `debug`, `issue fix` and `review` stay in the main session.
- Changing the model of `impact-mapper` or `reviewer`.

## Depends on

none
