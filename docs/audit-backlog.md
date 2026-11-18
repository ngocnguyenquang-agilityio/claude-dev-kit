# Audit backlog

Open points from the dev-kit audit, numbered A6-A26 to keep them apart from issue numbers. A1-A5 shipped as #15-#17. File each one as an issue with `/dev-kit:issue new` before working on it, then remove it here.

Done since the audit: A8 (handoff notes never expired) and A10 (`handoff` `allowed-tools` missing git commands and writes), both in #28; A15 (README test count), A22 for `issue` (#30) and `review` (#32); A7 (`~/.claude/rules` is empty, the rules live in the kit); A11, A12 and A13 in #51.

## Medium

- A14. The package-manager guard blocks read-only `npm view`/`npm ls` in pnpm projects.

## Low

- A18. README says Node 18+; CI tests Node 20 only.
- A19. CI pins `claude-code` to an exact version and `actions/*` by the `@v4` tag, with no bump reminder.
- A20. `wipNote` names collide (`feat/a-b` vs `feat-a/b`).
- A21. The reviewer's `git fetch origin <base>` fails without a remote.

## Evals

- A23. The `grill` 1.0 score has no baseline.

## Gotchas

- A25. Editing `safety-guard.mjs` in this repo can lock every tool: the live hook runs from the working file with `onFailure: "block"`. Edit it in small steps that each leave it runnable.
- A26. The reviewer agent's read-only guard blocks Windows backslash paths (`cd D:\...`), commands not on its list (`node --test`, `sed`) and redirects that write. Use forward slashes or `git -C`.
