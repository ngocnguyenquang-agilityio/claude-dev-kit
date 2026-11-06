# Safety guard: ask before any gh or glab command that is not read-only

## Goal

The safety guard asks the user before every `gh`/`glab` command that can write to the remote, by allowing only known read-only commands instead of listing the write commands. Today `gh api ... -f body=x` sends a POST without a prompt, `gh run rerun`, `gh workflow run`, `gh repo delete` and `gh secret set` are not caught at all, and even `gh api repos/{owner}/{repo}/... -X POST` gets through: `commandSegments` in `lib.mjs` splits on `{` and `}`, so the method flag lands in a segment whose command is not `gh`.

## Tasks

- [x] Check `gh`/`glab` commands with `{` and `}` kept inside the word, so the `{owner}/{repo}` placeholders the skills use no longer split one command into several segments.
- [x] In `plugins/dev-kit/hooks/safety-guard.mjs`, replace the `GH_WRITES` denylist in `riskOf` with an allowlist of read-only `gh` group/action pairs, for example `pr view|diff|list|checks|status`, `issue view|list|status`, `run view|list`, `release view|list`, `repo view`, `workflow view|list`, `search`, and `auth status` without `--show-token`. Anything else gets an "ask". `auth token` stays off the list.
- [x] Decide which other read-only verbs to allow rather than prompt: `label list`, `secret list`, `variable list`, `run watch`.
- [x] `gh api` is read-only only when the method is GET (default or explicit) and no body flag is present. Match the separate and the attached forms: `-f`/`-fkey=v`, `-F`/`-Fkey=v`, `--field`/`--field=k=v`, `--raw-field`/`--raw-field=k=v`, `--input`/`--input=file`, and for the method `-X POST`, `-XPOST`, `--method POST`, `--method=POST`. `gh api -X GET -f q=x` stays read-only, because GET sends the fields as query parameters.
- [x] Give `glab` the same treatment, with its read-only verbs: `mr view|list|diff`, `issue view|list`, `ci list|status|get|trace`, `repo view`, `release view|list`, `auth status`, and `api` with the same GET rule. `glab ci view` is interactive and can retry or cancel jobs, so it asks.
- [x] Decide whether the reviewer's `INSPECTING_GH` and the new allowlist share one definition, so the two lists cannot drift.
- [x] Add tests in `tests/hooks.test.mjs`: each previously missed write asks (`api -f`, `api -F`, `api --input`, an attached form such as `api -fbody=x`, `api -XPOST`, the `{owner}/{repo}` forms, `run rerun`, `run cancel`, `workflow run`, `repo delete`, `secret set`, `label create`), and every read the skills rely on runs without a prompt.
- [x] Update the Safety guard row and the test count in `README.md`.

## Acceptance criteria

- Every `gh` call the skills make runs without a prompt: `gh pr checks`, `gh pr view --json ...`, `gh pr list --state all -L 1`, `gh pr list --state merged ...`, `gh run list ... --json ...`, `gh run view <id> --log-failed`, `gh issue view 12`, `gh issue list --state all -L 1`, `gh api repos/{owner}/{repo}/pulls/<N>/comments`.
- `gh api repos/{owner}/{repo}/issues/1/comments -f body=x` and `gh api repos/{owner}/{repo}/pulls/1/comments -X POST` return an "ask" decision.
- With `guard.git` set to `"deny"`, the commands that ask are blocked and the read-only ones still pass; with `"off"`, all of them pass.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

none
