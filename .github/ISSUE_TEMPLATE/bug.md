---
name: Bug report
about: A skill, hook or agent does not do what its docs say
labels: ["bug"]
---

## Goal

<!-- One or two sentences: the behavior once this is fixed, and why it matters. -->

## Steps to reproduce

<!-- The fewest steps that still show the bug. Name the exact command, prompt or file. -->

1.

## Expected / Actual

- Expected:
- Actual:

## Tasks

- [ ] Add a regression test that reproduces the steps above.
- [ ] Fix the cause.

## Acceptance criteria

- The regression test fails before the fix and passes after it.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

<!-- What this fix does not change, so the work does not grow. -->

## Depends on

none
