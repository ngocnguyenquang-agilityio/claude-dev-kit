---
name: hotfix
description: Fix a bug end to end. Finds the root cause, writes a failing regression test, makes the smallest fix, then hands over the PR. Use when the user reports a bug, a failing behavior or a production problem.
argument-hint: <bug description or issue number>
disable-model-invocation: true
---

Fix: $ARGUMENTS

A bug flow keeps the fix small and proves it with a test. Each step ends when its check holds.

1. **Issue.** If `$ARGUMENTS` is an issue number, read it with `gh issue view`. If it is a description and there is no issue yet, offer `/dev-kit:new-issue` and wait for the user's choice. The issue is optional: the fix can go ahead without one.
2. **Branch.** With an issue `N`, run `/dev-kit:start-issue <N>` steps 1 to 4 with type `fix`. Without one, run its steps 1 and 2, then `git checkout -b fix/<slug>` with a 2-4 word kebab-case slug from the bug. Done when `git branch --show-current` prints `fix/<slug>`.
3. **Root cause.** Use the `debug` skill: build one command that shows the symptom, then find the cause. Do not patch the symptom. State the root cause in one sentence before changing code.
4. **Red.** Use the `tdd` skill: write one test at the seam closest to the bug. Run it. It must fail for the reason you named in step 3.
5. **Green.** Make the smallest change that removes the cause. Run the new test, then the project's full checks. Done when all pass.
6. **Scope.** Note any other problem you found as a follow-up. Do not fix it in this branch.
7. **Hand over.** Run `/dev-kit:finish-issue`, passing `N` when there is an issue. It reviews, then gives the user the commit, push and PR commands.

Report the root cause, the fix, the regression test and anything not verified.
