# Safety guard: ask before discarding work or deleting a directory tree

## Goal

The safety guard asks the user before any command that throws away uncommitted work or deletes a directory tree, the same way it already does for `git reset --hard` and `rm -r`. Today `git checkout -- .`, `git restore .` and `git switch -C` run without a prompt, and on Windows `Remove-Item -r`, `ri`, `rd /s` and `del /s` get past the check.

## Tasks

- [ ] In `riskOf` in `plugins/dev-kit/hooks/safety-guard.mjs`, ask for the git commands that discard working-tree changes:
  - `git checkout` with `-f`/`--force`, `-p`, `--ours`/`--theirs`, or a pathspec. The command text alone cannot tell `git checkout src/a.js` from `git checkout feat/x`, so use this rule: ask when `--` is present, when an argument is `.` or contains a glob character, or when an argument names a file that exists in the project. Otherwise treat it as a branch. Note the gap that remains in a code comment.
  - `git checkout -B` (resets an existing branch).
  - `git restore`, unless it only touches the index: `--staged`/`-S` without `--worktree`/`-W`.
  - `git switch -C`/`--force-create`, and `git switch -f`/`--discard-changes`.
  - `git rm -f`.
- [ ] Keep the commands the skills run free of prompts: `git checkout <branch>`, `git checkout -b <branch>`, `git switch <branch>`, `git restore --staged <path>`, `git restore -S <path>`.
- [ ] Ask for `Remove-Item` with any abbreviation of `-Recurse` (`-r`, `-rec`, `-Recurse:$true`, ...) but not `-Recurse:$false`, and for its aliases `ri`, `del`, `erase`, `rd` and `rmdir` when they are recursive (`-r...` or `/s`).
- [ ] Add tests in `tests/hooks.test.mjs` for each new "ask" and for each command that must stay free.
- [ ] Update the Safety guard row and the test count in `README.md`.

## Acceptance criteria

- `git checkout -- .`, `git checkout .`, `git checkout README.md` (an existing file), `git restore src/a.js`, `git switch -C main` and `git checkout -B main` return an "ask" decision.
- `git checkout main`, `git checkout -b feat/x`, `git checkout feat/x`, `git switch main`, `git restore --staged a.js` and `git restore -S a.js` return nothing (no prompt).
- `Remove-Item -r dist`, `ri -Recurse dist`, `rd /s dist` and `del /s *.log` return an "ask" decision; `Remove-Item a.txt` and `Remove-Item -Recurse:$false a.txt` do not.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

#15 (same file and test file: start after #15 is merged to avoid conflicts)
