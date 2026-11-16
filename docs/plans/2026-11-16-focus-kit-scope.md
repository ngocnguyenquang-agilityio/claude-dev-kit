# Plan: focus the kit on its purpose

Goal: write down what dev-kit is for (better code quality and memory across sessions, for one user, with the safety guard as a base layer), then cut the parts that do not serve it: the skills `tdd`, `pr-followup` and `release`, and the agent `ui-verifier`.

Decisions come from the grill session of 2026-11-16 (inventory first, then four rounds of questions). One plan, one issue, one branch, because every step edits the same few files (README, both manifests, the backlog).

## Steps

1. **Start from a current `main`.** What: you run `git switch main && git pull`, then `git switch -c chore/focus-kit-scope` (local `main` lacks PR 44; this plan file and the uncommitted `.claude/settings.json` change carry over). Done when: `git log -1 --oneline` shows the merge of PR 44 and `git branch --show-current` prints `chore/focus-kit-scope`.
2. **File the issue.** What: `/dev-kit:issue new` for "Focus the kit on its purpose"; add `docs/issues/NN-focus-kit-scope.md` and its row in `docs/issues/README.md`; link this plan from the issue file. Done when: the issue exists on GitHub and `grep -n "focus-kit-scope" docs/issues/README.md` gives 1 hit.
3. **Write `docs/vision.md`.** What: one page in English with these headings: Purpose (one sentence), Who it is for (one user), Pillars (quality workflow, session memory, safety guard), Components (every remaining skill, agent and hook placed under one pillar), Not in scope, Gate for new components (names the pillar it serves and ships with at least one eval), Review cadence (inventory with usage and eval coverage before every minor release), Roadmap (see step 9). Done when: `wc -l docs/vision.md` prints 60 or fewer lines, all eight headings are present, and every name in `ls plugins/dev-kit/skills plugins/dev-kit/agents` plus the five hook groups appears under a pillar.
4. **Add two lines to `plugins/dev-kit/rules/working-rules.md`.** What: under a new `**Scope of the kit**` heading, one line saying that changes to the dev-kit plugin itself must serve code quality, session memory or safety and come with an eval, and one line pointing to `docs/vision.md` for what is out of scope. Worded so they do nothing in other projects. Done when: `node plugins/dev-kit/hooks/session-start.mjs` prints both lines and `grep -c "vision.md" plugins/dev-kit/rules/working-rules.md` prints 1.
5. **Remove `tdd`.** What: in `plugins/dev-kit/skills/issue/references/fix.md` step 4, drop "Use the `tdd` skill:" and add one sentence: test behavior through the public interface, not internals, and ask before adding a test setup the project lacks. In `plugins/dev-kit/skills/debug/SKILL.md` line 32 drop "with the `tdd` skill". Then delete `plugins/dev-kit/skills/tdd/`. Done when: `grep -rni "tdd" plugins/` gives 0 hits and `ls plugins/dev-kit/skills` has no `tdd`.
6. **Remove `pr-followup` and `release`.** What: in `plugins/dev-kit/skills/issue/references/finish.md` line 26 drop the two `/dev-kit:pr-followup` pointers and keep "Read `gh pr checks` and report failures". Delete `plugins/dev-kit/skills/pr-followup/` and `plugins/dev-kit/skills/release/`. Done when: `grep -rn "pr-followup\|dev-kit:release\|skills/release" plugins/ README.md .claude-plugin/` gives 0 hits (the `release` entries in `safety-guard.mjs` and `tests/hooks.test.mjs` are the `gh release` command and stay).
7. **Remove `ui-verifier`.** What: delete `plugins/dev-kit/agents/ui-verifier.md`; check `.claude/launch.json` and the rest of the repo for a leftover reference. Done when: `grep -rn "ui-verifier" plugins/ README.md .claude-plugin/ .claude/launch.json` gives 0 hits and `ls plugins/dev-kit/agents` shows `impact-mapper.md` and `reviewer.md` only.
8. **Update the docs that list components.** What: in `README.md` remove the `tdd`, `pr-followup` and `release` table rows, take `pr-followup` and `release` out of the sentence about `kit-config.mjs` (line 51), take `ui-verifier` out of the Agents line (line 55), take `pr-followup` out of line 57, and add a one-line pointer to `docs/vision.md`. In `plugins/dev-kit/.claude-plugin/plugin.json` remove "TDD" from `description` and `"tdd"` from `keywords`; in `.claude-plugin/marketplace.json` remove `tdd` from `description`. Done when: `grep -rniE "tdd|pr-followup|ui-verifier" README.md .claude-plugin/ plugins/dev-kit/.claude-plugin/` gives 0 hits and both `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` print "Validation passed".
9. **Update `docs/audit-backlog.md`.** What: delete A6 (`~/.claude/skills` is empty), A9 (`release` is gone) and A22 (`tdd` is gone); rewrite A7 as "move the rules in `~/.claude/rules` into the kit so one source remains"; keep A11 unchanged. Done when: `grep -nE "^- A(6|9|22)\." docs/audit-backlog.md` gives 0 hits, the A7 line mentions one source, and the A11 line is still there.
10. **Add the roadmap to `docs/vision.md`.** What: list, in this order, each with a "done when" in one line: A11 (stop-checks work without `package.json`, tried on this repo), A7 (rules in one place), evals for `handoff` and `ship`, kit-owned memory store (only after the first three, with an eval, and after finding how to turn off native auto-memory). Done when: the Roadmap section has 4 items, each with a measurable done-when.
11. **Changelog, version, checks and review.** What: `CHANGELOG.md` entry 0.10.0 saying only what was added or changed (`docs/vision.md`, the scope lines in the working rules, `issue fix` and `debug` carrying the red-step guidance themselves); `plugin.json` to 0.10.0. Then `node --test tests/hooks.test.mjs`, both validations again, and the `review` skill. Done when: tests report 324 pass, 0 fail; both validations print "Validation passed"; `grep -n '"version"' plugins/dev-kit/.claude-plugin/plugin.json` shows 0.10.0; review has no Block items.

## Out of scope

- Doing A7 or A11 (steps 9 and 10 only record them), and any change inside `~/.claude`.
- The kit-owned memory store, evals for `handoff` and `ship`, and support for stacks other than the ones this repo uses.
- Past records: old CHANGELOG entries, `docs/issues/*` and earlier `docs/plans/*` keep their mentions of the removed parts. The status of #34 in `docs/issues/README.md` stays as it is.
- The `ponytail`-style code cleanup and any refactor; those wait until this plan is merged.
- Fixing the `debug` eval that never fires the skill.

## Decisions and assumptions

- Carried over from the grill: for one user; purpose is code quality plus memory across sessions; the kit is the only source of skills and rules; `handoff` and native auto-memory split the memory job; the safety guard stays as its own pillar and is not extended; new components must name their pillar and ship with an eval; inventory before every minor release; direction lives in `docs/vision.md` plus two working-rules lines.
- Removal means delete: no "Removed" line in the CHANGELOG or README, no parked folder. Recoverable from git.
- 0.10.0 because the plugin loses skills; the CHANGELOG entry does not name them, as you asked.
- All files are written in English, as the working rules say.
- Not verified by this plan: the new red-step sentence in `issue fix` (that mode has no eval), and whether `claude plugin validate` passes before step 8 is run. The test count of 324 is the number in the README today.
- Git writes (switch, pull, commit, push, PR) are yours: the plan prints the commands, you run them.

## Open questions

- None that block the plan.
