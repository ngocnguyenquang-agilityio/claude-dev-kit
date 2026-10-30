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
    env: { ...process.env, CLAUDE_PROJECT_DIR: project, CLAUDE_NOTIFY: "0", ...env },
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
});

describe("safety-guard", () => {
  const project = pnpmProject();

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
    "rm -rf dist",
    "Remove-Item -Recurse -Force build",
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
    "rm file.txt",
    "echo \"git commit is blocked\"",
    "pnpm test",
  ]) {
    it(`lets "${command}" through silently`, () => {
      assert.deepEqual(runHook("safety-guard.mjs", project, bash(command)), { code: 0, out: "", err: "" });
    });
  }

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

  for (const command of ["cat .env", "type \".env.local\"", "grep TOKEN .env", "Get-Content .env", "head -5 ~/.ssh/id_rsa", "cp .env /tmp/x"]) {
    it(`blocks "${command}"`, () => {
      assert.equal(runHook("safety-guard.mjs", project, bash(command)).code, 2);
    });
  }

  it("allows cat of .env.example", () => {
    assert.equal(runHook("safety-guard.mjs", project, bash("cat .env.example")).code, 0);
  });

  it("blocks instead of asking when guard.git is deny", () => {
    const strict = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "deny" } } });

    assert.equal(runHook("safety-guard.mjs", strict, bash("git push")).code, 2);
  });

  it("stops asking when guard.git is off, but still blocks secrets", () => {
    const relaxed = makeProject({ "package.json": {}, ".claude/kit.json": { guard: { git: "off" } } });

    assert.equal(runHook("safety-guard.mjs", relaxed, bash("git push")).out, "");
    assert.equal(runHook("safety-guard.mjs", relaxed, bash("cat .env")).code, 2);
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

  it("includes this branch's handoff note", () => {
    const project = makeProject(
      { "package.json": {}, ".claude/wip/feat-3-search.md": "# WIP: feat/3-search\n\n## Next\n\n- wire the filter" },
      { git: true },
    );
    spawnSync("git", ["checkout", "-q", "-b", "feat/3-search"], { cwd: project });

    assert.match(runHook("session-start.mjs", project).out, /wire the filter/);
  });

  it("names the branch's issue from its commits", () => {
    const project = branchWithCommits("fix/login-crash", ["fix(#7): guard the null user"]);

    assert.match(runHook("session-start.mjs", project).out, /Branch: fix\/login-crash \(issue #7\)/);
  });

  it("flags a branch whose commits name more than one issue", () => {
    const project = branchWithCommits("feat/search", ["feat(#5): add search", "fix(#3): typo"]);

    assert.match(runHook("session-start.mjs", project).out, /\(issues #5, #3: conflict\)/);
  });

  it("leaves the rules out when sessionStart.rules is false", () => {
    const project = makeProject(
      { "package.json": {}, ".claude/kit.json": { sessionStart: { rules: false } } },
      { git: true },
    );

    const { out } = runHook("session-start.mjs", project);

    assert.doesNotMatch(out, /working rules/);
    assert.match(out, /project context/);
  });

  it("prints nothing when both parts are off", () => {
    const project = makeProject({ "package.json": {}, ".claude/kit.json": { sessionStart: { rules: false, context: false } } });

    assert.equal(runHook("session-start.mjs", project).out, "");
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

  it("sends nothing when CLAUDE_NOTIFY=0", () => {
    const result = runHookWithNotifications("stop-checks.mjs", withScripts({ typecheck: passing }), {}, { CLAUDE_NOTIFY: "0" });

    assert.deepEqual(result.notifications, []);
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
});

describe("hooks.json", () => {
  const { hooks } = JSON.parse(fs.readFileSync(path.join(hooksDir, "hooks.json"), "utf8"));
  const handlers = (event) => hooks[event].flatMap((group) => group.hooks);

  it("blocks the tool call when the safety guard itself fails", () => {
    const guard = handlers("PreToolUse").find((handler) => handler.command.includes("safety-guard.mjs"));

    assert.equal(guard.onFailure, "block");
  });

  it("runs only stop-checks on Stop, so a failing check sends no parallel notification", () => {
    assert.deepEqual(
      handlers("Stop").map((handler) => path.basename(handler.command.replace(/"/g, ""))),
      ["stop-checks.mjs"],
    );
  });
});
