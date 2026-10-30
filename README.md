# claude-dev-kit

A Claude Code plugin marketplace with one plugin, `dev-kit`: a portable version of a personal working kit (rules, skills, agents, commands and hooks). It adapts to each project by itself.

## Install

From GitHub (after you push this repo):

```text
/plugin marketplace add <github-user>/claude-dev-kit
/plugin install dev-kit@claude-dev-kit
```

From a local folder, for development or a machine with no remote:

```text
/plugin marketplace add D:/claude-dev-kit
/plugin install dev-kit@claude-dev-kit
```

Requires Node 18+ (the hooks are `.mjs` scripts) and `git`. The GitHub workflow needs the `gh` CLI, logged in.

## What it adds

**Hooks** (always on)

| Hook | What it does |
|---|---|
| SessionStart | Puts the working rules, the branch, the checks and this branch's handoff note into the session. A plugin cannot ship `CLAUDE.md`, so this stands in for it. |
| Safety guard | Blocks reading or editing `.env*`, keys, `~/.ssh` and credential files. Makes Claude Code ask you before `git commit/push/merge/rebase`, force-push, `reset --hard`, `rm -r`, and `gh`/`glab` writes. |
| Package-manager guard | Blocks the package managers the project's lockfile does not use. No lockfile, no enforcement. |
| Format on edit | Runs Prettier and `eslint --fix` on the edited file, when the project has them. |
| Stop checks | At the end of a turn that changed code: typecheck, lint, and the tests related to the changed files. Failures go back to Claude. A passing run is remembered in `.git/dev-kit-stop-checks`, so the checks run again only after the code or the check commands change. |
| Notify | Desktop notification when Claude finishes or waits. `CLAUDE_NOTIFY=0` turns it off. |

**Skills** (use as `/dev-kit:<name>`)

| Skill | Use it for |
|---|---|
| `grill` | Settle a vague request with a decision-tree interview. |
| `plan` | Break multi-file work into verifiable steps. |
| `debug` | Root cause first, with a feedback loop. |
| `tdd` | Red-green loop at an agreed seam. |
| `review` | Pre-commit review on six axes; spawns the `reviewer` agent. |
| `handoff` | Write a per-branch pause note for the next session. |
| `new-issue`, `start-issue`, `finish-issue` | GitHub issue to branch to PR, one issue = one branch = one PR. |
| `hotfix` | Bug flow: root cause, failing test, smallest fix, PR. |
| `pr-feedback` | Triage and address review comments. |
| `ci-fix` | Read the failed job, reproduce locally, fix. |
| `release` | Changelog, version bump and release commands. |

**Commands:** `/dev-kit:commit-msg`, `/dev-kit:pr-body`, `/dev-kit:standup`.

**Agents:** `reviewer` (read-only pre-commit review), `ui-verifier` (mobile/desktop, light/dark check in the built-in browser).

Nothing here commits, pushes or opens a PR on its own. Skills print the commands and wait.

## Configuration

Zero config is the default. The plugin detects the package manager from the lockfile, `lint`/`typecheck`/`test`/`build`/`format:check` from `package.json` scripts, the base branch from `origin`'s default branch, and `docs/issues/` if it exists.

To override, add `.claude/kit.json` to a project. Every key is optional:

```json
{
  "packageManager": "pnpm",
  "baseBranch": "develop",
  "issuesDir": "docs/issues",
  "scripts": { "typecheck": "check-types", "formatCheck": "format:check" },
  "enforcePackageManager": true,
  "guard": { "git": "ask" },
  "sessionStart": { "rules": true, "context": true },
  "stopChecks": ["typecheck", "lint", "relatedTests"]
}
```

- `guard.git`: `"ask"` (default) prompts you each time, `"deny"` blocks outright, `"off"` disables the check. Secret-file blocking stays on regardless.
- `stopChecks`: the checks that run at the end of a turn. `[]` turns them off.
- `sessionStart.rules`: set to `false` if the project's `CLAUDE.md` already carries these rules.

Print what was resolved for the current project:

```bash
node plugins/dev-kit/hooks/kit-config.mjs
```

## Conventions the workflow assumes

Branches are named `<type>/<slug>` (`feat/login`), commits `<type>(#12): summary`, and PRs `[#12] Title` with `Closes #12`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.

The issue number lives in the commits, not the branch name: the plugin reads it from the branch's `<type>(#N)` commits since the merge-base. Before the first such commit, the skills ask for it (or take it as an argument). If the commits name more than one issue, they ask which one. An issue is optional: without one, commits are `<type>: summary` and the PR has no `Closes` line.

## What stays out of the plugin

Project-specific tooling is not here: GitLab mirroring, framework doc lookups and a project's own test-style guide. Keep those in the project's `.claude/`.

## Test

```bash
node --test tests/hooks.test.mjs
```

107 tests run every hook as a separate process against throwaway projects: config detection, both guards, session-start, stop-checks, format-file and notify, plus the `hooks.json` wiring. No dependencies. Skills, commands and agents are prompts, so they are checked by running them, not by this suite.

## Develop

Edit files under `plugins/dev-kit/`, then `claude plugin validate plugins/dev-kit`. In a session, `/plugin marketplace update claude-dev-kit` picks up changes (bump `version` in `plugin.json` so installed copies update).
