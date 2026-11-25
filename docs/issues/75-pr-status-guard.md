# PR status guard: block gh pr create while the closed issue's status docs are not updated

## Goal

Pillar 1 (quality workflow). On #51 and #72 a PR that closed an issue was opened while the issue's index status cell still said `open`: Claude skipped `issue finish` and three text checks because it judged the work done. A PreToolUse hook checks the status docs in code before `gh pr create` runs, so that judgment cannot skip it.

Plan: [docs/plans/2026-11-25-pr-status-guard.md](../plans/2026-11-25-pr-status-guard.md)

## Tasks

- [x] New hook `plugins/dev-kit/hooks/pr-status-guard.mjs`, reusing `hooks/lib.mjs` and the config from `hooks/kit-config.mjs`: on a Bash or PowerShell `gh pr create`, find the issue number from `Closes/Fixes/Resolves #N` in `--body` or the `--body-file` contents, else from the branch's first `type(#N):` commit since the base branch. Allow when `issuesDir` is `null`, when no number is found, or when the body says `Refs #N` or `Part of #N`. Otherwise deny when the index has no row for `#N`, when that row's status cell is not `closed`, or when the issue file `<issuesDir>/<NN>-*.md` has an unticked `- [ ]` task. The reason names what is missing and says to run `/dev-kit:issue finish`
- [x] `plugins/dev-kit/hooks/hooks.json`: register it under `PreToolUse` with matcher `Bash|PowerShell`
- [x] `tests/hooks.test.mjs`: a `describe("pr-status-guard")` block covering allow (status docs complete, no issue, `Refs #N`, `issuesDir` null, a command that is not `gh pr create`) and deny (status `open`, an unticked task, no index row), with the number taken from `--body`, from `--body-file` and from the branch commit; extend the `hooks.json` wiring test
- [x] `docs/vision.md` Components (quality workflow hooks), `README.md` hooks section and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- `gh pr create --body "... Closes #N"` is denied while #N's index status is not `closed` or its issue file has an unticked task, and the reason says to run `/dev-kit:issue finish`.
- The same command passes once the status docs are complete, and a PR with `Refs #N` or with no issue passes.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes, and `node scripts/inventory.mjs` lists `pr-status-guard` with its tests.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- PRs opened outside Claude (GitHub web UI, another terminal).
- Changes to `safety-guard.mjs` (`docs/vision.md` keeps it closed to extensions).
- Checking `CHANGELOG.md` or whether the work behind a ticked task is really done.
- `glab` and other hosts.

## Depends on

none
