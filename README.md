# claude-dev-kit

A Claude Code plugin marketplace with one plugin, `dev-kit`: a personal working kit (rules, skills, agents and hooks). It adapts to each project by itself.

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
| SessionStart | Puts the working rules, the branch, the checks and this branch's handoff note into the session, with a warning when the note is behind HEAD; a note for a branch already merged into the base is skipped. A plugin cannot ship `CLAUDE.md`, so this stands in for it. |
| Safety guard | Blocks reading or editing secret files: `.env*`, `.envrc`, keys (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`...), `.netrc`, `.git-credentials`, `.pypirc`, `*.tfvars`, `credentials.json`, `~/.npmrc`, `.docker/config.json` and anything under `.ssh`, `.aws`, `.gnupg` or `.kube`. The guard lets `.example`, `.sample`, `.template` and `.dist` copies through; the `permissions.deny` example below does not. Makes Claude Code ask you before `git commit/push/merge/rebase`, force-push, `reset --hard`, commands that throw away uncommitted changes (`git checkout -- <path>`, `git restore`, `git switch -C`, `git rm -f`), recursive deletes (`rm -r`, `Remove-Item -r`, `rd /s`, `del /s`), and any `gh`/`glab` command not on its read-only list (`pr view`, `run list`, `api` with GET and no body, ...). Keeps the `reviewer` agent read-only: its Bash calls may only inspect. |
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
| `review` | Pre-commit review: the `reviewer` agent checks six axes, then Block and Should fix items are fixed and the checks re-run. |
| `handoff` | Across sessions: write a per-branch pause note that the next session on the branch loads. |
| `issue` | GitHub issue to branch to PR, one issue = one branch = one PR. Modes: `new`, `start`, `finish`, and `fix` (bug flow: root cause, failing test, smallest fix, PR). |
| `pr-followup` | After the PR is open. `ci`: read the failed job, reproduce locally, fix. `comments`: triage and address review comments. |
| `release` | Changelog, version bump and release commands. |
| `ship` | Draft a commit message (`commit`) or PR description (`pr`), print only. |

Skills that need the project's config get it from `kit-config.mjs`: `issue`, `ship`, `review`, `handoff`, `pr-followup` and `release` run it as their first step instead of a `!` injection, so they still load where the shell is refused, plugin evals on Windows included.

If you also keep skills with the same names in `~/.claude/skills` (`debug`, `plan`, `review` and so on), both copies load: plugin skills are namespaced as `/dev-kit:<name>`, so nothing is overridden, but Claude sees two skills for the same job and may pick either. Delete your personal copies once the plugin is installed.

**Agents:** `reviewer` (read-only pre-commit review), `ui-verifier` (mobile/desktop, light/dark check in the built-in browser).

Nothing here commits, pushes or opens a PR on its own. `ship` only prints; `issue finish` and `pr-followup` print the commands, then run one only after you say yes to it.

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
  "sessionStart": { "context": true },
  "stopChecks": ["typecheck", "lint", "relatedTests"]
}
```

- `guard.git`: `"ask"` (default) prompts you each time, `"deny"` blocks outright, `"off"` disables the check. Secret-file blocking stays on regardless.

The safety guard matches patterns in the command text. It catches mistakes, not a determined reader: a secret read through `node -e` or `python -c`, a PowerShell `[IO.File]` call, a glob (`cat .en*`), a variable (`f=.env; cat $f`) or an earlier `cd` (`cd ~ && cat .npmrc`) gets past it. Two settings in the project's `.claude/settings.json` go further:

- `permissions.deny`, enforced by Claude Code, covers its file tools and the file commands it recognizes in Bash (`cat`, `head`, redirections). A script that opens the file itself, such as `node -e`, still gets through.
- The sandbox (`sandbox.enabled` with `sandbox.filesystem.denyRead`) is enforced by the operating system for every shell command and its child processes. It runs on macOS, Linux and WSL2, not on native Windows.

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env*)", "Read(**/*.pem)", "Read(**/*.key)", "Read(**/*.p12)", "Read(**/*.pfx)",
      "Read(**/id_rsa)", "Read(**/id_dsa)", "Read(**/id_ecdsa)", "Read(**/id_ed25519)",
      "Read(**/.netrc)", "Read(**/.git-credentials)", "Read(**/.pypirc)", "Read(**/*.tfvars)", "Read(**/*.tfvars.json)",
      "Read(**/credentials.json)", "Read(~/.npmrc)", "Read(**/.docker/config.json)",
      "Read(**/.ssh/**)", "Read(**/.aws/**)", "Read(**/.gnupg/**)", "Read(**/.kube/**)"
    ]
  },
  "sandbox": { "enabled": true, "filesystem": { "denyRead": ["~/.ssh"] } }
}
```
- `stopChecks`: the checks that run at the end of a turn. `[]` turns them off.
- `sessionStart.context`: set to `false` to leave the branch, package manager, checks and handoff note out of the session. The working rules always print.

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

324 tests run every hook as a separate process against throwaway projects: config detection, both guards, session-start, stop-checks, format-file and notify, plus the `hooks.json` wiring. No dependencies. CI runs this suite and `claude plugin validate --strict` on Ubuntu and Windows.

Skills are prompts, so they are checked by running them. `plugins/dev-kit/evals/` has cases for `debug` (root cause, flaky test, no reproduction), `grill` (vague request, fact the repo answers, conflicting requirements), `issue` (mode picked from a bug report, bug draft, repo issue template), `plan` and `review` (a boundary bug the new test misses): each checks that the skill fires and that the answer follows it. Run them by hand, not in CI: every case is about six Claude runs against your own plan or API bill.

```bash
claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit --ablation none
```

`--ablation none` keeps the "skill fired" check in the score; with the default no-plugin comparison it is only an indicator, so a case could pass without the skill ever firing. `--scaffold` is needed for the `debug`, `issue` and `review` cases, which build a small project before Claude starts. To see whether a skill makes a difference, run once more without `--ablation none`: the no-plugin baseline should fail some graders other than `skill-fired`. Shell tools cannot be granted to evals on Windows (no sandbox), so the cases do not rely on running commands, and a skill that loads context with a `` !`command` `` injection cannot load in them at all: check the run's evidence, not only `skill-fired`.

## Develop

Edit files under `plugins/dev-kit/`, then `claude plugin validate plugins/dev-kit`. In a session, `/plugin marketplace update claude-dev-kit` picks up changes (bump `version` in `plugin.json` so installed copies update).
