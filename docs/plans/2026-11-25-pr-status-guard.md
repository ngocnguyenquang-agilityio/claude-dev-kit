# Plan: PR status guard (#75)

Issue: [docs/issues/75-pr-status-guard.md](../issues/75-pr-status-guard.md)

## Goal

A PreToolUse hook denies a Bash or PowerShell `gh pr create` while the issue it closes still has an index status other than `closed` or an unticked task in its issue file, so a PR cannot be opened before `/dev-kit:issue finish` has updated the status docs.

## Steps

### 1. The hook and its tests

**What**

- New `plugins/dev-kit/hooks/pr-status-guard.mjs`, shaped like `plugins/dev-kit/hooks/package-manager-guard.mjs`: `readStdinJson()` for `tool_input.command`, `loadConfig()` for `issuesDir` and `detectBaseBranch(config)` + `issuesFromCommits(base)` for the commit number, all from `plugins/dev-kit/hooks/lib.mjs`. Deny with `console.error(reason)` and `process.exit(2)`.
- Detection: a segment from `commandSegments(command, { blankQuotes: true })` whose binary (`binaryName(words[commandIndex(words)])`) is `gh` and whose next two words are `pr create`. Anything else exits 0 at once.
- Allow (exit 0) when `issuesDir` is `null`.
- Body text = the raw command string, plus the contents of the file named by `--body-file` or `-F` (the path word is taken from `commandSegments(command)` without `blankQuotes`, resolved against `projectDir`; an unreadable file adds nothing).
- Numbers, first rule that matches:
  1. `(Closes|Fixes|Resolves) #N`, any case, in the body text: check every such N.
  2. `Refs #N` or `Part of #N` in the body text: allow.
  3. `issuesFromCommits(base)[0]`: check that N.
  4. None: allow.
- Check for N, with `<NN>` the number zero-padded to two digits:
  - The index `<issuesDir>/README.md` has a table row whose first cell is `N`; missing file or row → deny "no row for #N in <index>".
  - That row's third cell (Status) trimmed equals `closed`; else deny "#N's status in <index> is `<cell>`, not `closed`".
  - The issue file `<issuesDir>/<NN>-*.md`, when one exists, has no line matching `- [ ]`; else deny "<file> has N unticked task(s)".
  - Every deny reason ends with "Run /dev-kit:issue finish before opening the PR."
- `tests/hooks.test.mjs`: a `describe("pr-status-guard", ...)` block before the `hooks.json` block, using `makeProject`, `branchWithCommits`, `runHook` and `bash`. Allow cases: status `closed` with all tasks ticked; no issue number anywhere; `Refs #N`; `Part of #N`; no `docs/issues` folder (`issuesDir` null); a command that is not `gh pr create` (`gh pr view`). Deny cases: status `open`; an unticked task; no index row. The number comes from `--body` (Bash), from `--body-file`, and from the branch commit `feat(#N): ...`; one deny case runs as PowerShell input.

**Done when** `node --test tests/hooks.test.mjs` passes, with the new `pr-status-guard` tests among the passes and 0 failures.

### 2. Register the hook

**What**

- `plugins/dev-kit/hooks/hooks.json`: add `pr-status-guard.mjs` to the existing `PreToolUse` group whose matcher is `Bash|PowerShell`, with the same command shape as `package-manager-guard.mjs`.
- `tests/hooks.test.mjs`: extend the `hooks.json` wiring block with an assertion that `pr-status-guard.mjs` is registered under `PreToolUse` with matcher `Bash|PowerShell`.

**Done when** `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 failures, and `node scripts/inventory.mjs` prints a `pr-status-guard` row whose tests column is greater than 0.

### 3. Docs

**What**

- `docs/vision.md`: add "PR status guard" to the Quality workflow Hooks line.
- `README.md`: a row for the hook in the hooks table, and the test counts near line 139 recounted from the step 2 run.
- `CHANGELOG.md`: an `- Added:` entry for #75 at the top of Unreleased that says what it blocks, what passes, that it is covered by hook tests and not an eval, and its limits (PRs opened outside Claude; the body is scanned as raw text, so a `Closes #N` in the title also counts).

**Done when** `grep -n "pr-status-guard\|PR status guard" docs/vision.md README.md CHANGELOG.md` shows a hit in each of the three files, and the README test counts equal the totals from the step 2 run.

### 4. Checks and review (this session)

**What** Run every check and the `review` skill.

**Done when** `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes with 0 failures, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` both pass, and `review` reports no Block finding.

## Out of scope

- PRs opened outside Claude, `glab` and other hosts.
- Changes to `safety-guard.mjs`. It still asks on `gh pr create`; the new hook may deny before or after that ask.
- Checking `CHANGELOG.md`, or whether the work behind a ticked task is done.
- `issue finish`, `ship pr` and the working rules (#76).

## Decisions and assumptions

- Tests, not an eval. `docs/vision.md` asks every new hook for an eval, but evals on Windows cannot run `Bash`, so no eval can reach `gh pr create`; context nudge (#53) and stop checks (#51) set the precedent of hook tests only. The CHANGELOG entry says so.
- The body is scanned as the raw command text instead of parsing `--body`'s quoting, which differs between Bash, PowerShell and here-strings. The cost: a `Closes #N` in the title counts as well, which is still a PR that closes N.
- A closing keyword wins over `Refs`/`Part of` when both appear, since the PR still closes that issue.
- Every closing number is checked, so a PR closing two issues needs both status docs done.
- The commit fallback uses the first number from `issuesFromCommits`, not `branch.issue` from `kit-config.mjs`, which is null when the branch names two issues; `kit-config.mjs` has no exports, so `loadConfig()` from `lib.mjs` stands in for it.
- A missing issue file is not a deny: the index row is the check that every issue has, and an issue file is only written when `issuesDir` is set.
- Deny is exit code 2 with the reason on stderr, as in `package-manager-guard.mjs`.

## Open questions

none
