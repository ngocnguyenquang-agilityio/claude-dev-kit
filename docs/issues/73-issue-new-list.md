# Issue new: draft a list of issues in full, review once, then file them in dependency order

## Goal

Pillar 1 (quality workflow). After `grill` proposes several issues, filing them one `issue new` at a time means one stop per issue. Let `issue new` take a list: draft every issue in full, show them together for one review, and file them all after a yes, with `Depends on` numbers filled in.

## Tasks

- [ ] `plugins/dev-kit/skills/issue/references/new.md`: when `$ARGUMENTS` or the conversation holds a list of issues (such as grill's Proposed issues), run steps 1 to 3 for each item and show all drafts in step 4 at once. A "yes to all" files them all; comments revise the drafts and the whole list is shown again
- [ ] `plugins/dev-kit/skills/issue/references/new.md` step 5: file in dependency order and replace each `[N]` label with the real `#N` before filing the issues that depend on it
- [ ] `plugins/dev-kit/skills/issue/references/new.md` step 6: one issue file and index row per issue, and update the index "Order" line for the chain
- [ ] New eval `plugins/dev-kit/evals/issue-new-list`: a prompt with three proposed issues, two depending on the first. Graders: an `llm` criterion that all three full drafts are shown with `[N]` dependencies and the response waits for one yes; `tool_used` on `Bash` matching `gh issue create` with at most 0 calls
- [ ] `README.md` (issue row and evals paragraph) and `CHANGELOG.md` under Unreleased

## Acceptance criteria

- Asking `issue new` to file a list shows every draft in full in one review and files nothing before a yes.
- After a yes, the issues are created in dependency order, and each issue file, its `Depends on` and the index name the real numbers.
- `issue-new-list` passes 3 of 3 runs with the `sonnet` judge and `--ablation none`; existing `issue-new-*` evals still pass.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Changes to `grill`.
- Filing part of a list (only all, or revise first).
- Parent issues and GitHub sub-issues.

## Depends on

#72
