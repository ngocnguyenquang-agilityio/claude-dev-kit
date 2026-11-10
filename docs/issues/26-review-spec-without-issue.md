# Review: check the spec when there is no issue

## Goal

The `review` skill still runs the Spec axis when the work has no issue, by handing the reviewer the plan the user approved or the request from the chat. The working rules name fallbacks next to error handling and config.

## Tasks

- [x] `plugins/dev-kit/skills/review/SKILL.md`: when no issue number is found, pass the reviewer the approved plan (its file path, or its text when it lives only in chat) or, failing that, the user's request. Skip the Spec axis only when none of these exist.
- [x] `plugins/dev-kit/agents/reviewer.md` (Gather step 5): accept a plan or request from the prompt as the spec when there is no issue, and check the diff against its steps or asks the same way as issue tasks.
- [x] `plugins/dev-kit/rules/working-rules.md` (Code): "No error handling, fallbacks or config for cases that cannot happen."
- [x] `plugins/dev-kit/skills/issue/references/finish.md` step 1: "With no issue, there are no status docs", since a missing issue no longer means a missing spec.
- [x] Update `CHANGELOG.md` and the plugin version.

## Acceptance criteria

- With no issue on the branch and a plan approved in chat, `/dev-kit:review` reports a spec table built from the plan's steps.
- With no issue and no plan, the reviewer builds the spec table from the user's request.
- The SessionStart output contains the word "fallbacks".
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

none
