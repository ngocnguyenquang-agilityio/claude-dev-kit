# Audit backlog quick wins: A14, A18, A20 and A21

## Goal

Clear the open items of `docs/audit-backlog.md` that are small and settled: A14, A18, A20 and A21. Each is a false block, a wrong doc line or a failure in a common setup.

## Tasks

- [ ] A14: `plugins/dev-kit/hooks/package-manager-guard.mjs` lets read-only `npm view`, `npm ls`, `npm outdated` and `npm explain` through in a pnpm or yarn project; hook tests
- [ ] A18: `README.md` names the Node version CI tests (20+), or CI adds the version the README names
- [ ] A20: the `wipNote` name no longer collides for `feat/a-b` and `feat-a/b`; one helper computes it for `session-start`, `context-nudge`, `kit-config`, `session-state` (#84) and `handoff`; hook tests
- [ ] A21: `plugins/dev-kit/agents/reviewer.md` diffs against the local base branch when there is no `origin` remote, and says so in its report
- [ ] Remove the four items from `docs/audit-backlog.md`; `CHANGELOG.md` under Unreleased

## Acceptance criteria

- `npm view react version` passes the guard in a pnpm fixture; `npm install` is still blocked there.
- Branches `feat/a-b` and `feat-a/b` get different note paths.
- Manual check: the reviewer, run in a repository with no remote, diffs against the local base branch and says so in its report. The `review-*` evals cannot show this: they grant no `Bash`, so the reviewer never fetches.
- `node --test tests/hooks.test.mjs tests/inventory.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- A19 (version pins in CI) and the gotchas A25 and A26.
- Migrating notes already written under the old names.

## Depends on

#84
