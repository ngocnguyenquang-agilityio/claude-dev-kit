# Ship pr and working rules: stop before a PR whose issue's status docs are not updated

## Goal

Pillar 1 (quality workflow). Step 4 of `ship/references/pr.md` only suggests `/dev-kit:issue finish` when the status docs are untouched, and the working rules say nothing about status docs before a PR; on #72 both were passed over. Make `pr.md` stop instead of suggest, and add one working rule, so the common path is right the first time and the PR status guard hook rarely has to block.

## Tasks

- [ ] `plugins/dev-kit/skills/ship/references/pr.md` step 4: when the issue's status docs (its ticked tasks and its index status cell `closed`) are not updated, stop, name what is missing and tell the user to run `/dev-kit:issue finish`; print no title or body. Keep the existing exception for a run from `issue finish`
- [ ] `plugins/dev-kit/rules/working-rules.md` **Git**: one line saying a PR that closes an issue is opened only through `/dev-kit:issue finish`, or after its status docs (ticked tasks and index status `closed`) are updated
- [ ] New eval `plugins/dev-kit/evals/ship-pr-status-docs`: a fixture branch whose issue file has an unticked task and an index row still `open`; the prompt asks for `/dev-kit:ship pr`. `llm` grader: the reply stops, names the missing status docs and points to `issue finish`, with no PR title or body
- [ ] `README.md` (evals paragraph) and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- `ship pr` on a branch whose status docs are not updated stops and names what is missing, without a PR draft.
- `ship-pr-status-docs` passes 3 of 3 runs with the `sonnet` judge, `--ablation none` and `--scaffold`; `ship-commit` scores no lower than on `main`.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- The hook that blocks `gh pr create` (the PR status guard issue).
- Changes to `issue finish` itself.

## Depends on

none
