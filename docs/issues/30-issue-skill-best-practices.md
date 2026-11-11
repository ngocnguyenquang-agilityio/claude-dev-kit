# Issue skill: one-level references, evals, better drafts and repo issue templates

## Goal

The `issue` skill loads every file it needs straight from `SKILL.md`, has behavior evals, and drafts issues that state what is out of scope, describe bugs with steps to reproduce, avoid duplicates and use the number GitHub assigns. This repo gets issue templates with the same sections, so issues filed on the web and by the skill look the same.

## Tasks

Evals (`plugins/dev-kit/evals/`), written and run against the current skill first to get a baseline:

- [x] `issue-mode-infer`: a bug report with "hotfix it" and no mode. Passes when the skill picks `fix`, offers to file an issue and writes no code.
- [x] `issue-new-bug`: "file this bug" with `docs/issues/` scaffolded. Passes when the draft has Steps to reproduce, Expected / Actual and Out of scope, and the skill waits for a yes before creating anything.
- [x] `issue-new-template`: a scaffolded `.github/ISSUE_TEMPLATE/` with a template that sets labels. Passes when the draft uses the template's sections and labels.

Router (`plugins/dev-kit/skills/issue/SKILL.md`):

- [x] List the files each mode reads, so no reference file sends Claude to another one. `fix` reads `fix.md`, `start.md`, `finish.md` and `issue-number.md`. `finish` and `fix` also read `ship/references/commit.md` and `pr.md`. Keep `issue-number.md` as a file: `ship` reads it too.
- [x] Replace "follow `references/x.md`" in the mode files with "the `x` mode's step N".
- [x] Description in the third person ("Works a GitHub issue ...").
- [x] Define three terms once and use only them in every mode file: *issue file* (`<issuesDir>/<NN>-*.md`), *index* (`<issuesDir>/README.md`), *status docs* (the issue file's ticks plus the index's status cell). They replace "issue spec", "doc changes" and "this issue's own docs".

`new` mode (`references/new.md`):

- [x] Search for duplicates first with `gh issue list --search "<keywords>" --state all -L 5` and show close matches to the user.
- [x] When `.github/ISSUE_TEMPLATE/` has a template for this kind of issue, follow its sections and pass its `labels` with `--label`. Pass only labels that `gh label list` shows.
- [x] Sections: Goal (outcome and why), for a bug Steps to reproduce and Expected / Actual, Tasks, Acceptance criteria, Out of scope, Depends on.
- [x] Draft in chat or a scratch file with no number. After the user's yes, run `gh issue create`, then write `<NN>-<slug>.md` and the index row with the number GitHub returned. Drop the guess from `gh issue list -L 1` and the rename step.
- [x] When Depends on names issues and `gh issue create --help` lists `--blocked-by`, pass it. Otherwise keep Depends on as text only.

`fix` and `finish` modes:

- [x] `fix.md` Red step: when the issue has Steps to reproduce, the regression test reproduces them.
- [x] `finish.md` report: take the reviewer's spec table and add an evidence column (test name, check command or manual step) for each acceptance criterion. A criterion with no evidence is "not verified", not "met".

Repo templates (`.github/ISSUE_TEMPLATE/`):

- [x] `feature.md` and `bug.md` Markdown templates with the same `##` sections the `new` mode writes, so `finish` can tick tasks in issues filed from the web too.

Docs:

- [x] Add the `issue` evals to the eval paragraph in `README.md`.
- [x] Update `CHANGELOG.md` and the plugin version.

## Acceptance criteria

- `grep -n "references/" plugins/dev-kit/skills/issue/references/*.md` finds no path that `SKILL.md` does not list for that mode.
- `ship` still reads `issue/references/issue-number.md`.
- `issue-new-bug` and `issue-new-template` fail on the baseline and pass after the change; `issue-mode-infer` passes after the change. Scores before and after are in the PR.
- `references/new.md` no longer guesses the number from `gh issue list -L 1`.
- The GitHub "New issue" page for this repo offers the feature and bug templates.
- The `finish` report on this issue's branch shows the evidence column.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Using `gh issue develop` to link branches: it creates the branch on GitHub, a remote write the kit asks before.
- YAML issue forms and `config.yml`: forms render `###` headings that `finish` cannot tick.
- Evals for duplicate search, the real issue number and `--blocked-by`: evals cannot run shell tools on Windows, so these are checked by hand.

## Depends on

none
