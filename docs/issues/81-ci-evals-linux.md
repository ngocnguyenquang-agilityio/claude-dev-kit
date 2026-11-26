# Evals: run the eval suite on Linux in CI so git and gh steps are covered

## Goal

Pillar 1 (quality workflow). Evals run on Windows have no shell, so almost every eval's Limits say the git and `gh` steps are not covered (`ship pr`, `issue start`, the implementer's Done when checks), and the `no-git-write` grader cannot fail. Run the eval suite on Linux in CI, where `Bash` can be granted, so those steps get real coverage.

## Tasks

- [ ] `.github/workflows/evals.yml`: an `ubuntu-latest` job on `workflow_dispatch` (optionally a weekly `schedule`), with `claude-code` pinned like `ci.yml`, running `claude plugin eval plugins/dev-kit --scaffold --allow-tools Bash Edit Write --ablation none --judge-model sonnet`
- [ ] Read the API key from a repository secret; the job fails with a clear message when the secret is missing. Name the secret in `README.md`; the user adds it
- [ ] Upload the JSON report as a workflow artifact
- [ ] Grant `Bash` in the cases whose Limits blame the missing shell (`ship-commit`, `ship-pr-status-docs`, `issue-start-plan`, `issue-start-small`, `plan-implementer-dispatch`), keeping them passing on Windows
- [ ] Settle the prompts that say "This session has no shell, so skip the git and gh steps" (`issue-start-plan`, `issue-start-small`, `ship-pr-status-docs`): word them so the git steps run when a shell is granted and are skipped when it is not, or add Linux-only variants
- [ ] `README.md` (evals paragraph) and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- One manual run of the workflow finishes and uploads the report.
- In that run, `no-git-write` in `ship-commit` sees `Bash` calls, so it can fail, and at least one of `issue-start-plan`, `issue-start-small` or `ship-pr-status-docs` runs a git step.
- The changed cases still pass on Windows with the command in `README.md`.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Running evals on every push or PR (cost).
- Storing results in the repo (#82).

## Depends on

none
