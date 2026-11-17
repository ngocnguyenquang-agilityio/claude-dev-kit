# Safety guard: ask before editing files on the base branch

## Goal

Work started straight on `main` in a session, with no issue and no branch, because nothing stopped a file edit there and the rules never say to branch first. Make `safety-guard` ask the user before `Edit`, `Write` or `MultiEdit` changes a project file while the current branch is the base branch, and point at `/dev-kit:issue new`, so the issue-and-branch flow is enforced by code, not by Claude remembering it.

## Tasks

- [ ] In `plugins/dev-kit/hooks/safety-guard.mjs`, for `Edit`, `Write` and `MultiEdit`, read the branch and `baseBranch` through `lib.mjs` (`detectBaseBranch`, the same call `kit-config.mjs` uses) and ask when they match
- [ ] Skip the check for paths that are not project work: files outside the project directory (this covers the scratchpad and temp folders), `.claude/`, `docs/plans/` and `issuesDir`, which `issue new` and `issue start` write on the base branch, and a repository whose base branch has no commit yet
- [ ] Add `guard.baseBranch` to the defaults in `plugins/dev-kit/hooks/lib.mjs` (`"ask"` by default, `"deny"` blocks, `"off"` turns it off), next to `guard.git`
- [ ] Say in the ask message what to do: run `/dev-kit:issue new`, then `/dev-kit:issue start <N>`
- [ ] Add tests to `tests/hooks.test.mjs`: asks on the base branch, stays silent on a feature branch, honors `deny` and `off`, skips an outside path, and does nothing outside a git repository
- [ ] Add one line to `plugins/dev-kit/rules/working-rules.md` Workflow: start every change from an issue and a branch, never edit on the base branch
- [ ] Document `guard.baseBranch` in `README.md` next to `guard.git`, and add a CHANGELOG entry

## Acceptance criteria

- On the base branch, an `Edit` of a project file returns an "ask" decision whose text names `/dev-kit:issue new`. On `feat/x` the same call returns no decision.
- With `guard.baseBranch` set to `"deny"` the call is blocked (exit code 2); with `"off"` it passes.
- The check does not run a command taken from `kit.json` (the existing test "never runs a command hidden in the base branch name" still passes).
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.
- Eval or test evidence: the kit's scope rule asks for an eval with a change to the plugin; this guard is code, so the hook tests above are its evidence. Say so in the PR.

## Out of scope

- Blocking `git commit` on the base branch: `guard.git` already asks before every git write.
- Creating the issue or the branch for the user.
- Checking that the branch name matches an issue.
- A rule in the `issue` skill about when to start; this issue changes the guard only.
- `NotebookEdit`: it uses `notebook_path` and `hooks.json` does not route it to this hook.

## Depends on

none
