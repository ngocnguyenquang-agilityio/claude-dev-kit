---
name: plan
description: Breaks non-trivial work into small, verifiable steps, saves the plan to a file and waits for the user's yes. Use before implementing anything that changes 3 or more files or needs several dependent steps. Skip it when the whole change fits in one sentence, such as a rename, even across several files.
---

# Plan

Turn the request into an ordered list of small steps. Each step must be independently verifiable.

## Process

1. Restate the goal in one sentence. If the `grill` skill just ran in this session, start from its Decisions and Assumptions instead of re-asking. If the work splits into independent parts, suggest one plan per part.
2. Find what the change touches and what it can reuse:
   - Spawn the `impact-mapper` agent (`subagent_type: "dev-kit:impact-mapper"`) with the change in plain words, and build the steps from its report. Reuse the functions and patterns it lists; name them by path.
   - Before deciding what changes in a Confirmed file, read the lines the report cites. Treat Likely and Possible items and its Blind spots as things to check, not facts.
   - If it fails, finds nothing or the project has no code yet, plan from what you can read yourself, mark the paths you assume and list them under Open questions; do not stop to ask first.
3. Write the steps. Each step, including a final checks or review step, is a top-level line `- [ ] N. <title>`, unindented so SessionStart can count it, with two indented bullets under it:
   - **What** changes (files or areas).
   - **Done when**: a runnable check (test command, typecheck, or a specific manual check) and the result that means it passed, such as "3 new tests pass, 0 fail". A step that renames or removes a symbol also greps for the old name and expects 0 hits.
   No "TBD", "handle edge cases" or "works correctly", and no finished code: the plan says what to change, not the change itself.
4. Order steps so each leaves the project in a working state.
5. Check that every requirement and acceptance criterion maps to at least one step.
6. End with:
   - **Out of scope**: what this work leaves alone, or `none`.
   - **Decisions and assumptions**: what you chose where the request left room, and why, plus any carried over from `grill`.
   - **Open questions**: only what blocks the plan.

## Output

Write the plan to `docs/plans/YYYY-MM-DD-<slug>.md` and give its path, so `handoff` and a later session can pick it up. When the work has an issue, link the plan from the issue file. The plan file is committed with the work, like the issue file.

Show the whole plan in chat as the file has it, goal and every Done when included, not a summary: the user approves what they read. Then wait for their yes before implementing.

## Implement

After the yes, take the steps in order. Do not edit a step's files yourself: the steps run on Sonnet so this session's model is spent on decisions and checks. A step that changes no files, such as the final checks or review step, runs in this session.

1. Spawn the `implementer` agent (`subagent_type: "dev-kit:implementer"`) with the step's What and Done when, and the plan file path.
2. Read its report. If it is a question, answer it from the plan and spawn the agent again with the answer, or ask the user when the plan does not settle it; this is not the retry. Otherwise run the step's Done when check yourself. Move on only when it gives the expected result.
3. When the check gives the expected result, tick the step in the plan file (`- [ ]` to `- [x]`) before the next step. Never tick before the check passes or when it failed.
4. If the check fails, spawn the agent once more with the same step and the failing output. If it fails again, stop: report the step, the output and what both attempts tried, and wait for the user.

When asked to continue or resume a plan, read the plan file and start at its first unticked step. Do not re-run or re-spawn the agent for ticked steps.

If the agent cannot be spawned, say so and ask the user before doing the steps in this session.
