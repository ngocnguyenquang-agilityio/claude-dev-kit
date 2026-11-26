// Tests for the dev-kit hooks. Each test runs a hook as Claude Code does: a
// separate process, JSON on stdin, CLAUDE_PROJECT_DIR pointing at a throwaway
// project. Run with: node --test tests
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const hooksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "plugins", "dev-kit", "hooks");
const projects = [];

// A throwaway project. `files` maps relative paths to contents.
function makeProject(files = {}, { git = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-kit-test-"));
  projects.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), typeof content === "string" ? content : JSON.stringify(content));
  }
  if (git) {
    for (const args of [["init", "-q"], ["config", "user.email", "t@t"], ["config", "user.name", "t"]]) {
      spawnSync("git", args, { cwd: dir });
    }
  }
  return dir;
}

function runHook(hook, project, input = {}, env = {}) {
  const result = spawnSync("node", [path.join(hooksDir, hook)], {
    cwd: project,
    input: JSON.stringify(input),
    encoding: "utf8",
    // NODE_TEST_CONTEXT comes from the `node --test` running this file. Passed
    // on, it makes a `node --test` inside a hook exit 0 whatever the tests do.
    env: { ...process.env, NODE_TEST_CONTEXT: undefined, CLAUDE_PROJECT_DIR: project, CLAUDE_NOTIFY: "0", ...env },
  });
  return { code: result.status, out: result.stdout.trim(), err: result.stderr.trim() };
}

// Notifications go to a log file instead of the desktop; `notifications` holds
// one "title|body" line per notification the hook would have shown.
function runHookWithNotifications(hook, project, input = {}, env = {}) {
  const log = path.join(project, "notifications.log");
  const result = runHook(hook, project, input, { CLAUDE_NOTIFY: "1", CLAUDE_NOTIFY_LOG: log, ...env });
  const notifications = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
  return { ...result, notifications };
}

// A project on `branch`, cut from a `main` that holds `baseSubjects`, with one
// empty commit per entry of `subjects` on the branch.
function branchWithCommits(branch, subjects, baseSubjects = []) {
  const project = makeProject({ "package.json": {} }, { git: true });
  const git = (...args) => spawnSync("git", args, { cwd: project });
  git("symbolic-ref", "HEAD", "refs/heads/main");
  for (const subject of ["init", ...baseSubjects]) git("commit", "-q", "--allow-empty", "-m", subject);
  git("checkout", "-q", "-b", branch);
  for (const subject of subjects) git("commit", "-q", "--allow-empty", "-m", subject);
  return project;
}

const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const pnpmProject = () =>
  makeProject({
    "package.json": { scripts: { lint: "eslint .", typecheck: "tsc", test: "jest", build: "next build" } },
    "pnpm-lock.yaml": "",
  });

// A name that runs commands if any shell, sh or cmd.exe, reads it unquoted
// or inside double quotes. Every character is valid in a Windows file name.
const HOSTILE_NAME = "src/a $(echo x) `echo y` & echo z %PATH% !PATH! ^ ;.ts";

// An npm project with a fake `tool` installed that writes the arguments it
// gets to tool-args.json, so a test sees exactly what reached the tool.
function projectWithRecordingTool(tool, files = {}, options = {}) {
  const script = "require('fs').writeFileSync('tool-args.json', JSON.stringify(process.argv.slice(2)))";
  const project = makeProject(
    {
      "package.json": { devDependencies: { [tool]: "1.0.0" } },
      "package-lock.json": "{}",
      ".gitignore": "node_modules/\n",
      [`node_modules/${tool}/package.json`]: { name: tool, version: "1.0.0", bin: { [tool]: "cli.js" } },
      [`node_modules/${tool}/cli.js`]: script,
      [`node_modules/.bin/${tool}`]: `#!/bin/sh\nexec node "$(dirname "$0")/../${tool}/cli.js" "$@"\n`,
      [`node_modules/.bin/${tool}.cmd`]: `@node "%~dp0\\..\\${tool}\\cli.js" %*\r\n`,
      ...files,
    },
    options,
  );
  fs.chmodSync(path.join(project, "node_modules", ".bin", tool), 0o755);
  return project;
}

function recordedArgs(project) {
  return JSON.parse(fs.readFileSync(path.join(project, "tool-args.json"), "utf8"));
}

// The recorded argument that names `file`: not an option, and resolving to it.
function assertFileArgument(project, argument, file) {
  assert.doesNotMatch(argument, /^-/);
  assert.equal(path.resolve(project, argument), path.join(project, file));
}

after(() => projects.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

describe("kit-config", () => {
  it("detects the package manager and scripts from the project", () => {
    const project = makeProject(
      {
        "package.json": { scripts: { lint: "x", "type-check": "x", "format:check": "x", test: "x" } },
        "yarn.lock": "",
      },
      { git: true },
    );

    const config = JSON.parse(runHook("kit-config.mjs", project).out);

    assert.equal(config.packageManager, "yarn");
    assert.equal(config.checks.typecheck, "yarn run type-check");
    assert.equal(config.checks.formatCheck, "yarn run format:check");
    assert.equal(config.checks.build, null);
  });

  it("lets .claude/kit.json override the base branch and issues dir", () => {
    const project = makeProject(
      { "package.json": {}, ".claude/kit.json": { baseBranch: "develop", issuesDir: "specs" } },
      { git: true },
    );

    const config = JSON.parse(runHook("kit-config.mjs", project).out);

    assert.equal(config.baseBranch, "develop");
    assert.equal(config.issuesDir, "specs");
  });

  it("splits a <type>/<slug> branch and knows no issue before the first commit", () => {
    const { branch, wipNote } = JSON.parse(runHook("kit-config.mjs", branchWithCommits("fix/login-crash", [])).out);

    assert.deepEqual(branch, { name: "fix/login-crash", type: "fix", slug: "login-crash", issue: null, issues: [] });
    assert.equal(wipNote, ".claude/wip/fix-login-crash.md");
  });

  it("reads the issue number from the branch's <type>(#N) commits", () => {
    const project = branchWithCommits("fix/login-crash", ["fix(#7): guard the null user", "test: cover login", "fix(#7): follow-up"]);

    const { branch } = JSON.parse(runHook("kit-config.mjs", project).out);

    assert.equal(branch.issue, 7);
    assert.deepEqual(branch.issues, [7]);
  });

  it("reports every number, oldest first, when the commits name more than one issue", () => {
    const project = branchWithCommits("feat/search", ["feat(#5): add search", "fix(#3): typo", "feat(#5): filter"]);

    const { branch } = JSON.parse(runHook("kit-config.mjs", project).out);

    assert.equal(branch.issue, null);
    assert.deepEqual(branch.issues, [5, 3]);
  });

  it("ignores issue commits that are already on the base branch", () => {
    const project = branchWithCommits("fix/login-crash", [], ["fix(#9): older work"]);

    assert.deepEqual(JSON.parse(runHook("kit-config.mjs", project).out).branch.issues, []);
  });

  it("never runs a command hidden in the base branch name from kit.json", () => {
    const project = branchWithCommits("fix/login-crash", ["fix(#7): x"]);
    fs.mkdirSync(path.join(project, ".claude"));
    fs.writeFileSync(path.join(project, ".claude", "kit.json"), JSON.stringify({ baseBranch: "main & echo pwned > pwned.txt" }));

    assert.deepEqual(JSON.parse(runHook("kit-config.mjs", project).out).branch.issues, []);
    assert.equal(fs.existsSync(path.join(project, "pwned.txt")), false);
  });

  it("reads no number from an old <type>/<N>-<slug> branch name", () => {
    const { branch } = JSON.parse(runHook("kit-config.mjs", branchWithCommits("fix/7-login-crash", [])).out);

    assert.equal(branch.slug, "7-login-crash");
    assert.equal(branch.issue, null);
  });

  it("reports no package manager for a project without package.json", () => {
    const project = makeProject({ "main.py": "" }, { git: true });

    assert.equal(JSON.parse(runHook("kit-config.mjs", project).out).packageManager, null);
  });
});

describe("package-manager-guard", () => {
  const cases = [
    ["npm install", 2],
    ["yarn add left-pad", 2],
    ["npx jest", 2],
    ["rtk npm run build", 2],
    ["CI=1 npm test && echo done", 2],
    ["pnpm test", 0],
    ["pnpm dlx create-next-app", 0],
    ["git commit -m \"stop using npm\"", 0],
    ["cat <<EOF\nnpm install\nEOF", 0],
  ];
  for (const [command, expected] of cases) {
    it(`${expected === 2 ? "blocks" : "allows"} "${command.replace(/\n/g, "\\n")}" in a pnpm project`, () => {
      assert.equal(runHook("package-manager-guard.mjs", pnpmProject(), bash(command)).code, expected);
    });
  }

  it("points npx users at pnpm dlx", () => {
    assert.match(runHook("package-manager-guard.mjs", pnpmProject(), bash("npx jest")).err, /pnpm dlx/);
  });

  it("allows npx in an npm project and pnpm is blocked there", () => {
    const project = makeProject({ "package.json": {}, "package-lock.json": "{}" });

    assert.equal(runHook("package-manager-guard.mjs", project, bash("npx jest")).code, 0);
    assert.equal(runHook("package-manager-guard.mjs", project, bash("pnpm install")).code, 2);
  });

  it("enforces nothing in a project with no lockfile", () => {
    const project = makeProject({ "package.json": {} });

    assert.equal(runHook("package-manager-guard.mjs", project, bash("yarn add x")).code, 0);
  });

  describe("usage log", () => {
    const gitProject = () => makeProject({ "package.json": {}, "pnpm-lock.yaml": "" }, { git: true });
    const usageFile = (project) => path.join(project, ".git", "dev-kit-usage");

    it("appends one line for a block, without the command", () => {
      const project = gitProject();

      runHook("package-manager-guard.mjs", project, bash("npm install secret-pkg"));

      const lines = fs.readFileSync(usageFile(project), "utf8").split("\n").filter(Boolean);
      assert.equal(lines.length, 1);
      const entry = JSON.parse(lines[0]);
      assert.deepEqual(Object.keys(entry).sort(), ["date", "decision", "hook"]);
      assert.equal(entry.hook, "package-manager-guard");
      assert.equal(entry.decision, "block");
      assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    });

    it("writes a linked worktree's use to the main repo's log", () => {
      const project = gitProject();
      const git = (...args) => spawnSync("git", args, { cwd: project });
      git("add", ".");
      git("commit", "-q", "-m", "init");
      const worktree = path.join(os.tmpdir(), `dev-kit-test-worktree-${process.pid}-${projects.length}`);
      projects.push(worktree);
      assert.equal(git("worktree", "add", "-q", worktree).status, 0);

      assert.equal(runHook("package-manager-guard.mjs", worktree, bash("npm install")).code, 2);

      const lines = fs.readFileSync(usageFile(project), "utf8").split("\n").filter(Boolean);
      assert.equal(lines.length, 1);
      assert.equal(JSON.parse(lines[0]).hook, "package-manager-guard");
    });

    it("writes nothing for an allowed command", () => {
      const project = gitProject();

      assert.equal(runHook("package-manager-guard.mjs", project, bash("pnpm test")).code, 0);

      assert.equal(fs.existsSync(usageFile(project)), false);
    });

    it("still blocks outside a git repo and writes nothing", () => {
      const project = makeProject({ "package.json": {}, "pnpm-lock.yaml": "" });

      const result = runHook("package-manager-guard.mjs", project, bash("npm install"));

      assert.equal(result.code, 2);
      assert.match(result.err, /^Blocked "npm": this project uses pnpm only/);
      assert.deepEqual(fs.readdirSync(project).sort(), ["package.json", "pnpm-lock.yaml"]);
    });
  });
});

describe("safety-guard", () => {
  const project = pnpmProject();
  // `git checkout README.md` must read as a path, not a branch.
  fs.writeFileSync(path.join(project, "README.md"), "");

  for (const command of [
    "git commit -m x",
    "git add . && git commit -m x",
    "git -C sub push origin main",
    "git push --force origin main",
    "git push origin main -f",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "git branch -D old",
    "git rebase main",
    "gh pr create --title x",
    "gh pr merge 3",
    "gh issue close 4",
    "gh api repos/o/r/issues -X POST",
    "gh api repos/{owner}/{repo}/issues/1/comments -f body=x",
    "gh api repos/{owner}/{repo}/pulls/1/comments -X POST",
    "gh api repos/o/r/issues -F title=x",
    "gh api repos/o/r/issues -fbody=x",
    "gh api repos/o/r/issues --field=title=x",
    "gh api repos/o/r/issues --raw-field title=x",
    "gh api repos/o/r/issues --input body.json",
    "gh api repos/o/r/issues -X GET --input=body.json",
    "gh api repos/o/r/issues -XPOST",
    "gh api repos/o/r/issues --method PATCH",
    "gh api repos/o/r/issues --method=DELETE",
    "gh run rerun 12",
    "gh run cancel 12",
    "gh workflow run ci.yml",
    "gh repo delete o/r --yes",
    "gh secret set TOKEN",
    "gh label create bug",
    "gh auth token",
    "gh auth status --show-token",
    "gh pr checkout 3",
    "glab mr merge 3",
    "glab ci view",
    "glab ci retry 12",
    "glab api projects/1/issues -f title=x",
    "f() { git push; }",
    "if ($true) {git push}",
    "1..3 | ForEach-Object {gh pr merge $_}",
    "rm -rf dist",
    "Remove-Item -Recurse -Force build",
    "git checkout -- .",
    "git checkout .",
    "git checkout README.md",
    "git checkout main -- src/a.js",
    "git checkout src/*.js",
    "git checkout -f main",
    "git checkout --theirs a.js",
    "git checkout -p",
    "git checkout -B main",
    "git restore src/a.js",
    "git restore .",
    "git restore --staged --worktree a.js",
    "git restore -S -W a.js",
    "git switch -C main",
    "git switch --force-create main",
    "git switch -f main",
    "git switch --discard-changes main",
    "git rm -f a.js",
    "git rm -rf src",
    "git rm -fr src",
    "git checkout -fq main",
    "git switch -fq main",
    "Remove-Item -r dist",
    "Remove-Item -rec dist",
    "Remove-Item -Recurse:$true dist",
    "ri -Recurse dist",
    "rd /s dist",
    "rd /S /Q dist",
    "rmdir -r dist",
    "del /s *.log",
    "erase /s *.log",
  ]) {
    it(`asks before "${command}"`, () => {
      const { code, out } = runHook("safety-guard.mjs", project, bash(command));

      assert.equal(code, 0);
      assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "ask");
    });
  }

  for (const command of [
    "git status",
    "git diff HEAD",
    "git log --oneline -5",
    "git fetch origin",
    "gh pr view 3",
    "gh pr checks",
    "gh issue list",
    "gh api repos/o/r/issues",
    "gh pr view --json number,url",
    "gh pr list --state all -L 1",
    "gh pr list --state merged --base main --search \"merged:>2026-01-01\"",
    "gh run list --branch fix/x -L 5 --json databaseId,conclusion,name",
    "gh run view 123 --log-failed",
    "gh run watch 123",
    "gh issue view 12",
    "gh issue list --state all -L 1",
    "gh api repos/{owner}/{repo}/pulls/3/comments",
    "gh api search/issues -X GET -f q=x",
    "gh api repos/o/r --method=get",
    "gh release list",
    "gh label list",
    "gh secret list",
    "gh variable list",
    "gh search prs --author @me",
    "gh auth status",
    "glab mr view 3",
    "glab ci trace 12",
    "glab api projects/1/issues",
    "rm file.txt",
    "git checkout main",
    "git checkout -b feat/x",
    "git checkout -b feat/x origin/feat/x",
    "git checkout feat/x",
    "git switch main",
    "git switch -c feat/x",
    "git restore --staged a.js",
    "git restore -S a.js",
    "git rm --cached a.js",
    "Remove-Item a.txt",
    "Remove-Item -Recurse:$false a.txt",
    "rd empty-dir",
    "del a.txt",
    "echo \"git commit is blocked\"",
    "pnpm test",
  ]) {
    it(`lets "${command}" through silently`, () => {
      assert.deepEqual(runHook("safety-guard.mjs", project, bash(command)), { code: 0, out: "", err: "" });
    });
  }

  it("resolves a checkout path against the shell's cwd", () => {
    const sub = path.join(project, "pkg");
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, "only-here.js"), "");
    const checkout = (cwd, file) => runHook("safety-guard.mjs", project, { ...bash(`git checkout ${file}`), cwd });

    assert.equal(JSON.parse(checkout(sub, "only-here.js").out).hookSpecificOutput.permissionDecision, "ask");
    assert.equal(checkout(sub, "README.md").out, "");
  });

  for (const target of [".env", ".env.local", "apps/web/.env.production", "certs/server.pem", "id_rsa", ".ssh/config", "C:\\Users\\x\\.aws\\credentials"]) {
    it(`blocks Read of ${target}`, () => {
      const result = runHook("safety-guard.mjs", project, { tool_name: "Read", tool_input: { file_path: target } });

      assert.equal(result.code, 2);
      assert.match(result.err, /secret file/);
    });
  }

  for (const target of [".env.example", ".env.sample", "src/env.ts", "README.md"]) {
    it(`allows Read of ${target}`, () => {
      assert.equal(runHook("safety-guard.mjs", project, { tool_name: "Read", tool_input: { file_path: target } }).code, 0);
    });
  }

  for (const command of ["cat .env", "type \".env.local\"", "grep TOKEN .env", "Get-Content .env", "head -5 ~/.ssh/id_rsa", "cp .env /tmp/x", "Get-ChildItem | ForEach-Object {Get-Content .env}"]) {
    it(`blocks "${command}"`, () => {
      assert.equal(runHook("safety-guard.mjs", project, bash(command)).code, 2);
    });
  }

  it("allows cat of .env.example", () => {
    assert.equal(runHook("safety-guard.mjs", project, bash("cat .env.example")).code, 0);
  });

  const credentialFiles = [
    ".git-credentials",
    "~/.pypirc",
    ".envrc",
    "infra/prod.tfvars",
    "infra/prod.tfvars.json",
    "credentials.json",
    "~/.kube/config",
    "~/.docker/config.json",
    "~/.npmrc",
  ];
  for (const target of credentialFiles) {
    it(`blocks Read, cat and Get-Content of ${target}`, () => {
      assert.equal(runHook("safety-guard.mjs", project, { tool_name: "Read", tool_input: { file_path: target } }).code, 2);
      assert.equal(runHook("safety-guard.mjs", project, bash(`cat ${target}`)).code, 2);
      assert.equal(runHook("safety-guard.mjs", project, { tool_name: "PowerShell", tool_input: { command: `Get-Content ${target}` } }).code, 2);
    });
  }

  it("blocks cat of the home .npmrc as Git Bash writes it", { skip: process.platform !== "win32" }, () => {
    const gitBashPath = path.join(os.homedir(), ".npmrc").replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
    assert.equal(runHook("safety-guard.mjs", project, bash(`cat ${gitBashPath}`)).code, 2);
  });

  const homeNpmrcSpellings = [
    "$HOME/.npmrc",
    "~/./.npmrc",
    "$env:USERPROFILE\\.npmrc",
    "${env:USERPROFILE}\\.npmrc",
    "%USERPROFILE%\\.npmrc",
    path.join(os.homedir(), ".npmrc"),
  ];
  for (const target of homeNpmrcSpellings) {
    it(`blocks cat of the home .npmrc written as ${target}`, () => {
      assert.equal(runHook("safety-guard.mjs", project, bash(`cat ${target}`)).code, 2);
    });
  }

  it("blocks cat .npmrc when the shell is in the home folder", () => {
    assert.equal(runHook("safety-guard.mjs", project, { ...bash("cat .npmrc"), cwd: os.homedir() }).code, 2);
  });

  for (const target of [".npmrc", "packages/web/.npmrc", "terraform.tfvars.example", ".envrc.sample", "config.json", ".docker/daemon.json"]) {
    it(`allows Read, cat and Get-Content of ${target}`, () => {
      assert.equal(runHook("safety-guard.mjs", project, { tool_name: "Read", tool_input: { file_path: target } }).code, 0);
      assert.equal(runHook("safety-guard.mjs", project, bash(`cat ${target}`)).code, 0);
      assert.equal(runHook("safety-guard.mjs", project, { tool_name: "PowerShell", tool_input: { command: `Get-Content ${target}` } }).code, 0);
    });
  }

  it("blocks instead of asking when guard.git is deny", () => {
    const strict = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "deny" } } });

    assert.equal(runHook("safety-guard.mjs", strict, bash("git push")).code, 2);
  });

  it("blocks gh writes but still lets gh reads through when guard.git is deny", () => {
    const strict = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "deny" } } });

    assert.equal(runHook("safety-guard.mjs", strict, bash("gh api repos/{owner}/{repo}/issues/1/comments -f body=x")).code, 2);
    assert.equal(runHook("safety-guard.mjs", strict, bash("gh run rerun 12")).code, 2);
    assert.deepEqual(runHook("safety-guard.mjs", strict, bash("gh api repos/{owner}/{repo}/pulls/3/comments")), { code: 0, out: "", err: "" });
  });

  it("lets gh writes through when guard.git is off", () => {
    const relaxed = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "off" } } });

    assert.deepEqual(runHook("safety-guard.mjs", relaxed, bash("gh api repos/{owner}/{repo}/pulls/1/comments -X POST")), { code: 0, out: "", err: "" });
    assert.deepEqual(runHook("safety-guard.mjs", relaxed, bash("gh repo delete o/r --yes")), { code: 0, out: "", err: "" });
  });

  it("stops asking when guard.git is off, but still blocks secrets", () => {
    const relaxed = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "off" } } });

    assert.equal(runHook("safety-guard.mjs", relaxed, bash("git push")).out, "");
    assert.equal(runHook("safety-guard.mjs", relaxed, bash("cat .env")).code, 2);
  });

  const fromReviewer = (command) => ({ ...bash(command), agent_type: "dev-kit:reviewer" });

  for (const command of [
    "git fetch origin main",
    "mergebase=$(git merge-base HEAD origin/main)",
    "git diff $(git merge-base HEAD origin/main)",
    "mergebase=$(git merge-base HEAD origin/main) && git diff ${mergebase} --stat",
    "git diff -- \"src/(app)/page.tsx\"",
    "grep -n \"a\\|b\" src/a.ts",
    "git status --porcelain",
    "git log --oneline -5 && git show HEAD --stat",
    "git symbolic-ref --short refs/remotes/origin/HEAD",
    "git branch --show-current",
    "git diff HEAD 2>/dev/null | head -50",
    "node \"/plugins/dev-kit/hooks/kit-config.mjs\"",
    "node \"${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs\"",
    "git symbolic-ref --short refs/remotes/origin/HEAD | cut -d/ -f2-",
    "git -C sub log -3",
    "git --no-pager log -3",
    "git diff 2>&1",
    "pnpm test 2>&1 | tail -20",
    "git diff &> /dev/null",
    "pnpm -r test",
    "pnpm --filter app test",
    "git branch -a",
    "git grep -n TODO",
    "git stash list",
    "gh issue view 12",
    "gh pr diff 3",
    "gh api repos/{owner}/{repo}/pulls/3/comments",
    "glab mr view 3",
    "pnpm run lint",
    "pnpm typecheck",
    "pnpm test",
    "cat src/a.ts",
  ]) {
    it(`lets the reviewer run "${command}"`, () => {
      assert.deepEqual(runHook("safety-guard.mjs", project, fromReviewer(command)), { code: 0, out: "", err: "" });
    });
  }

  for (const command of [
    "git commit -m x",
    "git add .",
    "git checkout -- src/a.ts",
    "git stash",
    "git branch new-branch",
    "git symbolic-ref HEAD refs/heads/other",
    "git diff > out.patch",
    "git diff --output=out.patch",
    "git -c core.pager=touch log",
    "git diff `rm src/a.ts`",
    "pnpm run lint --fix",
    "pnpm test -u",
    "echo hi >| out",
    "echo hi >&out",
    "cat <<EOF; touch x\nhello\nEOF",
    "cat <<< x\ntouch y",
    "echo @'a'; touch z; echo 'b'@",
    "echo \\\" > marker; echo \"x\"",
    "git symbolic-ref -d refs/remotes/origin/HEAD",
    "git fetch origin +main:refs/heads/main",
    "git fetch --upload-pack=./x.sh origin",
    "git --git-dir=/tmp/x diff",
    "git diff --ext-diff",
    "NODE_OPTIONS=--import=./evil.mjs node kit-config.mjs",
    "GIT_EXTERNAL_DIFF=./x.sh git diff",
    "sudo git diff",
    "gh pr view 3 --web",
    "echo $'\\'' > f ; echo ''",
    "git diff $(echo --output=pwn.txt)",
    "opts=$(echo --output=pwn.txt); git diff $opts",
    "git diff $mergebase",
    "git diff $(git merge-base --fork-point main)",
    "pnpm test $(echo --fix)",
    "pnpm lint -o out.txt",
    "pnpm typecheck --outDir dist2",
    "pnpm typecheck src/a.ts",
    "echo a #'\ntouch marker\n#'",
    "echo a #\"\ntouch marker\n#\"",
    "echo hi >&1file",
    "echo hi 2>&1out",
    "gh pr view 3 --web=true",
    "./git status",
    "node ../evil/kit-config.mjs",
    "git status && rm src/a.ts",
    "sed -i s/a/b/ src/a.ts",
    "node -e \"require('fs').writeFileSync('x', '')\"",
    "pnpm install",
    "pnpm run build",
    "gh issue comment 12 --body x",
    "gh api repos/o/r/issues -f title=x",
    "gh api repos/{owner}/{repo}/pulls/3/comments -X POST",
    "gh run rerun 12",
    "glab mr view 3 --web",
    "gh api repos/o/r/issues -f \"title=x -X GET\"",
  ]) {
    it(`blocks the reviewer from running "${command}"`, () => {
      const result = runHook("safety-guard.mjs", project, fromReviewer(command));

      assert.equal(result.code, 2);
      assert.match(result.err, /reviewer is read-only/);
    });
  }

  it("guards the reviewer's PowerShell calls too", () => {
    const powershell = (command) => ({ tool_name: "PowerShell", tool_input: { command }, agent_type: "dev-kit:reviewer" });

    assert.equal(runHook("safety-guard.mjs", project, powershell("git diff")).code, 0);
    assert.equal(runHook("safety-guard.mjs", project, powershell("Set-Content src/a.ts x")).code, 2);
  });

  it("still blocks the reviewer from reading a secret, as a secret", () => {
    assert.match(runHook("safety-guard.mjs", project, fromReviewer("cat .env")).err, /secret file/);
  });

  for (const agentType of [undefined, "Explore", "reviewer", "dev-kit:other"]) {
    it(`leaves commands from agent type ${agentType} to the usual rules`, () => {
      const input = { ...bash("rm file.txt"), agent_type: agentType };

      assert.deepEqual(runHook("safety-guard.mjs", project, input), { code: 0, out: "", err: "" });
    });
  }

  describe("usage log", () => {
    const usageEntries = (gitProject) => {
      const file = path.join(gitProject, ".git", "dev-kit-usage");
      return fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
    };

    it("logs an ask for a git write", () => {
      const gitProject = makeProject({ "package.json": {} }, { git: true });

      const result = runHook("safety-guard.mjs", gitProject, bash("git push origin main"));

      assert.equal(JSON.parse(result.out).hookSpecificOutput.permissionDecision, "ask");
      const entries = usageEntries(gitProject);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].hook, "safety-guard");
      assert.equal(entries[0].decision, "ask");
    });

    it("logs a block for a secret read", () => {
      const gitProject = makeProject({ "package.json": {} }, { git: true });

      assert.equal(runHook("safety-guard.mjs", gitProject, bash("cat .env")).code, 2);

      const entries = usageEntries(gitProject);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].hook, "safety-guard");
      assert.equal(entries[0].decision, "block");
    });

    it("logs nothing for an allowed command", () => {
      const gitProject = makeProject({ "package.json": {} }, { git: true });

      assert.equal(runHook("safety-guard.mjs", gitProject, bash("git status")).code, 0);

      assert.deepEqual(usageEntries(gitProject), []);
    });
  });
});

describe("safety-guard on the base branch", () => {
  const edit = (file, tool = "Edit") => ({ tool_name: tool, tool_input: { file_path: file } });

  // A project with one commit on `main`, checked out on `branch`. `kitJson`
  // goes to .claude/kit.json and `dirs` are created before the first call.
  function projectOn(branch, { kitJson, dirs = [] } = {}) {
    const project = branchWithCommits("feat/x", []);
    spawnSync("git", ["checkout", "-q", branch], { cwd: project });
    for (const dir of dirs) fs.mkdirSync(path.join(project, dir), { recursive: true });
    if (kitJson) {
      fs.mkdirSync(path.join(project, ".claude"), { recursive: true });
      fs.writeFileSync(path.join(project, ".claude", "kit.json"), JSON.stringify(kitJson));
    }
    return project;
  }

  for (const tool of ["Edit", "Write", "MultiEdit"]) {
    it(`asks before ${tool} of a project file on the base branch, and names the issue flow`, () => {
      const result = runHook("safety-guard.mjs", projectOn("main"), edit("src/app.ts", tool));
      const decision = JSON.parse(result.out).hookSpecificOutput;

      assert.equal(result.code, 0);
      assert.equal(decision.permissionDecision, "ask");
      assert.match(decision.permissionDecisionReason, /\/dev-kit:issue new/);
    });
  }

  it("stays silent on a feature branch", () => {
    assert.deepEqual(runHook("safety-guard.mjs", projectOn("feat/x"), edit("src/app.ts")), { code: 0, out: "", err: "" });
  });

  // Claude Code sends absolute paths, and a path may wander through `..`.
  it("asks for an absolute path and a path with .. inside the project", () => {
    const project = projectOn("main");

    for (const file of [path.join(project, "src", "app.ts"), path.join(project, "src", "..", "src", "app.ts")]) {
      assert.match(runHook("safety-guard.mjs", project, edit(file)).out, /"ask"/);
    }
  });

  it("blocks instead of asking when guard.baseBranch is deny", () => {
    const project = projectOn("main", { kitJson: { guard: { baseBranch: "deny" } } });
    const result = runHook("safety-guard.mjs", project, edit("src/app.ts"));

    assert.equal(result.code, 2);
    assert.match(result.err, /\/dev-kit:issue new/);
  });

  it("stays silent when guard.baseBranch is off", () => {
    const project = projectOn("main", { kitJson: { guard: { baseBranch: "off" } } });

    assert.deepEqual(runHook("safety-guard.mjs", project, edit("src/app.ts")), { code: 0, out: "", err: "" });
  });

  it("keeps asking when only guard.git is off, the two switches are separate", () => {
    const project = projectOn("main", { kitJson: { guard: { git: "off" } } });

    assert.match(runHook("safety-guard.mjs", project, edit("src/app.ts")).out, /"ask"/);
  });

  it("follows the base branch set in kit.json", () => {
    const project = projectOn("feat/x", { kitJson: { baseBranch: "feat/x" } });

    assert.match(runHook("safety-guard.mjs", project, edit("src/app.ts")).out, /"ask"/);
  });

  for (const file of [
    ".claude/settings.json",
    "docs/plans/2026-01-01-thing.md",
    "docs/issues/50-thing.md",
    "docs/issues/README.md",
    "docs/memory.md",
    "docs/memory/build.md",
  ]) {
    it(`stays silent for ${file}, the issue flow or the memory store writes it on the base branch`, () => {
      const project = projectOn("main", { dirs: ["docs/issues"] });

      assert.deepEqual(runHook("safety-guard.mjs", project, edit(file, "Write")), { code: 0, out: "", err: "" });
    });
  }

  it("stays silent for a file outside the project", () => {
    const outside = path.join(os.tmpdir(), "dev-kit-elsewhere.ts");

    assert.deepEqual(runHook("safety-guard.mjs", projectOn("main"), edit(outside)), { code: 0, out: "", err: "" });
  });

  it("stays silent outside a git repository", () => {
    assert.deepEqual(runHook("safety-guard.mjs", pnpmProject(), edit("src/app.ts")), { code: 0, out: "", err: "" });
  });

  it("stays silent in a repository with no commit yet", () => {
    const project = makeProject({}, { git: true });
    spawnSync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: project });

    assert.deepEqual(runHook("safety-guard.mjs", project, edit("src/app.ts")), { code: 0, out: "", err: "" });
  });

  it("still blocks a secret file first", () => {
    assert.match(runHook("safety-guard.mjs", projectOn("main"), edit(".env")).err, /secret file/);
  });
});

describe("safety-guard on the memory store", () => {
  // Built from parts so this file holds no string a secret scanner would flag.
  const secrets = {
    "a Stripe-style key": ["sk", "test", "EVALFAKE0123456789abcdef"].join("_"),
    "an AWS access key id": "AKIA" + "ABCDEFGHIJKLMNOP",
    "a GitHub token": "ghp_" + "a".repeat(36),
    "a fine-grained GitHub token": "github_pat_" + "B".repeat(30),
    "a Slack token": "xoxb-" + "1234567890-abcdef",
    "a private key block": "-----BEGIN RSA " + "PRIVATE KEY-----\nMIIE\n",
    "a URL with a password": "postgres://admin:" + "hunter2@db.example.com/app",
  };
  const fact = (value) => `Staging upload uses ${value}; the upload step is done.`;
  const inputs = {
    Write: (file, text) => ({ tool_name: "Write", tool_input: { file_path: file, content: text } }),
    Edit: (file, text) => ({ tool_name: "Edit", tool_input: { file_path: file, old_string: "x", new_string: text } }),
    MultiEdit: (file, text) => ({
      tool_name: "MultiEdit",
      tool_input: { file_path: file, edits: [{ old_string: "a", new_string: "plain" }, { old_string: "b", new_string: text }] },
    }),
  };

  for (const [kind, value] of Object.entries(secrets)) {
    it(`blocks ${kind} written to a topic file`, () => {
      const result = runHook("safety-guard.mjs", makeProject(), inputs.Write("docs/memory/staging.md", fact(value)));

      assert.equal(result.code, 2);
      assert.match(result.err, /memory store/);
    });
  }

  for (const tool of ["Write", "Edit", "MultiEdit"]) {
    it(`blocks a key in the index through ${tool}`, () => {
      const result = runHook("safety-guard.mjs", makeProject(), inputs[tool]("docs/memory.md", fact(secrets["a Stripe-style key"])));

      assert.equal(result.code, 2);
    });
  }

  it("blocks a key glued to a variable name", () => {
    const text = `STRIPE_${secrets["a Stripe-style key"]}`;

    assert.equal(runHook("safety-guard.mjs", makeProject(), inputs.Write("docs/memory/staging.md", text)).code, 2);
  });

  it("blocks an absolute path into the memory store", () => {
    const project = makeProject();
    const file = path.join(project, "docs", "memory", "staging.md");

    assert.equal(runHook("safety-guard.mjs", project, inputs.Write(file, fact(secrets["a GitHub token"]))).code, 2);
  });

  for (const text of [
    "The staging database resets every night, so never seed it by hand.",
    fact("sk_test_<REDACTED>"),
    fact("the key in $STRIPE_KEY"),
    fact("postgres://admin:<REDACTED>@db.example.com/app"),
  ]) {
    it(`allows a fact with no secret: ${text.slice(0, 40)}`, () => {
      assert.deepEqual(runHook("safety-guard.mjs", makeProject(), inputs.Write("docs/memory/staging.md", text)), { code: 0, out: "", err: "" });
    });
  }

  it("leaves files outside the memory store to the other checks", () => {
    const result = runHook("safety-guard.mjs", makeProject(), inputs.Write("docs/memory-notes.md", fact(secrets["a Stripe-style key"])));

    assert.deepEqual(result, { code: 0, out: "", err: "" });
  });

  it("blocks even when guard.git and guard.baseBranch are off", () => {
    const project = makeProject({ ".claude/kit.json": { guard: { git: "off", baseBranch: "off" } } });

    assert.equal(runHook("safety-guard.mjs", project, inputs.Write("docs/memory/staging.md", fact(secrets["a Slack token"]))).code, 2);
  });
});

describe("session-start", () => {
  it("prints the rules and the project context", () => {
    const project = makeProject({ "package.json": { scripts: { test: "x" } }, "pnpm-lock.yaml": "" }, { git: true });

    const { code, out } = runHook("session-start.mjs", project);

    assert.equal(code, 0);
    assert.match(out, /dev-kit working rules/);
    assert.match(out, /Package manager: pnpm/);
    assert.match(out, /pnpm run test/);
  });

  it("includes the memory index", () => {
    const project = makeProject({ "docs/memory.md": "- [Staging](memory/staging.md): read before touching staging data." }, { git: true });

    const { code, out } = runHook("session-start.mjs", project);

    assert.equal(code, 0);
    assert.match(out, /## Project memory \(docs\/memory\.md\)\n- \[Staging\]\(memory\/staging\.md\)/);
  });

  it("prints no memory section when there is no index or it is empty", () => {
    assert.doesNotMatch(runHook("session-start.mjs", makeProject({}, { git: true })).out, /Project memory/);
    assert.doesNotMatch(runHook("session-start.mjs", makeProject({ "docs/memory.md": "\n" }, { git: true })).out, /Project memory/);
  });

  // Output past 10000 characters is cut, so a long index must not push the
  // project context, and the handoff note inside it, out.
  it("prints the memory index after the project context", () => {
    const project = makeProject({ "docs/memory.md": "- [Build](memory/build.md): read before changing CI." }, { git: true });

    const { out } = runHook("session-start.mjs", project);

    assert.ok(out.indexOf("dev-kit project context") < out.indexOf("Project memory"));
  });

  it("asks to prune the memory index only once it passes 6000 characters", () => {
    const sized = (length) => makeProject({ "docs/memory.md": "x".repeat(length) }, { git: true });

    assert.doesNotMatch(runHook("session-start.mjs", sized(6000)).out, /merge or prune/);
    assert.match(runHook("session-start.mjs", sized(6001)).out, /memory index is 6001 characters; merge or prune/);
  });

  it("keeps the memory index when sessionStart.context is false", () => {
    const project = makeProject(
      { ".claude/kit.json": { sessionStart: { context: false } }, "docs/memory.md": "- [Build](memory/build.md): read before changing CI." },
      { git: true },
    );

    const { out } = runHook("session-start.mjs", project);

    assert.match(out, /Project memory/);
    assert.doesNotMatch(out, /dev-kit project context/);
  });

  it("includes this branch's handoff note", () => {
    const project = makeProject(
      { "package.json": {}, ".claude/wip/feat-3-search.md": "# WIP: feat/3-search\n\n## Next\n\n- wire the filter" },
      { git: true },
    );
    spawnSync("git", ["checkout", "-q", "-b", "feat/3-search"], { cwd: project });

    assert.match(runHook("session-start.mjs", project).out, /wire the filter/);
  });

  describe("handoff note freshness", () => {
    const git = (project, ...args) => spawnSync("git", args, { cwd: project, encoding: "utf8" }).stdout.trim();
    const writeNote = (project, state) => {
      fs.mkdirSync(path.join(project, ".claude", "wip"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".claude", "wip", "feat-search.md"),
        `# WIP: feat/search\n\n## Next\n\n- wire the filter\n\n## State\n\n${state}\n`,
      );
    };
    const noteAtHead = (project) => writeNote(project, `HEAD ${git(project, "rev-parse", "--short", "HEAD")} · 0 dirty files`);
    const STALE = /Check it against the repo before acting on it/;

    it("loads a note written at HEAD without a warning", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      noteAtHead(project);

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, /wire the filter/);
      assert.doesNotMatch(out, STALE);
    });

    it("counts the commits made after the note", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      noteAtHead(project);
      git(project, "commit", "-q", "--allow-empty", "-m", "feat(#3): more");
      git(project, "commit", "-q", "--allow-empty", "-m", "feat(#3): even more");

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, /2 commits since/);
      assert.match(out, STALE);
      assert.match(out, /wire the filter/);
    });

    it("warns without a count when the note has no HEAD line", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      writeNote(project, "0 dirty files");

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, STALE);
      assert.doesNotMatch(out, /commits? since/);
      assert.match(out, /wire the filter/);
    });

    // `main` is a ref git would accept and count from: only a hex sha may reach git.
    it("does not pass a ref name from the note to git", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      writeNote(project, "HEAD main · 0 dirty files");

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, STALE);
      assert.doesNotMatch(out, /commits? since/);
    });

    it("warns without a count when history was rewritten after the note", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      noteAtHead(project);
      git(project, "commit", "-q", "--amend", "--allow-empty", "-m", "feat(#3): add search, reworded");

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, STALE);
      assert.doesNotMatch(out, /commits? since/);
    });

    it("skips the note of a branch already merged into the base", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      noteAtHead(project);
      git(project, "checkout", "-q", "main");
      git(project, "merge", "-q", "--no-ff", "-m", "Merge feat/search", "feat/search");
      git(project, "checkout", "-q", "feat/search");

      const { out } = runHook("session-start.mjs", project);

      assert.doesNotMatch(out, /wire the filter/);
      assert.match(out, /\.claude\/wip\/feat-search\.md/);
      assert.match(out, /already merged into main/);
    });

    it("trusts origin over a local base that has not pulled the merge yet", () => {
      const project = branchWithCommits("feat/search", ["feat(#3): add search"]);
      noteAtHead(project);
      git(project, "checkout", "-q", "main");
      git(project, "merge", "-q", "--no-ff", "-m", "Merge feat/search", "feat/search");
      git(project, "update-ref", "refs/remotes/origin/main", "main");
      git(project, "reset", "-q", "--hard", "main~1");
      git(project, "checkout", "-q", "feat/search");

      const { out } = runHook("session-start.mjs", project);

      assert.doesNotMatch(out, /wire the filter/);
      assert.match(out, /already merged into origin\/main/);
    });

    it("still loads the note of a new branch with no commits of its own", () => {
      const project = branchWithCommits("feat/search", [], ["base work"]);
      noteAtHead(project);

      const { out } = runHook("session-start.mjs", project);

      assert.match(out, /wire the filter/);
      assert.doesNotMatch(out, /already merged/);
    });
  });

  it("names the branch's issue from its commits", () => {
    const project = branchWithCommits("fix/login-crash", ["fix(#7): guard the null user"]);

    assert.match(runHook("session-start.mjs", project).out, /Branch: fix\/login-crash \(issue #7\)/);
  });

  it("flags a branch whose commits name more than one issue", () => {
    const project = branchWithCommits("feat/search", ["feat(#5): add search", "fix(#3): typo"]);

    assert.match(runHook("session-start.mjs", project).out, /\(issues #5, #3: conflict\)/);
  });

  it("leaves the project context out when sessionStart.context is false", () => {
    const project = makeProject(
      { "package.json": {}, ".claude/kit.json": { sessionStart: { context: false } } },
      { git: true },
    );

    const { out } = runHook("session-start.mjs", project);

    assert.match(out, /working rules/);
    assert.doesNotMatch(out, /project context/);
  });

  describe("usage log", () => {
    const usage = (project) =>
      fs.readFileSync(path.join(project, ".git", "dev-kit-usage"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

    it("logs fired", () => {
      const project = makeProject({}, { git: true });

      assert.equal(runHook("session-start.mjs", project).code, 0);

      assert.deepEqual(usage(project).map(({ hook, decision }) => [hook, decision]), [["session-start", "fired"]]);
    });
  });
});

describe("stop-checks", () => {
  // A project whose scripts are plain node one-liners, so no tooling is needed.
  const failing = "node -e \"console.error('TS2322: bad type'); process.exit(1)\"";
  const passing = "node -e \"process.exit(0)\"";
  const withScripts = (scripts, extra = {}) => {
    const project = makeProject(
      { "package.json": { scripts }, "package-lock.json": "{}", "src/a.ts": "export const a = 1;\n", ...extra },
      { git: true },
    );
    return project;
  };

  it("sends a failing typecheck back to Claude", () => {
    const result = runHook("stop-checks.mjs", withScripts({ typecheck: failing, lint: passing }), { hook_event_name: "Stop" });

    assert.equal(result.code, 2);
    assert.match(result.err, /npm run typecheck failed/);
    assert.match(result.err, /TS2322/);
  });

  // A project with no package.json, the way this repo is.
  const failingTest = "import test from 'node:test';\nimport assert from 'node:assert';\ntest('x', () => assert.equal(1, 2));\n";
  const passingTest = "import test from 'node:test';\ntest('x', () => {});\n";
  const bare = (files) => makeProject({ "src/a.mjs": "export const a = 1;\n", ...files }, { git: true });

  it("runs the Node tests of a project with no package.json and sends a failure back", () => {
    const result = runHook("stop-checks.mjs", bare({ "tests/a.test.mjs": failingTest }), {});

    assert.equal(result.code, 2);
    assert.match(result.err, /node --test .*a\.test\.mjs failed/);
  });

  it("passes when the Node tests of a project with no package.json pass", () => {
    assert.equal(runHook("stop-checks.mjs", bare({ "tests/a.test.mjs": passingTest }), {}).code, 0);
  });

  it("runs a check named in kit.json instead of looking for Node tests", () => {
    const project = bare({
      "tests/a.test.mjs": failingTest,
      ".claude/kit.json": { checks: { custom: ["node", "-e", "process.exit(0)"] } },
    });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("sends a failing kit.json check back to Claude", () => {
    const project = bare({ ".claude/kit.json": { checks: { custom: ["node", "-e", "console.error('boom'); process.exit(1)"] } } });
    const result = runHook("stop-checks.mjs", project, {});

    assert.equal(result.code, 2);
    assert.match(result.err, /boom/);
  });

  it("does not run a kit.json check through a shell", () => {
    const project = bare({ ".claude/kit.json": { checks: { custom: ["node", "-e", "process.exit(0)", "&& echo hacked > hacked.txt"] } } });
    runHook("stop-checks.mjs", project, {});

    assert.equal(fs.existsSync(path.join(project, "hacked.txt")), false);
  });

  it("stays quiet in a project with no package.json and no tests", () => {
    assert.equal(runHook("stop-checks.mjs", bare({}), {}).code, 0);
  });

  it("runs the checks again when only a check's config changes", () => {
    const project = withScripts({ typecheck: counting(0) }, { ".gitignore": "runs.log\n" });
    runHook("stop-checks.mjs", project, {});
    spawnSync("git", ["add", "."], { cwd: project });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: project });
    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 1, "the clean tree after the commit runs nothing");

    // Not a code file, so only the config rule can make this run the checks.
    fs.writeFileSync(path.join(project, ".eslintrc.json"), "{}\n");
    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 2, "a new ESLint config");
    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 2, "an unchanged tree is skipped");

    const manifest = path.join(project, "package.json");
    fs.writeFileSync(manifest, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifest, "utf8")), description: "x" }));
    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 3, "an edit to a tracked package.json");
  });

  it("ignores a tracked test file that was deleted and not yet committed", () => {
    const project = bare({ "tests/a.test.mjs": passingTest });
    spawnSync("git", ["add", "."], { cwd: project });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: project });
    fs.rmSync(path.join(project, "tests/a.test.mjs"));

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("runs a kit.json check named like a built-in check once", () => {
    const append = ["node", "-e", "require('fs').appendFileSync('runs.log','x')"];
    const project = bare({ ".claude/kit.json": { checks: { lint: append } } });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.equal(runCount(project), 1);
  });

  it("falls back to the default time limit when stopCheckTimeoutSeconds is 0", () => {
    const project = withScripts({ typecheck: passing }, { ".claude/kit.json": { stopCheckTimeoutSeconds: 0 } });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("reports a check that outlives the time limit instead of passing it", () => {
    const sleeping = "node -e \"console.log('still-working'); setTimeout(() => {}, 30000)\"";
    const project = withScripts({ typecheck: sleeping }, { ".claude/kit.json": { stopCheckTimeoutSeconds: 1 } });

    const result = runHook("stop-checks.mjs", project, {});

    assert.equal(result.code, 2);
    assert.match(result.err, /The 1 s that all stop checks share ran out while npm run typecheck was running/);
    assert.match(result.err, /still-working/, "the output so far reaches Claude");
    assert.equal(runHook("stop-checks.mjs", project, {}).code, 2, "a timeout is not remembered as a pass");
  });

  it("sends a failing lint back to Claude", () => {
    assert.equal(runHook("stop-checks.mjs", withScripts({ typecheck: passing, lint: failing }), {}).code, 2);
  });

  it("passes when the checks pass", () => {
    assert.equal(runHook("stop-checks.mjs", withScripts({ typecheck: passing, lint: passing }), {}).code, 0);
  });

  it("does nothing when no code file changed", () => {
    const project = makeProject({ "package.json": { scripts: { typecheck: failing } }, "package-lock.json": "{}", "notes.md": "x" }, { git: true });
    spawnSync("git", ["add", "."], { cwd: project });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: project });
    fs.appendFileSync(path.join(project, "notes.md"), "more");

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("does not loop when the stop hook is already active", () => {
    assert.equal(runHook("stop-checks.mjs", withScripts({ typecheck: failing }), { stop_hook_active: true }).code, 0);
  });

  it("runs only the checks listed in stopChecks", () => {
    const project = withScripts({ typecheck: failing, lint: passing }, { ".claude/kit.json": { stopChecks: ["lint"] } });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("does nothing outside a Node project", () => {
    const project = makeProject({ "main.py": "x = 1" }, { git: true });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
  });

  it("sends no notification while a check fails", () => {
    const result = runHookWithNotifications("stop-checks.mjs", withScripts({ typecheck: failing }));

    assert.equal(result.code, 2);
    assert.deepEqual(result.notifications, []);
  });

  it("notifies once when the checks pass", () => {
    const { notifications } = runHookWithNotifications("stop-checks.mjs", withScripts({ typecheck: passing, lint: passing }));

    assert.equal(notifications.length, 1);
    assert.match(notifications[0], /\|Finished\. Your turn\.$/);
  });

  it("notifies once outside a Node project, where no checks run", () => {
    assert.equal(runHookWithNotifications("stop-checks.mjs", makeProject({ "main.py": "x = 1" }, { git: true })).notifications.length, 1);
  });

  it("notifies on the re-run after a failed check, because the first Stop did not", () => {
    const { notifications } = runHookWithNotifications("stop-checks.mjs", withScripts({ typecheck: failing }), { stop_hook_active: true });

    assert.equal(notifications.length, 1);
  });

  it("passes a changed file with shell metacharacters to Jest unchanged", () => {
    const project = projectWithRecordingTool("jest", { [HOSTILE_NAME]: "x" }, { git: true });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.deepEqual(recordedArgs(project), ["--findRelatedTests", HOSTILE_NAME, "--passWithNoTests"]);
  });

  it("passes a changed file with shell metacharacters to Vitest unchanged", () => {
    const project = projectWithRecordingTool("vitest", { [HOSTILE_NAME]: "x" }, { git: true });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.deepEqual(recordedArgs(project), ["related", "--run", "--passWithNoTests", HOSTILE_NAME]);
  });

  it("passes a changed file starting with '-' to Jest as a file, not an option", () => {
    const project = projectWithRecordingTool("jest", { "--config=evil.ts": "x" }, { git: true });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assertFileArgument(project, recordedArgs(project)[1], "--config=evil.ts");
  });

  it("skips related tests when kit.json names a package manager the kit doesn't know", () => {
    const files = { "src/a.ts": "x", ".claude/kit.json": { packageManager: "deno" } };
    const project = projectWithRecordingTool("jest", files, { git: true });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.equal(fs.existsSync(path.join(project, "tool-args.json")), false);
  });

  it("sends nothing when CLAUDE_NOTIFY=0", () => {
    const result = runHookWithNotifications("stop-checks.mjs", withScripts({ typecheck: passing }), {}, { CLAUDE_NOTIFY: "0" });

    assert.deepEqual(result.notifications, []);
  });

  // Checks that log each run to runs.log, which is not a code file.
  const counting = (exitCode) => `node -e "require('fs').appendFileSync('runs.log','x'); process.exit(${exitCode})"`;
  const runCount = (project) => fs.readFileSync(path.join(project, "runs.log"), "utf8").length;

  it("runs the checks once while the tree stays as it was when they passed", () => {
    const project = withScripts({ typecheck: counting(0) });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);
    assert.equal(runCount(project), 1);
  });

  it("runs the checks again after an untracked code file changes", () => {
    const project = withScripts({ typecheck: counting(0) });
    runHook("stop-checks.mjs", project, {});
    fs.appendFileSync(path.join(project, "src/a.ts"), "export const b = 2;\n");

    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 2);
  });

  it("runs the checks again after a tracked file changes", () => {
    const project = withScripts({ typecheck: counting(0) }, { ".gitignore": "runs.log\n" });
    spawnSync("git", ["add", "."], { cwd: project });
    spawnSync("git", ["commit", "-qm", "init"], { cwd: project });
    fs.appendFileSync(path.join(project, "src/a.ts"), "export const b = 2;\n");
    runHook("stop-checks.mjs", project, {});
    fs.appendFileSync(path.join(project, "src/a.ts"), "export const c = 3;\n");

    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 2);
  });

  it("runs the checks again when the check commands change", () => {
    const project = withScripts({ typecheck: counting(0), lint: counting(0) });
    runHook("stop-checks.mjs", project, {});
    fs.mkdirSync(path.join(project, ".claude"));
    fs.writeFileSync(path.join(project, ".claude", "kit.json"), JSON.stringify({ stopChecks: ["lint"] }));

    runHook("stop-checks.mjs", project, {});
    assert.equal(runCount(project), 3);
  });

  it("never caches a failing run", () => {
    const project = withScripts({ typecheck: counting(1) });

    assert.equal(runHook("stop-checks.mjs", project, {}).code, 2);
    assert.equal(runHook("stop-checks.mjs", project, {}).code, 2);
    assert.equal(runCount(project), 2);
  });

  describe("usage log", () => {
    const usage = (project) =>
      fs.readFileSync(path.join(project, ".git", "dev-kit-usage"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

    it("logs a stop with failing checks as a block, and a passing one as fired", () => {
      const failing = withScripts({ typecheck: "node -e \"process.exit(1)\"" });
      const passing = withScripts({ typecheck: "node -e \"process.exit(0)\"" });

      assert.equal(runHook("stop-checks.mjs", failing, {}).code, 2);
      assert.equal(runHook("stop-checks.mjs", passing, {}).code, 0);

      assert.deepEqual(usage(failing).map(({ hook, decision }) => [hook, decision]), [["stop-checks", "block"]]);
      assert.deepEqual(usage(passing).map(({ hook, decision }) => [hook, decision]), [["stop-checks", "fired"]]);
    });

    it("logs nothing when no check ran", () => {
      const project = makeProject({ "README.md": "x" }, { git: true });

      assert.equal(runHook("stop-checks.mjs", project, {}).code, 0);

      assert.equal(fs.existsSync(path.join(project, ".git", "dev-kit-usage")), false);
    });
  });
});

describe("format-file", () => {
  it("does nothing for a file outside the project", () => {
    const project = makeProject({ "package.json": {} });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: path.join(os.tmpdir(), "elsewhere.ts") } }).code, 0);
  });

  it("does nothing when the project has neither Prettier nor ESLint", () => {
    const project = makeProject({ "package.json": {}, "src/a.ts": "const a=1" });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: "src/a.ts" } }).code, 0);
    assert.equal(fs.readFileSync(path.join(project, "src/a.ts"), "utf8"), "const a=1");
  });

  it("does nothing without a file path", () => {
    assert.equal(runHook("format-file.mjs", makeProject({ "package.json": {} }), {}).code, 0);
  });

  it("passes a file name with shell metacharacters to Prettier unchanged", () => {
    const project = projectWithRecordingTool("prettier", { [HOSTILE_NAME]: "x" });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: HOSTILE_NAME } }).code, 0);
    assert.deepEqual(recordedArgs(project), ["--write", "--ignore-unknown", path.normalize(HOSTILE_NAME)]);
  });

  it("passes a file name with shell metacharacters to ESLint unchanged", () => {
    const project = projectWithRecordingTool("eslint", { [HOSTILE_NAME]: "x" });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: HOSTILE_NAME } }).code, 0);
    assert.deepEqual(recordedArgs(project), ["--fix", "--no-warn-ignored", path.normalize(HOSTILE_NAME)]);
  });

  it("passes a file name starting with '-' to Prettier as a file, not an option", () => {
    const project = projectWithRecordingTool("prettier", { "--config=evil.ts": "x" });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: "--config=evil.ts" } }).code, 0);
    assertFileArgument(project, recordedArgs(project).at(-1), "--config=evil.ts");
  });

  it("does nothing when kit.json names a package manager the kit doesn't know", () => {
    const project = projectWithRecordingTool("prettier", { "src/a.ts": "x", ".claude/kit.json": { packageManager: "deno" } });

    assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: "src/a.ts" } }).code, 0);
    assert.equal(fs.existsSync(path.join(project, "tool-args.json")), false);
  });

  describe("usage log", () => {
    const usage = (project) =>
      fs.readFileSync(path.join(project, ".git", "dev-kit-usage"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

    it("logs one format after Prettier ran", () => {
      const project = projectWithRecordingTool("prettier", { "src/a.ts": "x" }, { git: true });

      assert.equal(runHook("format-file.mjs", project, { tool_input: { file_path: "src/a.ts" } }).code, 0);

      assert.deepEqual(usage(project).map(({ hook, decision }) => [hook, decision]), [["format-file", "format"]]);
    });
  });
});

describe("notify", () => {
  it("exits quietly when CLAUDE_NOTIFY=0", () => {
    assert.deepEqual(runHook("notify.mjs", makeProject(), { message: "x" }), { code: 0, out: "", err: "" });
  });

  it("shows the title and message Claude Code sends", () => {
    const { code, notifications } = runHookWithNotifications("notify.mjs", makeProject(), { title: "Permission", message: "Allow Bash?" });

    assert.equal(code, 0);
    assert.deepEqual(notifications, ["Permission|Allow Bash?"]);
  });

  it("names the project when Claude Code sends no title", () => {
    const project = makeProject();

    assert.deepEqual(runHookWithNotifications("notify.mjs", project, {}).notifications, [
      `Claude Code: ${path.basename(project)}|Needs your attention.`,
    ]);
  });

  describe("usage log", () => {
    const usage = (project) =>
      fs.readFileSync(path.join(project, ".git", "dev-kit-usage"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

    it("logs notify when notifications are on, and nothing when CLAUDE_NOTIFY=0", () => {
      const project = makeProject({}, { git: true });
      const off = makeProject({}, { git: true });

      assert.equal(runHookWithNotifications("notify.mjs", project, { message: "x" }).code, 0);
      assert.equal(runHook("notify.mjs", off, { message: "x" }, { CLAUDE_NOTIFY: "0" }).code, 0);

      assert.deepEqual(usage(project).map(({ hook, decision }) => [hook, decision]), [["notify", "notify"]]);
      assert.equal(fs.existsSync(path.join(off, ".git", "dev-kit-usage")), false);
    });
  });
});

describe("context-nudge", () => {
  // Lines shaped like a real Claude Code transcript: usage sits on the
  // assistant message, and the context is the sum of the three input fields.
  const entry = (timestamp, usage) =>
    JSON.stringify({ type: usage ? "assistant" : "user", timestamp, message: { role: usage ? "assistant" : "user", ...(usage && { usage }) } });
  const usage = (cacheRead) => ({ input_tokens: 2, cache_creation_input_tokens: 1999, cache_read_input_tokens: cacheRead, output_tokens: 219 });

  let counter = 0;
  const sessionId = () => `nudge-test-${process.pid}-${counter++}`;
  const transcript = (project, lines) => {
    const file = path.join(project, "transcript.jsonl");
    fs.writeFileSync(file, lines.join("\n"));
    return file;
  };
  const prompt = (project, file, id) => runHook("context-nudge.mjs", project, { session_id: id, transcript_path: file });
  const long = () => [entry("2026-01-01T00:00:00Z"), entry("2026-01-01T00:01:00Z", usage(160000))];

  after(() => {
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (name.startsWith(`dev-kit-nudge-nudge-test-${process.pid}-`)) fs.rmSync(path.join(os.tmpdir(), name), { force: true });
    }
  });

  it("stays silent below the threshold", () => {
    const project = makeProject({}, { git: true });
    const { code, out } = prompt(project, transcript(project, [entry("2026-01-01T00:00:00Z"), entry("2026-01-01T00:01:00Z", usage(81413))]), sessionId());

    assert.equal(code, 0);
    assert.equal(out, "");
  });

  it("nudges once past the threshold, summing all three input fields", () => {
    const project = makeProject({}, { git: true });
    const file = transcript(project, long());
    const id = sessionId();
    const first = prompt(project, file, id);

    assert.equal(first.code, 0);
    assert.match(JSON.parse(first.out).systemMessage, /162k tokens.*\/dev-kit:handoff/);
    assert.equal(prompt(project, file, id).out, "");
  });

  it("uses contextWarnTokens from kit.json", () => {
    const project = makeProject({ ".claude/kit.json": { contextWarnTokens: 200000 } }, { git: true });

    assert.equal(prompt(project, transcript(project, long()), sessionId()).out, "");
  });

  it("stays silent and exits 0 on a missing, empty or renamed-usage transcript", () => {
    const project = makeProject({}, { git: true });
    const renamed = JSON.stringify({ type: "assistant", message: { usage: { prompt_tokens: 999999 } } });

    for (const file of [path.join(project, "missing.jsonl"), transcript(project, []), transcript(project, ["not json", renamed])]) {
      const { code, out } = prompt(project, file, sessionId());
      assert.equal(code, 0);
      assert.equal(out, "");
    }
    assert.equal(runHook("context-nudge.mjs", project, {}).code, 0);
  });

  it("stays silent when the input has no session id", () => {
    const project = makeProject({}, { git: true });
    const { code, out } = runHook("context-nudge.mjs", project, { transcript_path: transcript(project, long()) });

    assert.equal(code, 0);
    assert.equal(out, "");
  });

  it("skips when the branch note was written after the session began", () => {
    const project = makeProject({}, { git: true });
    const branch = spawnSync("git", ["branch", "--show-current"], { cwd: project, encoding: "utf8" }).stdout.trim();
    fs.mkdirSync(path.join(project, ".claude", "wip"), { recursive: true });
    fs.writeFileSync(path.join(project, ".claude", "wip", `${branch.replaceAll("/", "-")}.md`), "note");

    assert.equal(prompt(project, transcript(project, long()), sessionId()).out, "");
  });

  describe("usage log", () => {
    const usage = (project) =>
      fs.readFileSync(path.join(project, ".git", "dev-kit-usage"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

    it("logs a nudge once", () => {
      const project = makeProject({}, { git: true });
      const file = transcript(project, long());
      const id = sessionId();

      prompt(project, file, id);
      prompt(project, file, id);

      assert.deepEqual(usage(project).map(({ hook, decision }) => [hook, decision]), [["context-nudge", "nudge"]]);
    });
  });
});

describe("pr-status-guard", () => {
  const indexRow = (n, status) => `| ${n} | [Title](${n}-slug.md) | ${status} | none |`;
  const index = (...rows) => `# Issues\n\n| # | Title | Status | Blocked by |\n|---|---|---|---|\n${rows.join("\n")}\n`;
  const issue = (...tasks) => `# Title\n\n## Tasks\n\n${tasks.join("\n")}\n`;
  const withIssues = (files, project = makeProject({ "package.json": {} })) => {
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(project, name)), { recursive: true });
      fs.writeFileSync(path.join(project, name), content);
    }
    return project;
  };
  const guard = (project, command) => runHook("pr-status-guard.mjs", project, bash(command));
  const create = (body) => `gh pr create --title "T" --body "${body}"`;
  const done = () => ({
    "docs/issues/README.md": index(indexRow(75, "closed")),
    "docs/issues/75-slug.md": issue("- [x] one", "- [x] two"),
  });

  it("allows a PR for an issue that is closed with every task ticked", () => {
    assert.equal(guard(withIssues(done()), create("Closes #75")).code, 0);
  });

  it("allows a PR that names no issue", () => {
    assert.equal(guard(withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) }), create("Just a fix")).code, 0);
  });

  it("allows Refs and Part of for an open issue", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) });
    assert.equal(guard(project, create("Refs #75")).code, 0);
    assert.equal(guard(project, create("Part of #75")).code, 0);
  });

  it("allows any PR when the project has no issues folder", () => {
    assert.equal(guard(makeProject({ "package.json": {} }), create("Closes #75")).code, 0);
  });

  it("ignores commands that are not gh pr create", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) });
    assert.equal(guard(project, "gh pr view 75 --comments Closes #75").code, 0);
    assert.equal(guard(project, 'git commit -m "gh pr create Closes #75"').code, 0);
  });

  it("denies a PR whose issue is still open", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) });
    const result = guard(project, create("Closes #75"));
    assert.equal(result.code, 2);
    assert.match(result.err, /#75's status in docs\/issues\/README\.md is `open`, not `closed`/);
    assert.match(result.err, /Run \/dev-kit:issue finish before opening the PR\.$/);
  });

  it("denies a PR whose issue file has an unticked task", () => {
    const project = withIssues({
      ...done(),
      "docs/issues/75-slug.md": issue("- [x] one", "- [ ] two"),
    });
    const result = guard(project, create("fixes #75"));
    assert.equal(result.code, 2);
    assert.match(result.err, /75-slug\.md has 1 unticked task\(s\)/);
  });

  it("counts only task lines as unticked, not a quoted `- [ ]`", () => {
    const project = withIssues({
      ...done(),
      "docs/issues/75-slug.md": issue("- [x] deny when the file has an unticked `- [ ]` task", "Write `- [ ] task` for a task."),
    });
    assert.equal(guard(project, create("Closes #75")).code, 0);
  });

  it("denies a PR whose issue has no index row", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(12, "closed")) });
    const result = guard(project, create("Resolves #75"));
    assert.equal(result.code, 2);
    assert.match(result.err, /no row for #75 in docs\/issues\/README\.md/);
  });

  it("denies when any one of several closed issues is not done", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "closed"), indexRow(76, "open")) });
    assert.equal(guard(project, create("Closes #75, closes #76")).code, 2);
  });

  it("reads the number from --body-file", () => {
    const project = withIssues({
      "docs/issues/README.md": index(indexRow(75, "open")),
      "body.md": "Closes #75\n",
    });
    assert.equal(guard(project, "gh pr create --title T --body-file body.md").code, 2);
    assert.equal(guard(project, "gh pr create --title T -F body.md").code, 2);
    assert.equal(guard(project, "gh pr create --title T --body-file=body.md").code, 2);
    assert.equal(guard(project, "gh pr create --title T --body-file missing.md").code, 0);
  });

  it("reads the number from the branch commits", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) }, branchWithCommits("feat/x", ["feat(#75): add"]));
    assert.equal(guard(project, "gh pr create --fill").code, 2);
    withIssues(done(), project);
    assert.equal(guard(project, "gh pr create --fill").code, 0);
  });

  it("guards PowerShell calls too", () => {
    const project = withIssues({ "docs/issues/README.md": index(indexRow(75, "open")) });
    const input = { tool_name: "PowerShell", tool_input: { command: 'gh pr create --title T --body @"\nCloses #75\n"@' } };
    assert.equal(runHook("pr-status-guard.mjs", project, input).code, 2);
  });

  describe("usage log", () => {
    const usageEntries = (gitProject) => {
      const file = path.join(gitProject, ".git", "dev-kit-usage");
      return fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
    };
    const gitProject = (status) =>
      withIssues({ "docs/issues/README.md": index(indexRow(75, status)) }, makeProject({ "package.json": {} }, { git: true }));

    it("logs a block when the issue is not closed", () => {
      const project = gitProject("open");

      assert.equal(guard(project, create("Closes #75")).code, 2);

      const entries = usageEntries(project);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].hook, "pr-status-guard");
      assert.equal(entries[0].decision, "block");
    });

    it("logs nothing when the PR passes", () => {
      const project = gitProject("closed");

      assert.equal(guard(project, create("Closes #75")).code, 0);

      assert.deepEqual(usageEntries(project), []);
    });
  });
});

describe("hooks.json", () => {
  const { hooks } = JSON.parse(fs.readFileSync(path.join(hooksDir, "hooks.json"), "utf8"));
  const handlers = (event) => hooks[event].flatMap((group) => group.hooks);
  const script = (handler) => path.basename(handler.args[0]);

  it("runs every hook as node plus a script argument, with no shell", () => {
    for (const handler of Object.keys(hooks).flatMap(handlers)) {
      assert.equal(handler.command, "node");
      assert.equal(handler.args.length, 1);
      assert.match(handler.args[0], /^\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[\w-]+\.mjs$/);
      assert.ok(fs.existsSync(path.join(hooksDir, script(handler))), handler.args[0]);
    }
  });

  it("blocks the tool call when the safety guard itself fails", () => {
    const guard = handlers("PreToolUse").find((handler) => script(handler) === "safety-guard.mjs");

    assert.equal(guard.onFailure, "block");
  });

  it("registers pr-status-guard on PreToolUse for Bash and PowerShell", () => {
    const group = hooks.PreToolUse.find((entry) => entry.hooks.some((handler) => script(handler) === "pr-status-guard.mjs"));

    assert.equal(group?.matcher, "Bash|PowerShell");
  });

  it("runs context-nudge on UserPromptSubmit", () => {
    assert.deepEqual(handlers("UserPromptSubmit").map(script), ["context-nudge.mjs"]);
  });

  it("runs only stop-checks on Stop, so a failing check sends no parallel notification", () => {
    assert.deepEqual(handlers("Stop").map(script), ["stop-checks.mjs"]);
  });
});
