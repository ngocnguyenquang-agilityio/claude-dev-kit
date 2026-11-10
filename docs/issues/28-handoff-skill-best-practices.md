# Handoff skill: stale-note check, expiry and a stricter note format

## Goal

A fresh session can tell whether the handoff note it was given still matches the repo, notes for merged branches stop loading, and the `handoff` skill writes a short note that records dead ends, check results and how to resume, with the tools its steps need.

## Tasks

SessionStart hook (`plugins/dev-kit/hooks/session-start.mjs`):

- [x] Stale-note check: read the `HEAD <sha>` from the note's State line, compare it with the current HEAD, and when they differ print a warning above the note, for example "Note written at `dadccf9`; 4 commits since. Check it against the repo before acting on it." Accept only a hex sha (`[0-9a-f]{7,40}`) before passing it to git, the same way `lib.mjs` refuses a base branch that looks like an option. A note with no readable sha, or a sha that is not an ancestor of HEAD (after a rebase, amend or reset), gets the warning without the count.
- [x] Expiry: do not load the note when its branch is already merged into `origin/<baseBranch>`, or the local base branch when there is no remote; print one line naming the note path so the user can delete it. Never applies on the base branch itself.
- [x] Tests in `tests/hooks.test.mjs`: fresh note (no warning), note behind HEAD (warning with count), note without sha, note sha not an ancestor of HEAD, merged branch (note skipped), new branch with no commits of its own (note still loads), plus a squash-merge case if planning picks a detection method that handles it.

Skill (`plugins/dev-kit/skills/handoff/SKILL.md`):

- [x] `allowed-tools`: add the commands step 1 runs (`git branch`, `git rev-parse`, `git status`, `git diff`) and `Write`/`Edit` for the note and `.gitignore`.
- [x] Add a **Tried** section to the note format: approaches dropped and gotchas found (for example a file that must be edited in small steps), each with one line on why.
- [x] Add check results to the State line: `checks: pass | fail <names> | not run`, taken from this conversation, never assumed.
- [x] Add a resume line at the top of the note: before acting, run `git status` and `git log -3` and compare them with State; when they disagree, trust the repo, not the note.
- [x] Turn "read in one minute" into a hard limit of 40 lines. Long lists such as a backlog move to an issue or a file under `docs/`, and the note points to them.
- [x] Add a check before writing: no `<...>` placeholders left, every file path in the note exists, and nothing that looks like a token, key or password.
- [x] Update `CHANGELOG.md` and the plugin version.

Judgement calls (decide during planning):

- [x] How to detect "merged": a branch with no commits of its own is also an ancestor of the base, and squash merges are not ancestors at all. Options: compare the note's sha with the merge base, or ask `gh pr view` for the PR state (needs the network).
- [x] Whether the stale-note check also warns on age (for example older than 7 days) or only on commits.
- [x] A `PreCompact` hook that reminds the user to run `/dev-kit:handoff` before the context is compacted. Out of scope unless planning finds it cheap.

## Acceptance criteria

- On a branch whose HEAD moved after the note was written, the SessionStart output shows the warning with the commit count above the note.
- On a note whose sha is not an ancestor of HEAD, or is not a hex sha, the warning shows without a count.
- On a branch merged into `origin/<baseBranch>` (or the local base branch with no remote), the note is not loaded and its path is printed.
- A note written by `/dev-kit:handoff` has the resume line, the Tried section and a `checks:` value in State, and is at most 40 lines.
- With a backlog too long for the limit, the note links to the issue or file holding it instead of listing it.
- Given a draft with a `<...>` placeholder, a path that does not exist, or a token-like string, `/dev-kit:handoff` fixes or removes it before writing.
- `/dev-kit:handoff` runs without a permission prompt for any command or write in its steps.
- Each judgement-call item is either done or closed with a reason in the PR.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

none
