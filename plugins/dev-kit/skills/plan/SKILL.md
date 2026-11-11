---
name: plan
description: Breaks non-trivial work into small, verifiable steps, saves the plan to a file and waits for the user's yes. Use before implementing anything that changes 3 or more files or needs several dependent steps. Skip it when the whole change fits in one sentence, such as a rename, even across several files.
---

# Plan

Turn the request into an ordered list of small steps. Each step must be independently verifiable.

## Process

1. Restate the goal in one sentence. If the `grill` skill just ran in this session, start from its Decisions and Assumptions instead of re-asking. If the work splits into independent parts, suggest one plan per part.
2. Read the relevant code first. Reuse existing functions and patterns; list them by path.
3. Write the steps. Each step, including a final checks or review step, has:
   - **What** changes (files or areas).
   - **Done when**: a runnable check (test command, typecheck, or a specific manual check) and the result that means it passed, such as "3 new tests pass, 0 fail".
   No "TBD", "handle edge cases" or "works correctly", and no finished code: the plan says what to change, not the change itself.
4. Order steps so each leaves the project in a working state.
5. Check that every requirement and acceptance criterion maps to at least one step.
6. End with:
   - **Out of scope**: what this work leaves alone, or `none`.
   - **Decisions and assumptions**: what you chose where the request left room, and why, plus any carried over from `grill`.
   - **Open questions**: only what blocks the plan.

## Output

Write the plan to `docs/plans/YYYY-MM-DD-<slug>.md` and give its path, so `handoff` and a later session can pick it up. When the work has an issue, link the plan from the issue file. The plan file is committed with the work, like the issue file.

Show the whole plan in chat as the file has it, goal and every Done when included, not a summary: the user approves what they read. Then wait for their yes before implementing. After that, work one step at a time: move on only when the step's check gives its expected result.
