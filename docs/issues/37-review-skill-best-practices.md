# Review skill: verified findings, scoped rules, scope decisions and behavior evals

## Goal

The `review` skill and `reviewer` agent report fewer false positives, check design and the project rules that apply to each file, set levels by impact, re-check their own fixes once, and never revert a scope change without asking. Today the skill fixes every Block and Should fix item, so a false positive or a reverted scope change becomes an unwanted code change.

Plan: `docs/plans/2026-11-12-review-skill-best-practices.md`

## Tasks

Evals (`plugins/dev-kit/evals/`), written and run against the current skill first to get a baseline:

- [x] `review-clean-diff`: a correct change with code that looks like a bug but is not. Passes when the verdict is clean with no Block item.
- [x] `review-pre-existing-bug`: the base has a bug in a function the diff does not touch. Passes when that bug is not under Block or Should fix (a follow-up is fine).
- [x] `review-scope-change`: the diff also renames an unrelated helper. Passes when the rename is a Scope finding marked "needs your decision" and is not reverted.
- [x] Baseline run of the three new cases and `review-boundary-bug`; scores recorded here.
  - 2026-11-12, 3 runs per case, `--ablation none`, Windows (no shell in evals), $2.12: `review-boundary-bug` 1.0, `review-clean-diff` 1.0, `review-pre-existing-bug` 1.0, `review-scope-change` 0.5 (criteria 0 of 3, skill fired 3 of 3).
  - The reviewer could not run `git diff` in any run, so it reviewed the files as they are, not the change. `review-scope-change` failed because the rename was never seen as a change, not because it was reverted: all three runs left it to the user. The two new passing cases do not test the diff handling for the same reason.
  - Second baseline, 2026-11-12, with the `git diff` of the source file pasted into each new prompt, 3 runs per case, $1.51: `review-clean-diff` criteria 3 of 3, skill fired 1 of 3 (score 0.67); `review-pre-existing-bug` 1.0; `review-scope-change` 1.0 (the rename is a Should fix item marked "needs your decision", never reverted).
  - So no new case fails its criteria on the baseline: the current skill already leaves scope changes to the user and does not flag the bait or the pre-existing bug. The three cases are regression guards. The one gap is triggering: with a pasted diff, Claude reviewed `review-clean-diff` itself without the skill in 2 of 3 runs.
  - After the change, 2026-11-12, 3 runs per case, $2.22: `review-clean-diff` 1.0 (skill fired 3 of 3), `review-pre-existing-bug` 1.0, `review-scope-change` 1.0, `review-boundary-bug` criteria 2 of 3.
  - `review-boundary-bug` re-runs, $1.22: criteria 2 of 3 (one run named the level "Must fix"; the report now names the headings Block, Should fix and Nit), then 1 of 3 (two runs edited the code and reported the Block item as "Fixed"). Across the after runs: 5 of 9.
  - Baseline re-runs of `review-boundary-bug` on a copy of the plugin with `main`'s `review/SKILL.md` and `reviewer.md`, $1.26: 3 of 3, then 0 of 3, so 6 of 9 across all baseline runs. All three failing baseline runs and two of the four failing after runs edited the code and reported the Block item as fixed, and the judge failed them; of the other two after failures, one named the level "Must fix" (now fixed) and one met every criterion but lost the judge vote 1 to 2. So 6 of 9 before against 5 of 9 after is within the noise, not a regression. The criteria do not say whether a review that also fixes the bug passes, which is where most of the noise comes from.
  - `review-boundary-bug` criteria now say a Block finding reported as fixed still counts. Two runs on the changed skill, $1.26: 3 of 3 and 3 of 3, every judge vote PASS.

Reviewer (`plugins/dev-kit/agents/reviewer.md`):

- [x] Verify each Block item before reporting: re-read the cited lines and state the input or state that triggers it; an item that cannot be shown drops to Nit or is removed.
- [x] Add a "Do not flag" list: problems in code the diff does not touch (listed as Follow-ups), code that looks wrong but is correct, what a linter catches, rules silenced in the code, pedantic nitpicks.
- [x] Read `CLAUDE.md` and `AGENTS.md` in every directory on the path of a changed file, applied only to files under them. A Standards finding quotes the broken rule and names its file.
- [x] Add design and complexity to the Standards axis (needless abstraction, code that could be deleted, an existing simpler pattern ignored) as Should fix.
- [x] Levels: the axis mapping is the default; a finding may move one level up or down with a one-line reason tied to impact.
- [x] Report gains a Follow-ups list.

Skill (`plugins/dev-kit/skills/review/SKILL.md`):

- [x] Description in the third person with trigger phrases ("review my changes").
- [x] Pass the plan's file path under `docs/plans/`; drop "when it lives only in chat".
- [x] Scope items are reported as "needs your decision" and never reverted.
- [x] After a Block fix of more than a few lines, run the reviewer once more on the new diff; no third run.

Callers:

- [x] `skills/issue/references/finish.md` and `skills/ship/references/commit.md`: "Fix Block and Should fix items" excludes Scope items.

Docs:

- [x] Update `CHANGELOG.md`, the plugin version and the README `review` row and eval list.

## Acceptance criteria

- `review-clean-diff` fires the skill in 3 of 3 runs after the change (1 of 3 on the baseline).
- All four review cases pass their criteria after the change. They also pass on the baseline, so they are regression guards, and the PR says the evals do not show the gain from the reviewer changes. Scores before and after are in the PR.
- `review/SKILL.md` stays under 35 lines and `agents/reviewer.md` under 70 lines.
- No skill tells Claude to fix a Scope item without the user's decision (`grep -rn "Should fix" plugins/dev-kit/skills`).
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Parallel specialist reviewer agents or a separate verify subagent per finding: too costly for a review that runs after every unit of work.
- Confidence scores (0-100) on findings.
- Audit backlog items A7, A21 and A26 about the reviewer.
- Changes to `/security-review` or `pr-followup comments`.

## Depends on

none

## References

- Anthropic code-review plugin: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-review/commands/code-review.md
- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Agent Skills best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Google, What to look for in a code review: https://google.github.io/eng-practices/review/reviewer/looking-for.html
- Conventional Comments: https://conventionalcomments.org/
