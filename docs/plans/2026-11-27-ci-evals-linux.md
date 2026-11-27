# Plan: run the eval suite on Linux in CI (#81)

Goal: add a manual (and weekly) Ubuntu workflow that runs `claude plugin eval` with `Bash` granted, and make the five shell-blind cases use that shell, without breaking them on Windows.

Issue file: `docs/issues/81-ci-evals-linux.md`

- [x] 1. Find out how `Bash` is granted to a case
  - **What**: no repo change. Run `claude plugin eval plugins/dev-kit --help` and read what `--allow-tools` does against a case's front-matter `allowed_tools`. Run `ship-commit` once locally on Windows with `Bash` added to its front matter to see whether it is refused or ignored. Record the answer under Decisions in this file.
  - **Done when**: this file's Decisions says, for each of CLI `--allow-tools Bash` and front-matter `Bash`, whether it works on Windows and on Linux.
- [x] 2. Make the five prompts shell-aware
  - **What**: `plugins/dev-kit/evals/{ship-commit,ship-pr-status-docs,issue-start-plan,issue-start-small,plan-implementer-dispatch}`: grant `Bash` the way step 1 found works; in the three prompts that say "This session has no shell, so skip the git and gh steps", reword so git steps run when a shell exists and are skipped when not, and cover the failed `git fetch origin` (the fixtures create no `origin` remote). Update `issue-start-small/graders/criteria.md:6` to the new wording, and the "inert while Bash is not granted" line in both `no-git-write.md` graders.
  - **Done when**: `grep -rn "This session has no shell" plugins/dev-kit/evals` prints 0 hits, and the five cases still pass 3 of 3 on Windows with the command in `README.md` (`--ablation none --scaffold --judge-model sonnet`).
- [x] 3. Add `.github/workflows/evals.yml`
  - **What**: new file. `ubuntu-latest`, `on: workflow_dispatch` plus a weekly `schedule`; checkout, setup-node 20 and the pinned `npm install --global @anthropic-ai/claude-code@2.1.314` copied from `ci.yml`; a first step that exits with a clear message when the `CLAUDE_CODE_OAUTH_TOKEN` secret is empty; run `claude plugin eval plugins/dev-kit --scaffold --allow-tools Bash Edit Write --ablation none --judge-model sonnet --trust-plugin --no-publish`; `actions/upload-artifact` on `plugins/dev-kit/evals/results/*/aggregate-result.json` with `if: always()`; `permissions: contents: read`.
  - **Done when**: `claude plugin validate --strict .` prints no errors, and the YAML parses (`node -e` with a YAML check, or `gh workflow view evals.yml` after push, 0 errors).
- [x] 4. Docs
  - **What**: `README.md` line 145 ("Run them by hand, not in CI") and line 151 ("Shell tools cannot be granted..."): say the suite also runs on Linux by manual dispatch, name the `CLAUDE_CODE_OAUTH_TOKEN` repository secret the user must add, and keep the Windows command. `CHANGELOG.md`: an entry under Unreleased above #82's. `docs/memory/skill-evals.md`: one line on what step 1 found.
  - **Done when**: `grep -n "CLAUDE_CODE_OAUTH_TOKEN" README.md` shows 1 or more hits and `grep -n "not in CI" README.md` prints 0.
- [x] 5. Checks and review
  - **What**: no edits. Run the repo checks, then the `review` skill.
  - **Done when**: `node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs` shows 0 fail; `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass; the review has no Block findings.
- [ ] 6. One manual workflow run (needs the user) — run done, Done when not met: see Result of step 6
  - **What**: after the branch is pushed and the user has added the secret, trigger `gh workflow run evals.yml --ref feat/ci-evals-linux` and read the report.
  - **Done when**: the run finishes and uploads the report; in it `ship-commit`'s `no-git-write` sees `Bash` calls, and at least one of `issue-start-plan`, `issue-start-small` or `ship-pr-status-docs` ran a git step.

Acceptance mapping: manual run and its two checks, step 6; Windows still passing, step 2; tests and validation, step 5; secret named in README, step 4; stale prompts and graders, step 2.

## Out of scope

- Running evals on every push or PR; storing results in the repo (#82); A19 version pins.

## Decisions and assumptions

- Secret and env var are both named `CLAUDE_CODE_OAUTH_TOKEN`. Confirmed by the Linux run: `claude -p` and the eval log in with a token from `claude setup-token` in `CLAUDE_CODE_OAUTH_TOKEN`; the issue text says "API key" because that was the first assumption.
- The fixtures create no `origin` remote, so `git fetch origin main` fails on Linux once `Bash` is granted. The reworded prompts say to carry on when the fetch fails, instead of adding a remote to the fixtures, which keeps them unchanged.
- No test changes: no test reads `.github` or case front matter, and `inventory.mjs` skips `results` and reads only grader text.
- Step 6 is the only part that cannot run here: it needs a pushed branch and the repository secret.

- Step 1 (from `claude plugin eval --help`): `--allow-tools` is an operator grant for gated tools (Bash, Write, Edit), the same way the README already grants `Edit Write` to cases that list them in front matter. So a case lists `Bash` in `allowed_tools`, and it only takes effect where the run grants it: Linux CI passes `--allow-tools Bash`, the Windows command in the README does not. Assumed from the help text; step 2 confirmed it: all five cases listing `Bash` passed 3 of 3 on Windows without the grant.
- CI needs `--trust-plugin` (skips the first-run trust prompt) and `--no-publish` (keeps the report off claude.ai) in the eval command, and `--scaffold` is already there. Step 3 adds both.

## Open questions

- Does the CLI `--allow-tools Bash` override a case's front-matter `allowed_tools`, and does a front-matter `Bash` make a case fail on Windows? Step 1 answers it. If front-matter `Bash` breaks Windows, step 2 switches to Linux-only copies of the cases, and I will come back to you first.

## Result of step 6

Runs on `feat/ci-evals-linux` (a temporary `push` trigger, removed): GitHub parsed the file, the token logs in and the sandbox installs. `ship-commit` scored 1.00 on Linux, but `claude plugin eval` refuses `Bash` inside each case (`apply-seccomp ... Permission denied`, claude-code 2.1.314 and 2.1.322), so `no-git-write` saw no `Bash` calls and no git step ran. Two acceptance criteria stay open, so the PR uses `Refs #81`.
