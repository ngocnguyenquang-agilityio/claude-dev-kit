# Stop checks: run without package.json, re-run on config edits, report timeouts

## Goal

Stop checks run on this repo and report real results, re-run when a check's config changes, and say so when a check times out, instead of failing silently. Covers audit points A11, A12 and A13.

## Tasks

- [x] A13: `run()` in `plugins/dev-kit/hooks/lib.mjs` takes a `timeout`; a timed-out command counts as a failure with its own message. `stop-checks.mjs` gives each check a limit under the hook's 300 s, so the message reaches Claude (exit 2)
- [x] A12: `package.json` and eslint config files count as changes that trigger the checks, and untracked ones go into the fingerprint
- [x] A11: drop the `hasPackageJson` early exit in `stop-checks.mjs`. Add `checks` to `.claude/kit.json` as argv arrays (for example `{"test": ["node","--test","tests/"]}`), run with no shell
- [x] A11: with no `package.json` and no `checks`, detect `*.test.{js,mjs,cjs}` files and run `node --test` on them
- [x] Add tests to `tests/hooks.test.mjs` for each of the three, plus one that a repo with none of them still exits 0 quietly
- [x] Update `README.md` (Stop checks row and `kit.json` keys), add a CHANGELOG entry, remove A11, A12 and A13 from `docs/audit-backlog.md`, and add `checks` to this repo's `.claude/kit.json` if the detection does not cover it

Work in the order A13, A12, A11, one commit each, so the review stays small. If A11 grows, split it into its own issue.

## Acceptance criteria

- In this repo (no `package.json`), editing `plugins/dev-kit/hooks/lib.mjs` makes the Stop hook run `node --test` and return its failure with exit 2.
- A check that exceeds its limit exits 2 with the command and the limit named.
- Editing only `package.json` or an eslint config runs the checks once; an unchanged tree skips them.
- A `checks` entry is never run through a shell.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.
- Eval or test evidence: the kit's scope rule asks for an eval with a change to the plugin; this is hook code, so the hook tests above are its evidence. Say so in the PR.

## Out of scope

- Other languages' test runners (Python, Go).
- `relatedTests` for `node --test`.
- Any change to `safety-guard.mjs`.

## Depends on

none
