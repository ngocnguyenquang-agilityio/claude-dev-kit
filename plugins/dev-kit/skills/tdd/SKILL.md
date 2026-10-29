---
name: tdd
description: Test-first development with a red-green loop. Use when the user says "tdd", "test-first" or "red-green", or when fixing a bug that a test can reproduce.
---

# TDD

Write the test first, then the minimum code to pass it. Repeat in thin slices.

## Before the first test

Agree the **seam** with the user: the public interface where behavior will be checked (function, endpoint, component). Test there, not in internals. If the project has no test setup, say so and ask before adding one.

## The loop

1. **Red**: write ONE test for ONE behavior. Run it. It must fail, and for the right reason (missing behavior, not a typo or import error).
2. **Green**: write the least code that makes it pass. Run all tests.
3. Pick the next behavior and repeat. Do not write all tests up front; that makes tests guess at shape instead of describing behavior.

Refactor only when green, in a separate step, and re-run the tests.

## Bugs

The first step is a test that reproduces the bug. Watch it fail, fix, watch it pass. The test stays as the regression guard.

## Do not

- Test implementation details (private methods, internal calls, mock choreography). A refactor should not break a test.
- Write tautological tests that repeat the code's own formula.
- Mock what you own when a real instance is cheap.
