// Shared helpers for the dev-kit hooks and scripts.
import { spawn, spawnSync } from "node:child_process";
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

// Quoting alone doesn't protect an argument from cmd.exe: it expands %PATH%
// even inside quotes. So every special character gets a caret, quotes too.
const CMD_META = /([()\][%!^"`<>&|;, *?])/g;
const escapeForCmd = (text) => text.replace(CMD_META, "^$1");

// One argument for a .cmd shim: quoted for the program behind it, then
// escaped twice, once for this cmd.exe and once for the shim's `%*`, which
// cmd parses again.
function shimArgument(argument) {
  const quoted = `"${argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1")}"`;
  return escapeForCmd(escapeForCmd(quoted));
}

// Windows runs .cmd shims (pnpm.cmd, npx.cmd) only through cmd.exe, and Node
// refuses to spawn them without a shell. Look the program up on PATH with
// PATHEXT and, for a shim, build the cmd.exe line by hand so no argument is
// read as a command.
function throughCmd(words) {
  if (process.platform !== "win32") return null;
  const extensions = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";");
  const program = (process.env.PATH ?? "")
    .split(path.delimiter)
    // PATH may hold quoted folders and empty entries; cmd accepts both.
    .map((directory) => directory.replace(/^"(.*)"$/, "$1"))
    .filter(Boolean)
    .flatMap((directory) => extensions.map((extension) => path.join(directory, words[0] + extension)))
    .find((candidate) => fs.existsSync(candidate));
  if (!program || !/\.(cmd|bat)$/i.test(program)) return null;
  const line = [escapeForCmd(program), ...words.slice(1).map(shimArgument)].join(" ");
  return [process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `"${line}"`], { windowsVerbatimArguments: true }];
}

// Run a program in the project root. `words` is the program and its
// arguments; no shell reads them, so a file name can't run commands. Colours
// are off so feedback to Claude is plain text. `stdout` is untrimmed, for
// output where leading spaces matter.
export function run(words) {
  const [program, args, options] = throughCmd(words) ?? [words[0], words.slice(1), {}];
  const result = spawnSync(program, args, {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    ...options,
  });
  const output = [result.error?.message, result.stdout, result.stderr].filter(Boolean).join("\n");
  return { ok: result.status === 0, output: output.trim(), stdout: result.stdout ?? "" };
}

// A relative path for a tool's command line. A name starting with "-" (say
// "--config=x.js") would be read as an option; "./" keeps it a file.
export function fileArgument(file) {
  return file.startsWith("-") ? `./${file}` : file;
}

// Keep feedback short: the end of a long log is the useful part.
export function tail(text, max = 4000) {
  return text.length > max ? `...\n${text.slice(-max)}` : text;
}

// The text goes in through env vars, never into the script itself, so quotes
// in a message can't break the command.
const WINDOWS_TOAST = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$text = $xml.GetElementsByTagName('text')
$text.Item(0).AppendChild($xml.CreateTextNode($env:NOTIFY_TITLE)) > $null
$text.Item(1).AppendChild($xml.CreateTextNode($env:NOTIFY_BODY)) > $null
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;

// Show a desktop notification. It never blocks Claude: the notifier runs
// detached. CLAUDE_NOTIFY=0 turns it off; CLAUDE_NOTIFY_LOG=<file> appends
// "title|body" to that file instead, so tests can see what would be shown.
export function sendNotification(body, title = `Claude Code: ${path.basename(projectDir)}`) {
  if (process.env.CLAUDE_NOTIFY === "0") return;
  if (process.env.CLAUDE_NOTIFY_LOG) {
    fs.appendFileSync(process.env.CLAUDE_NOTIFY_LOG, `${title}|${body}\n`);
    return;
  }

  const notifiers = {
    win32: ["powershell", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_TOAST]],
    darwin: [
      "osascript",
      ["-e", "display notification (system attribute \"NOTIFY_BODY\") with title (system attribute \"NOTIFY_TITLE\")"],
    ],
    // "--": a message starting with "-" is text, not an option.
    linux: ["notify-send", ["--", title, body]],
  };

  // No notifier for this platform, or it isn't installed: stay silent. Claude
  // Code captures hook output, so a terminal bell wouldn't be heard either.
  const notifier = notifiers[process.platform];
  if (!notifier) return;
  try {
    const child = spawn(notifier[0], notifier[1], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, NOTIFY_TITLE: title, NOTIFY_BODY: body },
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Never let a missing notifier fail the hook.
  }
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
const EXEC = { pnpm: ["pnpm", "exec"], npm: ["npx", "--no-install"], yarn: ["yarn"], bun: ["bunx"] };

// The first script name found in package.json wins.
const SCRIPT_NAMES = {
  lint: ["lint"],
  typecheck: ["typecheck", "type-check", "check-types"],
  test: ["test"],
  build: ["build"],
  formatCheck: ["format:check", "format-check", "check-format"],
};

// `<type>/<slug>`. The issue number is not in the branch name; it comes from
// the branch's commits (see issuesFromCommits).
export const BRANCH_PATTERN = /^(feat|fix|chore|docs|test|refactor)\/(.+)$/;
const COMMIT_ISSUE = /^(?:feat|fix|chore|docs|test|refactor)\(#(\d+)\):/;

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

// Words that run a package.json script, e.g. ["pnpm", "run", "lint"].
export function scriptWords(config, key) {
  const script = config.scripts[key];
  return script && config.packageManager ? [config.packageManager, "run", script] : null;
}

// Command line for a package.json script, e.g. "pnpm run lint".
export function scriptCommand(config, key) {
  return scriptWords(config, key)?.join(" ") ?? null;
}

// The branch every PR targets: kit.json, else origin's default branch.
export function detectBaseBranch(config) {
  if (config.baseBranch) return config.baseBranch;
  const head = run(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  if (head.ok && head.output.startsWith("origin/")) return head.output.slice("origin/".length);
  for (const candidate of ["main", "master"]) {
    if (run(["git", "rev-parse", "--verify", "--quiet", `origin/${candidate}`]).ok) return candidate;
  }
  return "main";
}

// Issue numbers from this branch's `<type>(#N): ...` commit subjects, oldest
// first, without repeats. More than one means the branch mixes issues.
export function issuesFromCommits(baseBranch) {
  // The name comes from the repo (kit.json or origin/HEAD), and hooks run
  // without asking: a name like "--output=x" must not become a git option.
  if (!/^[\w./-]+$/.test(baseBranch) || baseBranch.startsWith("-")) return [];
  // A repo without a remote still has a local base branch.
  const base = [`origin/${baseBranch}`, baseBranch].find((ref) => run(["git", "rev-parse", "--verify", "--quiet", ref]).ok);
  const mergeBase = base && run(["git", "merge-base", "HEAD", base]);
  if (!mergeBase?.ok) return [];
  const subjects = run(["git", "log", "--reverse", "--format=%s", `${mergeBase.output}..HEAD`]).output.split("\n");
  const numbers = subjects.map((subject) => subject.match(COMMIT_ISSUE)?.[1]).filter(Boolean).map(Number);
  return [...new Set(numbers)];
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
