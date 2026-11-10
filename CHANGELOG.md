# Changelog

## 0.4.3 - 2026-11-10

- Fixed: `issue finish` puts the status docs in the same commit and PR as the work instead of a separate "mark issue done" PR. It checks the branch's PR state first: it pushes to an open PR without `gh pr create`, and stops on a merged one. `ship commit` (on the commit that completes the issue) and `ship pr` suggest `issue finish` first when the issue's status docs are untouched.

## 0.4.2 - 2026-11-10

- Changed: `grill` asks only questions whose answer changes the work, at most 4 per round, and puts small choices under Assumptions. It looks facts up with an `Explore` sub-agent without blocking the interview, uses `AskUserQuestion` when a question has clear options, and pushes back once on conflicting or risky answers. Its summary has fixed sections (Decisions, Assumptions, Out of scope, Open risks), which `plan` starts from.
- Added: `grill-repo-fact` and `grill-pushback` evals; `grill-vague-request` fails a round of more than 4 questions.

## 0.4.1 - 2026-11-09

- Changed: `debug` gates each step (a red loop before hunting the cause, the cause in one sentence before any fix), reverts a failed fix instead of stacking another, and stops to ask after 3 failed fixes. It writes the regression test before the fix, has a short red-flags list and a default report format, and moves tracing techniques to `references/tracing.md`.
- Changed: `issue fix` and `pr-followup ci` defer to `debug` instead of restating its rules.
- Added: `debug-flaky` and `debug-no-repro` evals, and `debug-root-cause` now grades the cause, the fix at the source and the named regression test separately.

## 0.4.0 - 2026-11-05

- Breaking: `new-issue`, `start-issue`, `finish-issue` and `hotfix` are now `/dev-kit:issue new|start|finish|fix`, and `commit-msg` and `pr-body` are now `/dev-kit:ship commit|pr`. The old names are removed, with no aliases.
- Breaking: `ci-fix` and `pr-feedback` are now `/dev-kit:pr-followup ci|comments`. The old names are removed, with no aliases.
- Breaking: `standup` is removed. `handoff` stays `/dev-kit:handoff`, and Claude does not start it on its own. The note format and its path are unchanged.
- Breaking: `sessionStart.rules` is removed from `.claude/kit.json`; the working rules always print.
- Added: the MIT license.
- Changed: the plugin and README describe a personal kit instead of a portable one.
- Changed: the working rules shrink to seven lines. The git, run-the-checks, skill-trigger and general style rules are gone, because hooks enforce them or the skill descriptions carry them.
- Changed: the `plan` description names the 3-file threshold, and the `debug` description fires before any fix.
- Changed: `pr-followup` prints its git commands and runs one only after you say yes to it, like `issue finish`. `ship` still only prints.
- Changed: every skill that calls `review` runs it unless it already ran on the same diff.
- Fixed: `ship` points to `issue-number.md` instead of "the shared rule".
- Changed: `issue finish` drafts the commit and PR text through `ship` instead of repeating it, and the issue-number rule lives in one file shared by `issue` and `ship`.
- Changed: `review` runs after any file change, docs and config included, instead of skipping text-only diffs.
- Changed: the `reviewer` agent owns the six review axes and one set of levels (Block, Should fix, Nit); the `review` skill only hands over to it, fixes and re-runs the checks, instead of splitting the axes and keeping two sets of labels.
- Fixed: the `debug` eval starts from a project with a failing test instead of code pasted in chat, so it now measures the skill firing (6 of 6 runs, was 0 of 4).

## 0.3.0 - 2026-11-02

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
