---
name: handoff
description: Write a per-branch note so a fresh session can continue. Use when pausing work or ending a session mid-task.
argument-hint: "[focus for the next session]"
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git status:*), Bash(git diff:*), Bash(date:*), Read, Glob, Write, Edit
---

Focus for the next session: $ARGUMENTS

First run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. It prints the config as JSON, so you never guess the base branch, issues folder or checks. A step, not a `!` injection: an injected command that cannot run stops the whole skill from loading, and plugin evals on Windows refuse every shell. If it cannot run, say so, and name every config value you then use and where you took it from, so the user can correct it.

Compact this conversation into one note per branch. The plugin's SessionStart hook loads it into the next session on the same branch. It warns when HEAD has moved since the `HEAD <sha>` in State, and skips the note once the branch is merged with a merge commit (not after a squash or fast-forward merge).

## Steps

1. Gather: take `baseBranch`, `wipNote` and `branch.issue` from the config. Then run `git branch --show-current`, `git rev-parse --short HEAD`, `date "+%Y-%m-%d %H:%M"`, `git status --porcelain`, `git diff --stat HEAD`, and `git log --oneline origin/<baseBranch>..HEAD` (the remote ref, because the local one can be stale).
2. Take `N` from `branch.issue`. When it is `null` (no commit names the issue yet), use the issue number this conversation worked on, for example from `issue start`; the note carries it to the next session until the first `<type>(#N)` commit does. With no issue, leave `(#N)` out of the title.
3. Draft the note in the format below, then check it before writing:
   - No `<...>` placeholder is left.
   - Every file path it names exists (Glob).
   - Nothing looks like a token, key or password; replace any with `<REDACTED>`.
   - It is at most 40 lines. Move a longer list, such as a backlog, to an issue or a file under `docs/` and link to it.
4. Write the note to the `wipNote` path (`.claude/wip/<branch>.md`, with every `/` in the branch name replaced by `-`). Add `.claude/wip/` to `.gitignore` if it is not there. Overwrite the file: one note per branch, always the latest.
5. Print the path so the user can paste it into a new session.

## Note format

```markdown
# WIP: <branch> (#N) - <YYYY-MM-DD HH:MM>

Before acting: run `git status` and `git log -3` and compare them with State. Where they disagree, trust the repo, not this note.

## Done

- <what is finished: commits, and uncommitted changes by file>

## Next

- <1-3 concrete next steps, each a single action a fresh session can start without asking>

## Open

- <questions, blockers, decisions waiting on someone; "none" when there are none>

## Decisions

- <settled choices and why, so they are not re-litigated; "none" when there are none>

## Tried

- <approaches dropped and gotchas found, each with one line on why; "none" when there are none>

## State

HEAD <sha> · <count> dirty files · checks: <pass | fail <names> | not run> · PR #<N> (only when this conversation named one) · skills to use next: <names, or "none">
```

## Rules

- Do not duplicate what already lives in commits, diffs or the issue file; point to it.
- If the user passed an argument, make it the first item under **Next**.
- Take `checks:` from what ran in this conversation. Never assume a pass: a check that did not run is `not run`.
