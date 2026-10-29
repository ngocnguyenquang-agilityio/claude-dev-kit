---
name: grill
description: Interview the user to settle decisions before acting. Use when the user says "grill", or when the request is vague, broad or leaves key decisions open.
---

# Grill

Stress-test a plan or request by interviewing the user until you share one understanding. Map the work as a **decision tree**: every decision branches into the decisions that hang off it.

## Process

1. **Find facts yourself.** Anything answerable from files, config or tools is your job (use Explore, Grep, Read). Never ask the user for a fact you can look up.
2. **Ask in rounds.** The *frontier* is every decision whose prerequisites are already settled. Ask the whole frontier in one round, then wait for answers.
3. **Format each question:**
   - Number it (Q1, Q2, ...) and give it a short title.
   - Offer lettered options (A/B/C) so the user can choose instead of typing. Put your recommended option first and mark it "(Recommended)".
   - Word it so "yes" or the first option accepts your recommendation.
4. **Recompute the frontier** after each round. Answers unblock later questions. A question that depends on an open question belongs in a later round.
5. **Stop** when the frontier is empty and nothing is silently assumed. Do not act until the user confirms the shared understanding.

## Output

A short summary in chat of the decisions settled. No files.
