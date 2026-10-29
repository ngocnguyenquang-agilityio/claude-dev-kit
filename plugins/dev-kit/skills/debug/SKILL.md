---
name: debug
description: Find root causes before fixing. Use when something is broken, throwing, failing or slow.
---

# Debug

Do not guess. Build a fast feedback loop first, then find the cause.

## 1. Build a feedback loop

Get ONE command that runs the failure and shows the user's symptom: red, deterministic, fast. Options, roughly in order of preference:

- A failing test at the seam closest to the bug.
- A script, `curl` call or CLI fixture against the running code.
- Replay a captured trace, log or request.
- Bisect (`git bisect`, or toggling inputs/config) to narrow the change that broke it.
- Compare a working and a failing case and diff them.

For flaky bugs, raise the reproduction rate (loop, add load, pin seeds) until it is usable. If you cannot build any loop, stop: say what you tried and ask the user for access, logs or an artifact. Do not fix blind.

## 2. Find the root cause

Form one hypothesis at a time, state what would prove it wrong, and test it with the loop. Read the actual code path and data. Stop at the cause, not the first symptom.

## 3. Fix

Make the smallest change that removes the cause. Re-run the loop: green. Add a regression test where a test can express the bug. Run the broader tests.

## Output

Root cause, the minimal fix, and the regression test. Mention anything you could not verify.

## Secrets

Redact tokens, keys and personal data in anything you print or save as `<REDACTED>`.
