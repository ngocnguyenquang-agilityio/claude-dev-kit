---
name: grill
description: Interviews the user to settle decisions before acting. Use when the user says "grill", "interview me", "stress-test" or "challenge my plan", or when the request is vague, broad or leaves key decisions open.
---

# Grill

Stress-test a plan or request by interviewing the user until you share one understanding. Map the work as a **decision tree**: every decision branches into the decisions that hang off it.

## Facts and decisions

- **Facts are yours.** You look up anything answerable from files, config or tools; never ask the user for it. For anything beyond a quick Grep or Read, start an `Explore` sub-agent in the background and ask the questions that do not depend on its answer while it runs.
- **Decisions are the user's.** Put each one to them. Never settle one silently on their behalf.

## Process

1. **Find the frontier**: every open decision whose prerequisites are settled. A question that depends on an open question waits for a later round.
2. **Keep only questions worth asking.** Ask only when the answer changes what gets built. If every answer leads to the same work, do not ask. Small or easily reversed choices take a sensible default and go under Assumptions.
3. **Ask at most 4 questions per round**, the most consequential first; the rest wait. A round holds only questions and a short note of the facts you found: no plan, build order or implementation steps yet. Then stop and wait for answers.
4. **Format each question** with options the user can pick instead of typing, your recommended option first and marked "(Recommended)":
   - With 2 to 4 clear options, use the `AskUserQuestion` tool.
   - Otherwise, or when that tool is not available, write it in chat: number it (Q1, Q2, ...), give it a short title and lettered options (A/B/C), worded so "yes" accepts the recommendation.
5. **Push back once.** If a requirement or an answer conflicts with another one, with the code or carries a clear risk, say so with the reason and offer options. If the user holds their position, follow it and note the risk.
6. **Recompute the frontier** after each round. Stop when it is empty and nothing is silently assumed.

## Output

Summarize in chat:

- **Decisions**: what the user settled.
- **Assumptions**: defaults you chose, so the user can overturn them.
- **Out of scope**: what was explicitly left out.
- **Open risks**: conflicts the user chose to keep, and anything still unknown.

End with one question: "Is this right?" Do not act until the user confirms.

Write no files, with one exception: when working an issue whose `<issuesDir>/<NN>-*.md` file already exists (`issuesDir` from the kit config, `NN` the issue number padded to two digits), add the confirmed summary there under a `## Decisions` heading.
