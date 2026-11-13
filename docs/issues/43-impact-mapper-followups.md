# Impact-mapper follow-ups: stricter eval criteria, fallback check and a real-project trial

## Goal

The `plan-impact-mapper` eval passes when a plan only names the 11 files, so it proves discovery without evidence. #39 also left two things unverified: `plan` step 2 when the `impact-mapper` agent is unavailable, and the agent on a real project instead of the fixture.

Plan: `docs/plans/2026-11-13-impact-mapper-followups.md`

## Tasks

Stricter criteria:

- [x] `plugins/dev-kit/evals/plan-impact-mapper/graders/criteria.md`: a file counts only when the plan gives a reason tied to `formatPrice`. FAIL when the plan lists the decoy `src/features/promo/labels.js` or a `src/features/` filler folder as affected. Drop the "every path exists" clause: the judge reads only the last message.
- [x] Show the grader rejects a names-only answer: in a scratchpad copy of the plugin, a case whose prompt asks for paths without reasons fails `criteria` 3 of 3, while `plan-impact-mapper` still passes 3 of 3 with the agent spawned.

Fallback and real project:

- [x] In the scratchpad copy, run `plan-impact-mapper-no-agent` (`Agent` removed from `allowed_tools`; this does not block it, see Results) once with `--keep-temp`; record in this file what `plan` did.
- [x] If `plan` planned from its own reading, add `plugins/dev-kit/evals/plan-agent-unavailable/` (graders: `no-agent` with `min: 0, max: 0`, `skill-fired`, `criteria` checking discovery and an Open questions note that paths were planned without the agent). Keep it only if it passes 3 of 3. If `plan` stops or errors, do not add it and file a separate issue for `plan/SKILL.md` step 2.
- [x] Spawn `dev-kit:impact-mapper` by hand on a real project with one concrete change; open 5 cited `path:line` entries and the Blind spots. Record the project, the change and the hit rate here.

Docs:

- [x] Update `CHANGELOG.md`, the plugin version (0.9.2) and, if a case is added, the README eval list.

## Acceptance criteria

- `plan-impact-mapper` passes 3 of 3 runs with the new criteria and the agent spawned in each run.
- The names-only case fails `criteria` in 3 of 3 runs.
- At least 4 of the 5 spot-checked entries from the real project are true at the cited line.
- `plan-agent-unavailable` exists only if it passes every grader in 3 of 3 runs.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Changes to `impact-mapper.md` or `plan/SKILL.md`: a defect found here becomes its own issue.
- Running evals in CI.
- A design-graded `criteria.md` (it failed 6 of 9 runs in #39).

## Depends on

none

## Results

Run on a copy of the plugin in the scratchpad (a name target resolves to the real plugin: pass the absolute path), 2026-11-13, `--ablation none`, 3 runs per case.

- New `criteria.md`: `plan-impact-mapper` 3 of 3 and 3 of 3 (6 of 6, agent spawned each run); `plan-multi-file` 3 of 3; `plan-skip-trivial` 3 of 3.
- Names-only case (`plan-names-only`, prompt asks for paths with no reasons): `criteria` FAIL 3 of 3, all judge votes FAIL.
- Fallback case, first try: removing `Agent` from `allowed_tools` does not block it. `plan` still called `dev-kit:impact-mapper` and it ran. Use `--disallow-tools Agent`.
- Fallback case, `--disallow-tools Agent`: 3 of 3 pass. `plan` never tried to spawn the agent; it read the code itself (8 to 14 `Read` calls) and named all 11 files. It ran no error path, so "the agent returns an error" is still untested. The plans did not say they were made without the agent.
- Side finding, first try: in 1 of 3 runs the agent itself never reported `src/features/billing/statement.js` (0 mentions in the trace) and `criteria` failed. A recall miss of the agent on the 122-file fixture, 1 of 6 agent runs seen here.

### Real project trial

Project: this repo (`claude-dev-kit`, worktrees excluded). Change: rename `loadConfig` in `plugins/dev-kit/hooks/lib.mjs` to `readConfig`. Agent: `dev-kit:impact-mapper`, 26 s, 12 tool calls.

- It cited 13 `path:line` entries (the definition, plus an import and a call in each of 6 hooks), all Confirmed. A grep of the whole repo for `loadConfig` gives the same 13 lines: 13 of 13 true, 0 missed.
- It also listed what it checked and left alone (tests, skills, docs, CI, `hooks.json`) and its blind spots (hidden folders searched by hand, worktrees excluded, no dynamic lookup).
- Weak test: one exact name, no aliases, no barrel file, so every hit is a plain grep hit. It shows the agent works outside the fixture, not that it follows indirect callers in a real codebase. Not tried: a change that goes through aliases or string-keyed lookups in a real project.

### Fallback case kept

`plan-agent-unavailable` blocks `Agent` with `disallowed_tools: [Agent]` in `prompt.md`, so the standard eval command needs no extra flag. First set: 2 of 3 clean runs passed, the third lost its `criteria` vote to a judge `403 Failed to authenticate` (an infrastructure error, not a plan result). Second set, 2026-11-13: 3 of 3 pass every grader (`criteria` 3 of 3, one 2-to-1 vote; `no-agent` 0 calls; `skill-fired` 3 of 3), $0.87.

### Deviations from the issue text

- The `criteria` of `plan-agent-unavailable` checks discovery only. The planned check for an Open questions note that paths were made without the agent was dropped: `plan` does not write that note when the agent is absent (step 2 asks it to mark assumed paths only when the agent fails or finds nothing), so the check would fail the case. If the note is wanted, it is a `plan/SKILL.md` step 2 change for its own issue.
- The agent-returns-an-error path is still untested, and so are aliased or string-keyed lookups in a real project.
- The agent missed `src/features/billing/statement.js` in 1 of 6 fixture runs seen here; not filed yet.
