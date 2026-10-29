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

  it("reads the issue number from a <type>/<N>-<slug> branch", () => {
    const project = makeProject({ "package.json": {} }, { git: true });
    spawnSync("git", ["checkout", "-q", "-b", "fix/7-login-crash"], { cwd: project });

    const { branch, wipNote } = JSON.parse(runHook("kit-config.mjs", project).out);

    assert.deepEqual(branch, { name: "fix/7-login-crash", type: "fix", issue: 7, slug: "login-crash" });
    assert.equal(wipNote, ".claude/wip/fix-7-login-crash.md");
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
    assert.deepEqual(runHook("notify.mjs", makeProject(), { hook_event_name: "Stop" }), { code: 0, out: "", err: "" });
  });

  it("exits quietly on a Stop re-run", () => {
    assert.equal(runHook("notify.mjs", makeProject(), { stop_hook_active: true }, { CLAUDE_NOTIFY: "1" }).code, 0);
  });
});
