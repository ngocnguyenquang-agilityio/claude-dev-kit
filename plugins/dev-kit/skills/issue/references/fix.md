# issue fix

Fix: $ARGUMENTS

A bug flow keeps the fix small and proves it with a test. Each step ends when its check holds.

1. **Issue.** If `$ARGUMENTS` is an issue number, read it with `gh issue view`. If it is a description and there is no issue yet, offer `/dev-kit:issue new` and wait for the user's choice. The issue is optional: the fix can go ahead without one.
2. **Branch.** With an issue `N`, follow `references/start.md` steps 1 to 4 with type `fix`. Without one, follow its steps 1 and 2, then `git checkout -b fix/<slug>` with a 2-4 word kebab-case slug from the bug. Done when `git branch --show-current` prints `fix/<slug>`.
3. **Root cause.** Use the `debug` skill up to its step 2 gate; steps 4 and 5 below are its fix step. State the root cause in one sentence before changing code.
4. **Red.** Use the `tdd` skill: write one test at the seam closest to the bug. Run it. It must fail for the reason you named in step 3.
5. **Green.** Make the smallest change that removes the cause. Run the new test, then the project's full checks. Done when all pass. Still red: follow the `debug` skill's failed-fix rule (revert, back to step 3, stop after 3 failed fixes).
6. **Scope.** Note any other problem you found as a follow-up. Do not fix it in this branch.
7. **Hand over.** Follow `references/finish.md`, passing `N` when there is an issue. It reviews, then gives the user the commit and push commands, and the PR command when the branch has no PR yet.

Report the root cause, the fix, the regression test and anything not verified.
