// Shared helpers for the dev-kit hooks and scripts.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// The project Claude is working in, not the plugin folder.
export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// Hooks get their input as JSON on stdin.
export async function readStdinJson() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Run a command in the project root. `shell: true` lets Windows find the
// pnpm.cmd shim. Colours are off so feedback to Claude is plain text.
// `stdout` is untrimmed, for output where leading spaces matter.
export function run(command) {
  const result = spawnSync(command, {
    cwd: projectDir,
    shell: true,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const output = [result.error?.message, result.stdout, result.stderr].filter(Boolean).join("\n");
  return { ok: result.status === 0, output: output.trim(), stdout: result.stdout ?? "" };
}

// Keep feedback short: the end of a long log is the useful part.
export function tail(text, max = 4000) {
  return text.length > max ? `...\n${text.slice(-max)}` : text;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectDir, file), "utf8"));
  } catch {
    return null;
  }
}

const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

// How each package manager runs a locally installed binary.
const EXEC = { pnpm: "pnpm exec", npm: "npx --no-install", yarn: "yarn", bun: "bunx" };

// The first script name found in package.json wins.
const SCRIPT_NAMES = {
  lint: ["lint"],
  typecheck: ["typecheck", "type-check", "check-types"],
  test: ["test"],
  build: ["build"],
  formatCheck: ["format:check", "format-check", "check-format"],
};

export const BRANCH_PATTERN = /^(feat|fix|chore|docs|test|refactor)\/(\d+)-(.+)$/;

// Everything the hooks and skills need to know about the current project.
// Detected from lockfiles and package.json, then overridden by the optional
// `.claude/kit.json`. No git calls here, so cheap hooks stay fast.
export function loadConfig() {
  const packageJson = readJson("package.json");
  const override = readJson(".claude/kit.json") ?? {};
  const dependencies = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

  const detectedManager = LOCKFILES.find(([lockfile]) => fs.existsSync(path.join(projectDir, lockfile)))?.[1];
  const packageManager = override.packageManager ?? detectedManager ?? (packageJson ? "npm" : null);

  const scripts = {};
  for (const [key, names] of Object.entries(SCRIPT_NAMES)) {
    scripts[key] = override.scripts?.[key] ?? names.find((name) => packageJson?.scripts?.[name]) ?? null;
  }

  return {
    hasPackageJson: Boolean(packageJson),
    packageManager,
    exec: packageManager ? EXEC[packageManager] : null,
    // Only enforce a package manager when the project shows which one it uses.
    enforcePackageManager: override.enforcePackageManager ?? Boolean(detectedManager || override.packageManager),
    scripts,
    tools: {
      prettier: "prettier" in dependencies,
      eslint: "eslint" in dependencies,
      jest: "jest" in dependencies,
      vitest: "vitest" in dependencies,
    },
    baseBranch: override.baseBranch ?? null,
    issuesDir: override.issuesDir ?? (fs.existsSync(path.join(projectDir, "docs", "issues")) ? "docs/issues" : null),
    guard: { git: "ask", ...override.guard },
    sessionStart: { rules: true, context: true, ...override.sessionStart },
    stopChecks: override.stopChecks ?? ["typecheck", "lint", "relatedTests"],
  };
}

// Command line for a package.json script, e.g. "pnpm run lint".
export function scriptCommand(config, key) {
  const script = config.scripts[key];
  return script && config.packageManager ? `${config.packageManager} run ${script}` : null;
}

// The branch every PR targets: kit.json, else origin's default branch.
export function detectBaseBranch(config) {
  if (config.baseBranch) return config.baseBranch;
  const head = run("git symbolic-ref --short refs/remotes/origin/HEAD");
  if (head.ok && head.output.startsWith("origin/")) return head.output.slice("origin/".length);
  for (const candidate of ["main", "master"]) {
    if (run(`git rev-parse --verify --quiet origin/${candidate}`).ok) return candidate;
  }
  return "main";
}

// Shell commands inside a Bash/PowerShell call, as arrays of words. Heredoc
// bodies and here-strings are text, not commands. With `blankQuotes`, quoted
// strings are blanked too (a commit message that mentions npm is not npm);
// without it, quotes are only removed so quoted paths stay visible.
export function commandSegments(command, { blankQuotes = false } = {}) {
  const text = command
    .replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(?=\n|$)/g, "")
    .replace(/@(['"])[\s\S]*?\1@/g, "")
    .replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, (quoted) => (blankQuotes ? '""' : quoted.slice(1, -1)));
  return text
    .split(/&&|\|\||[;|&\n(){}]/)
    .map((segment) => segment.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length > 0);
}

// Prefixes that run the next word as the real command.
const WRAPPERS = new Set(["rtk", "proxy", "sudo", "env", "time", "exec", "command", "nohup"]);

// Index of the real command in a segment, past env assignments, wrapper flags
// and wrappers (rtk, sudo, ...).
export function commandIndex(words) {
  let index = 0;
  while (index < words.length && (/^\w+=/.test(words[index]) || WRAPPERS.has(words[index]) || /^-/.test(words[index])))
    index++;
  return index;
}

// "C:\tools\git.exe" -> "git"
export function binaryName(word) {
  return word && path.basename(word.replace(/\\/g, "/")).replace(/\.(cmd|exe|ps1)$/i, "").toLowerCase();
}
