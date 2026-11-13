# Plan: impact-mapper follow-ups from #39

Goal: make the `plan-impact-mapper` eval fail a plan that only lists file names, and check the two things #39 left unverified: `plan` step 2 when the agent is unavailable or fails, and the agent on a real project.

Two parts that do not depend on each other (A, then B); one plan because they share one issue, one changelog entry and one version bump. The issue number comes from GitHub when step 1 files it; the plan links to the issue file once it exists.

## Part A: stricter criteria

1. **Start from a current `main`.** What: `git switch main && git pull`, then branch `feat/impact-mapper-followups` (local `main` lacks PR 41 and 42; this plan file is untracked and carries over). Done when: `git log -1 --oneline` shows the merge of PR 42 (`2c1594c`) and `git branch --show-current` prints the new branch.
2. **File the issue.** What: `/dev-kit:issue new` for the follow-ups; add `docs/issues/NN-impact-mapper-followups.md` and its row in `docs/issues/README.md`; link this plan from the issue file. Done when: the issue exists on GitHub and `grep -n "impact-mapper-followups" docs/issues/README.md` gives 1 hit.
3. **Tighten `plugins/dev-kit/evals/plan-impact-mapper/graders/criteria.md`.** What: keep "discovery only", but a file counts only when the plan gives a reason tied to `formatPrice` (calls it, re-exports it, tests it, documents it, or is left unchanged for a stated reason). Add FAIL when the plan lists the decoy `src/features/promo/labels.js` (`formatPriceLabel`) as affected, or any `src/features/` filler folder as affected. Drop the "every path exists" clause: the judge reads only the last message and cannot check the filesystem. Done when: the file states all three rules and still names the 11 files and `getCurrencySymbol`.
4. **Show the grader rejects a names-only answer.** What: in a scratchpad copy of the plugin, add a case whose prompt asks for "only a bullet list of paths, no reasons", and run it with `--case`. Done when: that case FAILS on `criteria` (3 of 3 runs) while the real `plan-impact-mapper` case still PASSES `criteria` in 3 of 3 runs with the agent spawned.

## Part B: fallback and a real project

5. **Learn how the runner treats a refused `Agent` tool.** What: in the scratchpad copy, make `plan-impact-mapper-no-agent` (same `fixture.sh`, `Agent` removed from `allowed_tools`), run one trial with `--keep-temp`, and read the trace. Done when: the trace shows what `plan` did when `Agent` was missing (plans itself, stops, or errors), written down in the issue file.
6. **Keep the fallback as a case only if it behaves.** What: if step 5 shows `plan` planning from its own reading, add `plugins/dev-kit/evals/plan-agent-unavailable/` with `case.yaml`, `fixture.sh` and `prompt.md` copied from `plan-impact-mapper`, graders `no-agent.md` (min 0, max 0), `skill-fired.md` and a `criteria.md` that checks discovery plus a note under Open questions that the paths were planned without the agent. Done when: 3 of 3 runs pass every grader. If `plan` stops or errors instead, do not add the case: record it and file a separate issue for `plan/SKILL.md` step 2.
7. **Try the agent on a real project.** What: spawn `dev-kit:impact-mapper` by hand with the project path and one concrete change, then open 5 cited `path:line` entries (a mix of Confirmed and Likely) and the Blind spots. Done when: at least 4 of 5 spot-checked entries are true at the cited line, and the issue file records the project, the change, the hit rate and anything the agent missed that you know of.

## Wrap-up

8. **Docs and version.** What: `CHANGELOG.md` entry 0.9.2 for the grader and the new case, `plugins/dev-kit/.claude-plugin/plugin.json` to 0.9.2, and the eval list sentence in `README.md` if step 6 added a case. Done when: `grep -n '"version"' plugins/dev-kit/.claude-plugin/plugin.json` shows 0.9.2 and the CHANGELOG top entry is 0.9.2.
9. **Checks and review.** What: `node --test tests/hooks.test.mjs`, `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .`, then the `review` skill. Done when: tests report 324 pass, 0 fail, both validations print "Validation passed", and review has no Block items.

## Out of scope

- Changes to `impact-mapper.md` or `plan/SKILL.md`: if steps 5 to 7 show a defect, file it as its own issue.
- Running the evals in CI (still by hand, about six Claude runs per case).
- A design-graded `criteria.md` (it failed 6 of 9 runs in #39 and the user agreed to discovery only).

## Decisions and assumptions

- Evidence over names: the grader asks for a reason per file, because the old plan already named all 11 files in 3 of 3 runs without the agent, so names alone prove nothing.
- Negative test through a prompt that asks for names only, because the eval runner cannot be fed a canned answer.
- Plans use no shell, so every eval step avoids Bash (Windows evals refuse it).
- Assumed: removing `Agent` from `allowed_tools` is an acceptable stand-in for "the agent fails"; a real tool error cannot be forced from an eval.
- Git writes (commit, push, PR, merge) wait for your yes each time.

## Open questions

- Which real project and which change for step 7? Only that step is blocked.
- Should the fallback case (step 6) stay in the repo permanently, or is a one-off trace read enough? Default: keep it only if it passes 3 of 3.
