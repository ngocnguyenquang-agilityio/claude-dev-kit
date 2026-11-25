# Plan: grill proposes ordered vertical-slice issues (#72)

Issue: `docs/issues/72-grill-proposed-issues.md`

## Goal

When the settled scope is bigger than one issue, `grill` ends its summary with an ordered **Proposed issues** list of vertical slices, and a one-PR scope gets no such list; two evals prove both sides.

## Steps

### 1. Grill skill: Proposed issues in the Output, and the trigger

- **What**: `plugins/dev-kit/skills/grill/SKILL.md`.
  - Output (lines 26-35): after Open risks, add **Proposed issues**, written only when the settled scope holds two or more parts that each merge, deliver value and can be checked on their own. Signal: the Goal needs "and" to join two outcomes. Each item: a `[N]` label, a title, a one-sentence goal, `Depends on` as `[N]` labels or `none`, in dependency order. A technical layer is an item only when it is checked and useful alone (a shared library with its own tests, a migration several features need). A scope that fits one PR has no such section.
  - Description (line 3): also trigger on requests to split an idea or project into issues.
  - Line 37 "Write no files" and its exception stay unchanged.
- **Done when**: `grep -c "Proposed issues" plugins/dev-kit/skills/grill/SKILL.md` prints 1 or more; `grep -c "Write no files" plugins/dev-kit/skills/grill/SKILL.md` prints 1; `claude plugin validate --strict plugins/dev-kit` passes.

### 2. Eval `grill-breakdown`

- **What**: new folder `plugins/dev-kit/evals/grill-breakdown/` in the shape of `grill-pushback` (no code fixture needed): `prompt.md` (frontmatter `max_turns: 10`, `allowed_tools: [Read, Glob, Grep, Skill]`) asks to grill an idea and states every decision already settled, so the frontier is empty in one turn. The idea has at least three shippable parts and one tempting layer split (for example a link-checker CLI: local file links, anchors, HTTP links, report output). Graders: `graders/skill-fired.md` (copy of `grill-vague-request/graders/skill-fired.md`) and `graders/criteria.md` (`type: llm`): PASS if the summary has the four sections plus Proposed issues with at least 3 ordered items, each with a title, a goal and `Depends on` as `[N]` labels, every item usable and checkable on its own, and it ends with "Is this right?". FAIL if an item is a layer that is not usable alone (such as "parser only"), if it files issues or writes files, or if it asks questions about decisions the prompt already settled.
- **Done when**: the folder holds `prompt.md`, `graders/skill-fired.md`, `graders/criteria.md`; `claude plugin validate --strict plugins/dev-kit` passes.

### 3. Eval `grill-small-no-breakdown`

- **What**: new folder `plugins/dev-kit/evals/grill-small-no-breakdown/`, same shape. The prompt asks to grill a change that fits one PR with every decision settled (for example: add a `--json` flag to an existing report command). Graders: `graders/skill-fired.md` (so the case cannot pass with the skill never run), and `graders/criteria.md` (`type: llm`): PASS if the summary has the four sections, no Proposed issues section and no list of issues, and ends with "Is this right?". FAIL if it splits the change into issues or asks about settled decisions.
- **Done when**: the folder holds the three files; `claude plugin validate --strict plugins/dev-kit` passes.

### 4. README and CHANGELOG

- **What**: `README.md` line 41 (grill row: mention the Proposed issues list for a scope bigger than one issue) and line 144 (the `grill` case list gains "a settled idea that splits into issues, a settled change that must not"). `CHANGELOG.md` under Unreleased: a new first bullet `Added: ... (#72)` naming the two evals and their results from step 5. Line 150 is unchanged, since the new cases need no `--scaffold`.
- **Done when**: `grep -c "grill-breakdown\|splits into issues" README.md` prints 1 or more; the first Unreleased bullet in `CHANGELOG.md` ends its first sentence with `(#72)`.

### 5. Checks and evals (this session)

- **What**: run the test suite, both validations and the evals. Evals cost about six Claude runs per case on your bill.
- **Done when**:
  - `node --test tests/hooks.test.mjs tests/inventory.test.mjs` reports 0 failures.
  - `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.
  - `claude plugin eval plugins/dev-kit --ablation none --judge-model sonnet`, limited to the `grill-*` cases (case filter per `claude plugin eval --help`), 3 runs: `grill-breakdown` and `grill-small-no-breakdown` pass 3 of 3, and `grill-vague-request`, `grill-repo-fact`, `grill-pushback` still pass.
  - Results go into the CHANGELOG bullet from step 4.

### 6. Review

- **What**: run the `review` skill on the branch; tick the issue file's tasks.
- **Done when**: the review reports no Block finding, and every task in `docs/issues/72-grill-proposed-issues.md` is `[x]`.

## Requirement map

| Issue item | Step |
|---|---|
| Output: Proposed issues by rule A, `[N]`, layer exception, keep "Write no files" | 1 |
| Description trigger | 1 |
| Eval `grill-breakdown` | 2, 5 |
| Eval `grill-small-no-breakdown` | 3, 5 |
| README and CHANGELOG | 4 |
| Existing `grill-*` evals still pass | 5 |
| Tests and both validations | 5 |

## Out of scope

- `plan` step 1 ("suggest one plan per part"): it overlaps with Proposed issues but works at plan level; left as is.
- Filing issues from the list: that is #73, which translates `[N]` labels to `#N`.
- `CHANGELOG.md` line 88 (historical mention of grill's four sections) and old eval results.

## Decisions and assumptions

- From grill: Proposed issues only under rule A (parts that each merge, deliver value and are checked alone); vertical slices; a layer only when usable alone; `grill` writes no files; no parent issue; no task-count threshold.
- The new evals follow `grill-pushback`'s shape (prompt and graders, no `case.yaml` or fixture), since a settled idea needs no code. Assumed: the runner accepts a case without `case.yaml`, as `grill-pushback` already runs.
- Disproved in step 5: a prompt that only says every decision is settled does not empty the frontier. Grill found real open decisions and asked a round in 3 of 3 runs of each new case. The two prompts now carry the interview rounds that already happened, with the user's answers, and end by asking for the final summary with defaults for any small choice left.
- The `grill-*` cases with a `fixture.sh` need `--scaffold`; the first step 5 run left it out, so the existing cases ran in an empty folder.
- `grill-small-no-breakdown` keeps a `skill-fired` grader so it cannot pass with the skill never run.

## Open questions

- `docs/issues/73-issue-new-list.md` and its index row came from the same `issue new` run and sit uncommitted on this branch. Recommended: commit them with #72's docs, since the index edit holds both rows. Alternative: leave the #73 file out and remove its row until `issue start 73`.
