# claude-dev-kit

A Claude Code plugin marketplace with one plugin, `dev-kit`: a personal working kit (rules, skills, agents and hooks). It adapts to each project by itself. What it is for, and what it is not for, is in [docs/vision.md](docs/vision.md).

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
| SessionStart | Puts the working rules, the memory index `docs/memory.md`, the branch, the checks and this branch's handoff note into the session, with a line asking to prune the index once it passes 6000 characters, and with a warning when the note is behind HEAD; a note for a branch already merged into the base is skipped. For each plan in `docs/plans/` changed on the branch (or uncommitted) that has both ticked and unticked steps it adds `- Plan in progress: <path>, step k of n`, where k is the first unticked step (not on a merged branch; hidden by `sessionStart.context: false`). A plugin cannot ship `CLAUDE.md`, so this stands in for it. |
| Safety guard | Blocks reading or editing secret files: `.env*`, `.envrc`, keys (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`...), `.netrc`, `.git-credentials`, `.pypirc`, `*.tfvars`, `credentials.json`, `~/.npmrc`, `.docker/config.json` and anything under `.ssh`, `.aws`, `.gnupg` or `.kube`. The guard lets `.example`, `.sample`, `.template` and `.dist` copies through; the `permissions.deny` example below does not. Makes Claude Code ask you before `git commit/push/merge/rebase`, force-push, `reset --hard`, commands that throw away uncommitted changes (`git checkout -- <path>`, `git restore`, `git switch -C`, `git rm -f`), recursive deletes (`rm -r`, `Remove-Item -r`, `rd /s`, `del /s`), and any `gh`/`glab` command not on its read-only list (`pr view`, `run list`, `api` with GET and no body, ...). Keeps the `reviewer` agent read-only: its Bash calls may only inspect. Blocks a `Write`, `Edit` or `MultiEdit` that puts a key, token, private key or URL password into the memory store, which is committed. |
| Package-manager guard | Blocks the package managers the project's lockfile does not use. No lockfile, no enforcement. |
| Format on edit | Runs Prettier and `eslint --fix` on the edited file, when the project has them. |
| Stop checks | At the end of a turn that changed code: typecheck, lint, and the tests related to the changed files. With no `package.json`, it runs the project's Node test files (`node --test`) instead, or the commands in `checks`. Failures go back to Claude, and so does a check that runs past the time limit. A passing run is remembered in `.git/dev-kit-stop-checks`, so the checks run again only after the code, the check commands or the config (`package.json`, `tsconfig.json`, ESLint config) change. |
| Notify | Desktop notification when Claude finishes or waits. `CLAUDE_NOTIFY=0` turns it off. |
| Context nudge | Once per session, when the context passes `contextWarnTokens` (150000 by default), shows a line asking you to run `/dev-kit:handoff` and continue in a fresh session. Skipped when this branch's note was written during the session. A note the hook made itself does not silence it. It never blocks a prompt. |
| `session-state` | On `SessionEnd` and `PreCompact` (both fire in the desktop app and in `claude -p`; the desktop app fires `SessionEnd` when the session is archived; closing a tab was not tried), writes `.claude/wip/<branch>.md`. With no note it makes one: Done lists the commits since the base and the dirty file names (at most 10 each), Next is `run /dev-kit:handoff for a full note`, and the State line ends `auto`. With a note from `handoff` it keeps every line and adds or replaces one `Auto: HEAD <sha> · <n> dirty files` line after State's HEAD line, restoring the note's modified time. Skips the base branch, a detached HEAD and a branch with no commits, no dirty files and no note. It never writes file contents or diffs, and token-like text becomes `<REDACTED>`. Timeout 10 seconds, always exits 0. SessionStart reads the stale-warning sha from the State `HEAD` line only and says when the note holds only an automatic State. Limits: the `Auto:` line is lost when `handoff` overwrites the note; it runs only for sessions that end through `SessionEnd` or compaction; commit subjects are listed as written apart from redaction. |

**Skills** (use as `/dev-kit:<name>`)

| Skill | Use it for |
|---|---|
| `grill` | Settle a vague request with a decision-tree interview; ends with a list of proposed issues when the settled scope has parts that ship on their own. |
| `plan` | Break multi-file work into verifiable steps, using the `impact-mapper` agent to find what the change touches, save the plan to `docs/plans/` and wait for your yes. Each step is a `- [ ] N.` checkbox line, ticked once its Done when check passes. Then each step runs in the `implementer` agent on Sonnet, and the session checks it. A plan resumes at the first unticked step. |
| `debug` | Root cause first, with a feedback loop. |
| `review` | Pre-commit review: the `reviewer` agent checks six axes and verifies each Block item, then Block and Should fix items are fixed, except Scope items, which wait for your decision, and the checks re-run. |
| `handoff` | Across sessions: write a per-branch pause note that the next session on the branch loads. Without one, the `session-state` hook writes an automatic note when the session ends. |
| `issue` | GitHub issue to branch to PR, one issue = one branch = one PR. Modes: `new`, `start` (hands an issue touching 3 or more files to `plan`, so its approved steps run in the `implementer` agent), `finish`, and `fix` (bug flow: root cause, failing test, smallest fix, PR). |
| `ship` | Draft a commit message (`commit`) or PR description (`pr`), print only. |

Skills that need the project's config get it from `kit-config.mjs`: `issue`, `ship`, `review` and `handoff` run it as their first step instead of a `!` injection, so they still load where the shell is refused, plugin evals on Windows included.

If you also keep skills with the same names in `~/.claude/skills` (`debug`, `plan`, `review` and so on), both copies load: plugin skills are namespaced as `/dev-kit:<name>`, so nothing is overridden, but Claude sees two skills for the same job and may pick either. Delete your personal copies once the plugin is installed.

**Agents:** `reviewer` (read-only pre-commit review), `impact-mapper` (read-only search for the files a planned change affects and the code to reuse), `implementer` (runs one step of an approved plan on Sonnet; edits files, never commits).

Nothing here commits, pushes or opens a PR on its own. `ship` only prints; `issue finish` prints the commands, then runs one only after you say yes to it.

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
  "guard": { "git": "ask", "baseBranch": "ask" },
  "sessionStart": { "context": true },
  "stopChecks": ["typecheck", "lint", "relatedTests", "test"],
  "checks": { "test": ["node", "--test", "tests/"] },
  "stopCheckTimeoutSeconds": 270
}
```

- `guard.git`: `"ask"` (default) prompts you each time, `"deny"` blocks outright, `"off"` disables the check. Secret-file blocking stays on regardless.
- `guard.baseBranch`: `"ask"` (default) prompts you before `Edit`, `Write` or `MultiEdit` changes a project file while you are on the base branch, and points at `/dev-kit:issue new`; `"deny"` blocks outright, `"off"` disables the check. It skips files outside the project, `.claude/`, `docs/plans/` and your `issuesDir`, which the issue flow writes on the base branch, the memory store (`docs/memory.md`, `docs/memory/`), and a repository whose base branch has no commit yet.

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
- `stopChecks`: the checks that run at the end of a turn. `[]` turns them off. The default is `typecheck`, `lint`, `relatedTests`, every name in `checks`, and `nodeTests`, which runs only when the project has no `package.json` and no `checks`.
- `checks`: extra stop checks, each a name and a command as a list of words. No shell reads it, so a file name cannot run commands. A name you add is run unless `stopChecks` leaves it out, so list it there when you set `stopChecks` yourself. An entry named like a built-in check (`lint`, say) replaces that check. The checks start only after a JS or TS file, `package.json`, `tsconfig.json` or an ESLint config changes, so `checks` does not help a project in another language.
- `stopCheckTimeoutSeconds`: how long all stop checks together may run, 270 by default; anything that is not a number above zero means the default. The hook is cut off silently at 300 s, so a check that overruns is stopped, with its child processes, and reported to Claude instead.
- `contextWarnTokens`: the context size, in tokens, at which the nudge to run `handoff` appears, 150000 by default (suits a 200k window); anything that is not a number above zero means the default. It counts the last reply's `input_tokens`, `cache_creation_input_tokens` and `cache_read_input_tokens` from the transcript, so a transcript without those fields gives no nudge.
- `sessionStart.context`: set to `false` to leave the branch, package manager, checks and handoff note out of the session. The working rules always print.

Print what was resolved for the current project:

```bash
node plugins/dev-kit/hooks/kit-config.mjs
```

## Memory

Durable project facts live in the repo and are committed with the work: the index `docs/memory.md` holds one line per topic (a link and when to read it), and each topic file `docs/memory/<topic>.md` holds the facts. Claude writes them under the working rules, SessionStart loads the index, and Claude reads a topic file before working on its topic. SessionStart also names, under the index, each index link whose topic file is missing and each backticked repo path in a topic file that no longer exists (placeholders, globs and URLs are skipped); it only reports, never edits. `handoff` keeps the per-branch notes.

The store replaces Claude Code's native auto-memory. Turn that off in each project that uses the kit, in `.claude/settings.json`:

```json
{ "autoMemoryEnabled": false }
```

The kit does not set or check this: in a project without it, both memories run.

## Conventions the workflow assumes

Branches are named `<type>/<slug>` (`feat/login`), commits `<type>(#12): summary`, and PRs `[#12] Title` with `Closes #12`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.

The issue number lives in the commits, not the branch name: the plugin reads it from the branch's `<type>(#N)` commits since the merge-base. Before the first such commit, the skills ask for it (or take it as an argument). If the commits name more than one issue, they ask which one. An issue is optional: without one, commits are `<type>: summary` and the PR has no `Closes` line.

## What stays out of the plugin

Project-specific tooling is not here: GitLab mirroring, framework doc lookups and a project's own test-style guide. Keep those in the project's `.claude/`.

## Test

```bash
node --test tests/hooks.test.mjs tests/inventory.test.mjs tests/eval-history.test.mjs
```

463 tests: 430 run every hook as a separate process against throwaway projects (config detection, the guards, session-start, stop-checks, format-file, notify, context-nudge and session-state, plus the `hooks.json` wiring), 22 run `scripts/inventory.mjs` against a throwaway repo and transcript folder, and 11 run `scripts/eval-history.mjs` against a throwaway repo. No dependencies. CI runs this suite and `claude plugin validate --strict` on Ubuntu and Windows.

Skills are prompts, so they are checked by running them. `plugins/dev-kit/evals/` has cases for `debug` (root cause, flaky test, no reproduction), `grill` (vague request, fact the repo answers, conflicting requirements, a settled idea that splits into issues, a settled change that must not), `issue` (mode picked from a bug report, bug draft, repo issue template, a multi-file issue that must go to `plan`, a one-sentence rename issue that must not, a finished issue whose work found a gotcha that must end with a memory topic written: `issue-finish-memory`), `plan` (a multi-file feature, a rename that needs no plan and must not call `impact-mapper`, a change whose callers sit behind aliases in a 122-file app, the same change with the `impact-mapper` agent blocked, an approved plan whose steps must go to the `implementer` agent, a plan with steps 1 and 2 ticked that must resume at step 3: `plan-resume`), `handoff` (a plain note, a focus argument that must come first, a key in the conversation that must not reach the note), `ship` (a commit message for a pasted diff, with the commands printed and not run) and `review` (a boundary bug the new test misses, a correct change that looks like a bug, a bug outside the diff, a change the request did not ask for, a diff pasted from a repository that is not checked out): each checks that the skill fires and that the answer follows it, and the `review` cases also check that the `reviewer` agent is spawned, except `plan-skip-trivial`, which checks that a one-sentence change gets no plan, `plan-resume`, which checks only that step 3 goes to the `implementer` agent and the ticked steps do not, `plan-implementer-dispatch`, which checks only that the steps go to the `implementer` agent, `issue-start-plan`, which checks only that `plan` runs and writes a plan file, and the `handoff` and `ship` cases, which grade the answer text only (a slash command in the prompt is not a `Skill` call). Three cases cover the memory store, which has no skill: `memory-cross-session` (a fact told in passing reaches a topic file and the index), `memory-topic-read` (the answer is only in a topic file) and `memory-secret` (a key asked to be remembered never reaches a memory write); their `tool_used` graders check the writes, since the judge sees only the final reply. The suite is also run on Linux by the `Evals` workflow, started by hand from the Actions tab (`workflow_dispatch`) and weekly. It needs a `CLAUDE_CODE_OAUTH_TOKEN` repository secret (the output of `claude setup-token`), which you add. It is not run on every push or PR, because every case is about six Claude runs against the API bill.

```bash
claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit Write --ablation none
```

`--ablation none` keeps the "skill fired" check in the score; with the default no-plugin comparison it is only an indicator, so a case could pass without the skill ever firing. `--scaffold` is needed for the `debug`, `grill`, `handoff`, `issue`, `plan-skip-trivial`, `review` and `ship` cases, which build a small project before Claude starts. To see whether a skill makes a difference, run once more without `--ablation none`: the no-plugin baseline should fail some graders other than `skill-fired`. Run the `handoff` cases with `--judge-model sonnet`: the default judge failed notes that met every criterion. The `ship` case was also run with `sonnet`, not compared with the default judge. Shell tools cannot be granted to evals on Windows (no sandbox), so the cases do not rely on running commands. The Linux workflow grants `Bash` with `--allow-tools Bash Edit Write`, which is why `ship-commit`, `issue-start-plan`, `issue-start-small` and `plan-implementer-dispatch` list `Bash` in `allowed_tools`: it takes effect only where the run grants it, and the cases still pass 3 of 3 on Windows without it. On the Linux runner the run logs in and the sandbox installs, but `claude plugin eval` still refuses `Bash` inside each case (`apply-seccomp ... Permission denied`, with claude-code 2.1.314 and 2.1.322), so the git and `gh` steps are not covered there yet and `no-git-write` still cannot fail. Also, a skill that loads context with a `` !`command` `` injection cannot load in them at all: check the run's evidence, not only `skill-fired`.

After each run, commit the change the eval ran on, then record the report with `node scripts/eval-history.mjs record <plugin>/evals/results/<timestamp>/aggregate-result.json` and commit `docs/evals/history.jsonl` with the work. `record` refuses uncommitted changes, since a result stamped with a commit it did not run on would pass for that commit's; `--commit REF` names the commit instead. Record each report once: a second `record` adds its runs again. `node scripts/eval-history.mjs compare --base main` then prints, per case, the pass rate of the newest record at `main` or one of its ancestors, the newest record overall, and all records pooled.

Before a minor release, run `node scripts/inventory.mjs` for the review cadence in `docs/vision.md`. It prints a table of every skill, agent and registered hook with its uses, its evals or tests, and a flag `unused` or `unproven`. Uses come from the Claude Code transcripts of every project under `~/.claude/projects` (`--projects-dir` changes the folder, `--this-repo` keeps only this repo and its worktrees, `--since YYYY-MM-DD` limits the window) and only names and counts are read. A second table lists uses per project, named by the basename of the transcript's first working directory (worktrees merge into their repo, `scratch-*` into `scratch`, a transcript with no working directory is `unknown`), with no paths. A hook leaves no tool call, so its uses come from a usage log: each hook appends `{hook, decision, date}` to `dev-kit-usage` inside this repo's `.git` when it acts (a linked worktree writes to the main repo's log) (the three guards log `ask` and `block`; `allow` is never logged), and the table shows `(ask N, block N)` for them and `not counted` when there is no log. The hook counts cover `--root` only, not other projects, and the log is not rotated; hooks are never flagged `unused`. A skill run by slash command and by the `Skill` tool is counted once for each. Tests per hook are the `it(` lines in the `describe` blocks named after it, so a test written in a loop counts once.

## Develop

Edit files under `plugins/dev-kit/`, then `claude plugin validate plugins/dev-kit`. In a session, `/plugin marketplace update claude-dev-kit` picks up changes (bump `version` in `plugin.json` so installed copies update).
