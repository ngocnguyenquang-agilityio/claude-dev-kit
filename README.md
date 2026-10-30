# claude-dev-kit

A Claude Code plugin marketplace with one plugin, `dev-kit`: a portable version of a personal working kit (rules, skills, agents and hooks). It adapts to each project by itself.

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
| Safety guard | Blocks reading or editing `.env*`, keys, `~/.ssh` and credential files. Makes Claude Code ask you before `git commit/push/merge/rebase`, force-push, `reset --hard`, `rm -r`, and `gh`/`glab` writes. Keeps the `reviewer` agent read-only: its Bash calls may only inspect. |
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
| `commit-msg`, `pr-body` | Draft a commit message or PR description (print only). |
| `standup` | Yesterday / Today / Blockers from your commits, PRs and handoff notes. |

Skills that need the project's config get it injected when they load (`` !`node .../kit-config.mjs` ``), so Claude never has to remember to run it.

If you also keep skills with the same names in `~/.claude/skills` (`debug`, `plan`, `review` and so on), both copies load: plugin skills are namespaced as `/dev-kit:<name>`, so nothing is overridden, but Claude sees two skills for the same job and may pick either. Delete your personal copies once the plugin is installed.

**Agents:** `reviewer` (read-only pre-commit review), `ui-verifier` (mobile/desktop, light/dark check in the built-in browser).

Nothing here commits, pushes or opens a PR on its own. Skills print the commands and wait.

## Configuration

Zero config is the default. The plugin detects the package manager from the lockfile, `lint`/`typecheck`/`test`/`build`/`format:check` from `package.json` scripts, the base branch from `origin`'s default branch, and `docs/issues/` if it exists.

To override, add `.claude/kit.json` to a project. The settings live in the project, not in the plugin's `userConfig`, because they describe the project (its package manager, base branch, checks) and are shared by everyone who works on it; `userConfig` holds one value per user for every project.

Every key is optional:

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

The safety guard matches patterns in the command text. It catches mistakes, not a determined reader: a secret read through `node -e` or `python -c`, a PowerShell `[IO.File]` call, a glob (`cat .en*`) or a variable (`f=.env; cat $f`) gets past it. Two settings in the project's `.claude/settings.json` go further:

- `permissions.deny`, enforced by Claude Code, covers its file tools and the file commands it recognizes in Bash (`cat`, `head`, redirections). A script that opens the file itself, such as `node -e`, still gets through.
- The sandbox (`sandbox.enabled` with `sandbox.filesystem.denyRead`) is enforced by the operating system for every shell command and its child processes. It runs on macOS, Linux and WSL2, not on native Windows.

```json
{
  "permissions": { "deny": ["Read(./.env*)", "Read(~/.ssh/**)"] },
  "sandbox": { "enabled": true, "filesystem": { "denyRead": ["~/.ssh"] } }
}
```
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

193 tests run every hook as a separate process against throwaway projects: config detection, both guards, session-start, stop-checks, format-file and notify, plus the `hooks.json` wiring. No dependencies. CI runs this suite and `claude plugin validate --strict` on Ubuntu and Windows.

Skills are prompts, so they are checked by running them. `plugins/dev-kit/evals/` has cases for `debug`, `grill` and `plan`: each checks that the skill fires and that the answer follows it. Run them by hand, not in CI: every case is about six Claude runs against your own plan or API bill.

```bash
claude plugin eval plugins/dev-kit
```

## Develop

Edit files under `plugins/dev-kit/`, then `claude plugin validate plugins/dev-kit`. In a session, `/plugin marketplace update claude-dev-kit` picks up changes (bump `version` in `plugin.json` so installed copies update).
