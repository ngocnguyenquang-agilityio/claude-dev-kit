# Plan: ship pr and working rules stop before a PR with stale status docs (#76)

Issue: [docs/issues/76-ship-pr-status-docs.md](../issues/76-ship-pr-status-docs.md)

## Goal

`ship pr` stops and names what is missing, with no PR draft, when the issue's status docs are not updated, and the working rules say a PR that closes an issue goes through `/dev-kit:issue finish` or comes after its status docs are updated.

## Steps

### 1. The eval case

**What** New folder `plugins/dev-kit/evals/ship-pr-status-docs/`, shaped like `evals/ship-commit/` and `evals/issue-start-small/`:

- `case.yaml`: `schema_version: "1.1"`, `name: ship-pr-status-docs`, `context.scaffold_script: fixture.sh`.
- `fixture.sh`: a small module with `docs/issues/README.md` holding a row `| 14 | [...](14-<slug>.md) | open | none |` and `docs/issues/14-<slug>.md` with one ticked and one unticked task; `git init -b main`, a base commit, then a branch `feat/<slug>` with a `feat(#14): ...` commit that does the work. Modelled on `evals/issue-start-small/fixture.sh`.
- `prompt.md`: front matter `max_turns: 15`, `allowed_tools: [Read, Glob, Grep, Skill]`; the body is `/dev-kit:ship pr 14` plus a line that the session has no shell, so skip the git and gh steps and use the files in `docs/issues/`. Per `docs/memory/skill-evals.md`, the prompt names the command, since the case grades output, not triggering.
- `graders/criteria.md` (`type: llm`): PASS if the reply stops without a PR title or body, names what is missing (the unticked task and/or the index status `open` instead of `closed`) and points to `/dev-kit:issue finish`. FAIL if it prints a PR title or a body with Summary/Evidence/`Closes #14`, or only suggests `issue finish` while still drafting the PR.
- `graders/no-git-write.md`: a copy of `evals/ship-commit/graders/no-git-write.md` (inert without `Bash`, kept for the same reason).

**Done when** `claude plugin validate --strict plugins/dev-kit` passes, and one run on the current `pr.md` (`claude plugin eval plugins/dev-kit --case ship-pr-status-docs --scaffold --allow-tools Edit Write --ablation none --judge-model sonnet --runs 1`) completes with a score recorded (a fail is expected and is the baseline).

### 2. `pr.md` step 4 stops

**What** `plugins/dev-kit/skills/ship/references/pr.md` step 4: with `N` and `issuesDir` set, and not when run from `/dev-kit:issue finish`, check the issue file for unticked `- [ ]` tasks and the index row's status cell for `closed`. If either is not done, stop: name each missing item, tell the user to run `/dev-kit:issue finish`, and print no title or body. Step 5 then runs only when step 4 passes.

**Done when** `grep -n "suggest" plugins/dev-kit/skills/ship/references/pr.md` gives 0 hits in step 4, and step 4 names both checks (`- [ ]` tasks and the status cell `closed`) and the stop.

### 3. Working rule

**What** `plugins/dev-kit/rules/working-rules.md`, **Git** section: one line, "A PR that closes an issue is opened only through `/dev-kit:issue finish`, or after its status docs (ticked tasks and index status `closed`) are updated."

**Done when** `grep -n "issue finish" plugins/dev-kit/rules/working-rules.md` shows the new line under **Git**, and `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes (session-start tests read the rules file).

### 4. Eval runs (this session)

**What** Run, with `--scaffold --allow-tools Edit Write --ablation none --judge-model sonnet`:
- `--case ship-pr-status-docs` (3 runs).
- `--case ship-commit` (3 runs). If it scores below 3 of 3, run it on `main` too to compare.

**Done when** `ship-pr-status-docs` passes 3 of 3, and `ship-commit` scores no lower than on `main` (3 of 3 in #55). A failing lot goes back to step 2 or the grader once, with the reason recorded for the CHANGELOG.

### 5. Docs

**What**
- `README.md` evals paragraph: add "a PR for an issue whose status docs are not updated" to the `ship` cases, and list `ship-pr-status-docs` with the cases that grade the answer text only.
- `CHANGELOG.md`: a `- Changed:` entry for #76 at the top of Unreleased: what changed in `pr.md` and the rules, the new eval and its results from step 4 (with the step 1 baseline), and its limits (no shell in evals on Windows, so the git steps of `ship pr` are not covered).

**Done when** `grep -n "ship-pr-status-docs" README.md CHANGELOG.md` shows a hit in each file.

### 6. Checks and review (this session)

**Done when** `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 failures, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` both pass, and `review` reports no Block finding.

## Out of scope

- `pr-status-guard.mjs` (#75, merged).
- `issue finish` itself, and `ship commit`'s step 3 (it still suggests).

## Decisions and assumptions

- The eval comes first and gets one run on the old `pr.md`, so the CHANGELOG can say whether the case tells the change apart (as #69 did). That run is 1 of the ~7 extra eval runs this issue costs.
- The `pr.md` check reads the same things the PR status guard checks (unticked `- [ ]` task lines and a status cell other than `closed`), so the skill and the hook agree on "done".
- No `skill-fired` grader: a slash command in the prompt is not a `Skill` call (same as `ship-commit`).
- `impact-mapper` is not run: the issue names every file, and the change is prose in two Markdown files plus a new eval folder.

## Open questions

none
