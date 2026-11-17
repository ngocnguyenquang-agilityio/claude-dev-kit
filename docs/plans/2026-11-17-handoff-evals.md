# Plan: evals for the `handoff` skill

## Why

`handoff` has no eval. Its output is a file the next session trusts, so a wrong note does real damage: a made-up `checks: pass`, a stale path, a leaked secret or a note over 40 lines all go unnoticed. The rules are concrete enough to grade.

## What to test

The skill's checkable promises, from `skills/handoff/SKILL.md`:

| # | Promise | Where |
|---|---|---|
| 1 | Writes exactly one note at `.claude/wip/<branch with / as ->.md` | step 4 |
| 2 | Note follows the format: all six sections, no `<...>` left, at most 40 lines | step 3 |
| 3 | `checks:` says `not run` unless a check ran in the conversation | Rules |
| 4 | The argument becomes the first item under **Next** | Rules |
| 5 | Every file path in the note exists | step 3 |
| 6 | A secret is replaced with `<REDACTED>` | step 3 |
| 7 | `.claude/wip/` is added to `.gitignore` | step 4 |

## Cases (3, one folder each under `plugins/dev-kit/evals/`)

1. **`handoff-basic`**: fixture is a repo on branch `feat/csv-export` with one commit past `main` and two dirty files. Prompt: "Pause here, write a handoff note." No argument.
   - Checks 1, 2, 3 and 7. Nothing ran, so `checks: not run`.
2. **`handoff-focus-arg`**: same fixture, prompt `/dev-kit:handoff finish the comma escaping`.
   - Checks 4: the argument is the first bullet under **Next**.
3. **`handoff-secret`** (built under this name): the fake key is in the user's message, not in a fixture file. Prompt asks for a handoff.
   - Checks 5 and 6: the token does not appear in the note, and no path in it is missing from the repo.

Skip for now: the SessionStart hook that loads the note. It is already covered by `tests/hooks.test.mjs`.

## Files per case

Copy the layout of `review-clean-diff` and `grill-vague-request`:

- `case.yaml`: `schema_version: "1.1"`, `name`, `context.scaffold_script: fixture.sh`
- `fixture.sh`: `git init -b main`, commit, `git checkout -b feat/csv-export`, add commits and dirty files
- `prompt.md`: front matter with `max_turns` and `allowed_tools`, then the user message
- `graders/skill-fired.md`: `tool_used`, `Skill`, `input_match: 'dev-kit:handoff'`
- `graders/criteria.md`: `type: llm`, PASS and FAIL rules per case

## Outcome (written after the build)

- No case has a `skill-fired.md`: a slash command in the prompt is not a `Skill` call, so it scored 0 on every run. Graders read the note text.
- Writes under `.claude/` are refused in an eval, so the note is graded as printed in the reply. `handoff-basic` does not check `.gitignore` (check 7 is not covered).
- The default judge failed valid notes; the cases are run with `--judge-model sonnet`.

## Things to settle first (answered above)

- **`handoff` has `disable-model-invocation: true`.** The model cannot trigger it, only the user's slash command can. Check how `issue-*` and `plan-*` evals invoke a skill, and whether a prompt starting `/dev-kit:handoff` fires it. Do this first, because the other cases depend on the answer. If it cannot fire, drop `skill-fired.md` and grade on the note file alone.
- **`allowed_tools` must include `Bash`, `Write`, `Edit` and `Glob`.** The existing evals list only `Read, Glob, Grep, Skill`. The skill needs the git commands and `Write`.
- **Can the grader see the written file?** An `llm` grader sees the transcript. Either the criteria quote the `Write` content from the transcript, or the harness has a file-based grader. Check the schema before writing criteria.
- **Evidence over skill-fired.** `debug-root-cause` taught us that "skill fired" alone proves little. Every PASS rule must name something visible in the written note, not just that the skill ran.

## Order of work

1. Read how `issue-new-bug` and `plan-multi-file` invoke their skills, and the grader schema. Settle the three questions above.
2. Build `handoff-basic` first and run it once. Fix the harness problems on this single case.
3. Add `handoff-focus-arg` and `handoff-secret-and-paths`.
4. Run all three, read the transcripts (not just PASS/FAIL), and tighten criteria that pass for the wrong reason.
5. Update `CHANGELOG.md` and the eval count if `README.md` states one.

## Done when

- Three eval folders exist and run on Windows.
- Each PASS rule is backed by text in the written note.
- A deliberate break of the skill (for example removing the `not run` rule) makes at least one case FAIL.
