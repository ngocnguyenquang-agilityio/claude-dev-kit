---
name: plan
description: Break non-trivial work into small, verifiable steps. Use before implementing anything that spans multiple files or steps.
---

# Plan

Turn the request into an ordered list of small steps. Each step must be independently verifiable.

## Process

1. Restate the goal in one sentence. If the `grill` skill just ran in this session, start from its settled decisions instead of re-asking.
2. Read the relevant code first. Reuse existing functions and patterns; list them by path.
3. Write the steps. Each step has:
   - **What** changes (files or areas).
   - **Done when**: a runnable check (test command, typecheck, or a specific manual check). No vague "works correctly".
4. Order steps so each leaves the project in a working state.
5. Flag risks and open questions at the end. Ask the user about anything that blocks the plan.

## Output

The plan stays in chat. Write it to a file only when the user asks or the work will span several sessions; if so, say the path so `handoff` can reference it.
