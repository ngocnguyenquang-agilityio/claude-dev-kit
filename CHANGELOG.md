# Changelog

## Unreleased

- Added: CI runs the hook tests and `claude plugin validate --strict` on Ubuntu and Windows.
- Added: eval cases for the `debug`, `grill` and `plan` skills, run by hand with `claude plugin eval`.
- Added: homepage, repository and category in the plugin and marketplace manifests.
- Changed: `commit-msg`, `pr-body`, `handoff` and `standup` descriptions say when to use them.
- Fixed: `plan` gives the final checks or review step a "Done when" check too.
- Changed: the README explains same-named personal skills and why settings stay in `.claude/kit.json`.

## 0.2.0 - 2026-10-30

- Added: the issue number comes from the branch's `<type>(#N)` commits, so branches no longer carry it (#1).
- Added: `start-issue` and `new-issue` can be picked by Claude, not only typed (#1).
- Fixed: hooks run without a shell, so a file name can no longer run a command (#1, #2).
- Fixed: tool calls are blocked when the safety guard itself fails (#1).
- Fixed: the "finished" notification is sent only after the stop checks pass (#1).
- Fixed: stop checks are skipped when the tree matches the last passing run (#2).
- Fixed: the `reviewer` agent can only run read-only commands (#2).
- Changed: `ui-verifier` is project-neutral and limited to the tools it needs (#2).
- Changed: commands moved to skills, and skills get the project config injected instead of asking Claude to run `kit-config` (#2).
- Breaking: branches are named `<type>/<slug>`; the old `<type>/<N>-<slug>` names are no longer read for the issue number (#1).

## 0.1.0 - 2026-10-29

- Added: the `dev-kit` plugin and its marketplace: safety, package-manager, format and stop-check hooks, the planning, debugging, TDD and review skills, the GitHub issue to PR workflow, and the `reviewer` and `ui-verifier` agents.
