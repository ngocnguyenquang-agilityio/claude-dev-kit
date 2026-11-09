---
name: debug
description: Finds root causes before fixing. Use BEFORE changing any code whenever something is broken, throwing, failing, slow or giving wrong output, including a failing test, an error message or a request to "fix", "sort out" or "figure out why".
---

# Debug

Do not guess. Build a fast feedback loop first, then find the cause. Each step ends at its gate.

## 1. Build a feedback loop

Get ONE command that runs the failure and shows the user's symptom: red, deterministic, fast. Options, roughly in order of preference:

- A failing test at the seam closest to the bug.
- A script, `curl` call or CLI fixture against the running code.
- Replay a captured trace, log or request.
- Bisect (`git bisect`, or toggling inputs/config) to narrow the change that broke it.
- Compare a working and a failing case and diff them.

A flaky test is a bug to fix or isolate, not a reason to re-run until green: raise the reproduction rate (loop, add load, pin seeds) until it is usable, and replace fixed `sleep`s with waiting on a condition. If you cannot build any loop, stop: say what you tried and ask the user for access, logs or an artifact. Do not fix blind.

**Gate:** the loop shows the symptom. Only then go to step 2.

## 2. Find the root cause

Form one hypothesis at a time, state what would prove it wrong, and test it with the loop. Read the actual code path and data. Stop at the cause, not the first symptom. For techniques (stack traces, recent changes, tracing data backward, logging at component boundaries, when no cause turns up), see `references/tracing.md`.

**Gate:** state the root cause in one sentence. Only then change code.

## 3. Fix

1. **Regression test first.** If the loop is a test, it is the regression test. Otherwise turn the loop into a failing test before fixing, with the `tdd` skill, when a test can express the bug.
2. **Smallest change** that removes the cause, at the source rather than where the error shows.
3. **Re-run the loop.** Green: run the broader tests. Still red: revert this attempt and go back to step 2 with what you learned. Do not stack fixes.
4. **After 3 failed fixes, stop.** The design is likely wrong, not the hypothesis. Tell the user what you tried and ask before a fourth attempt.

## Red flags

Go back to step 2 if you catch yourself thinking "just try X and see", trying another fix without a new hypothesis, changing several things at once, or fixing before you can name the cause.

## Output

Always report the root cause, the regression test and what was not verified. A sensible default layout:

- **Symptom**: what failed, as the user saw it.
- **Loop**: the command that shows it.
- **Root cause**: one sentence.
- **Fix**: the change and why it removes the cause.
- **Regression test**: its name, red before and green after.
- **Not verified**: anything you could not run or check.

## Secrets

Redact tokens, keys and personal data in anything you print or save as `<REDACTED>`.
