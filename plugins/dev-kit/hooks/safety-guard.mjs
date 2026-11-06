// PreToolUse: turn the written safety rules into real checks.
//  - Secret files (.env*, keys, ~/.ssh, credentials) are never read or edited: blocked.
//  - git writes, gh/glab commands not known to be read-only and destructive
//    commands make Claude Code ask the user first, every time. Set guard.git to
//    "deny" in .claude/kit.json to block them outright, or "off" to turn this
//    check off.
//  - The reviewer agent may run only commands that inspect: anything else is
//    blocked, so it stays read-only whatever its prompt says.
// Exit code 2 blocks the call and sends stderr to Claude. A JSON "ask" decision
// on stdout shows the user a permission prompt.
// This is pattern matching on the command text, a guard against mistakes, not
// a security boundary. It misses a secret read through an interpreter
// (`node -e`, `python -c`), a PowerShell .NET call (`[IO.File]::ReadAllText`),
// a glob (`cat .en*`) or a variable (`f=.env; cat $f`). `permissions.deny`
// rules miss interpreters too; only the Claude Code sandbox stops every
// process (see the README).
import fs from "node:fs";
import path from "node:path";
import { binaryName, commandIndex, commandSegments, loadConfig, projectDir, readStdinJson } from "./lib.mjs";

const SECRET_NAME = [
  /^\.env(\..+)?$/,
  /\.(pem|key|p12|pfx)$/,
  /^id_(rsa|dsa|ecdsa|ed25519)$/,
  /^\.netrc$/,
];
const SECRET_EXAMPLE = /\.(example|sample|template|dist)$/;
const SECRET_DIR = /(^|\/)(\.ssh|\.aws|\.gnupg)(\/|$)/;

function isSecretPath(raw) {
  const normalized = raw.replace(/\\/g, "/").toLowerCase();
  const name = path.posix.basename(normalized);
  if (SECRET_EXAMPLE.test(name)) return false;
  return SECRET_DIR.test(normalized) || SECRET_NAME.some((pattern) => pattern.test(name));
}

// Commands that print, copy or search a file's contents.
const READERS = new Set([
  "cat", "type", "head", "tail", "less", "more", "bat", "nl", "strings", "grep", "rg", "sed", "awk",
  "cp", "copy", "scp", "base64", "xxd", "od", "get-content", "gc", "select-string", "sls", "source", ".",
]);

function readsSecret(command) {
  return commandSegments(command).some((words) => {
    const start = commandIndex(words);
    return READERS.has(binaryName(words[start])) && words.slice(start + 1).some(isSecretPath);
  });
}

const GIT_WRITES = new Set(["commit", "push", "merge", "rebase", "cherry-pick", "am"]);
// Read-only gh and glab commands, as group -> actions (`true`: any action).
// Any other command may write to the remote, so it asks.
const READ_ONLY_FORGE = {
  gh: {
    pr: new Set(["view", "diff", "list", "checks", "status"]),
    issue: new Set(["view", "list", "status"]),
    run: new Set(["view", "list", "watch"]),
    release: new Set(["view", "list"]),
    repo: new Set(["view"]),
    workflow: new Set(["view", "list"]),
    label: new Set(["list"]),
    // Names and dates only: gh never prints a secret's value.
    secret: new Set(["list"]),
    variable: new Set(["list"]),
    auth: new Set(["status"]),
    search: true,
  },
  glab: {
    mr: new Set(["view", "list", "diff"]),
    issue: new Set(["view", "list"]),
    // Not `ci view`: it is interactive and can retry or cancel jobs.
    ci: new Set(["list", "status", "get", "trace"]),
    repo: new Set(["view"]),
    release: new Set(["view", "list"]),
    auth: new Set(["status"]),
  },
};
const FIELD_FLAG = /^(-[fF].*|--(raw-)?field(=.*)?)$/;

// `gh api` and `glab api` send GET unless a method is given or fields are
// present. With an explicit GET, fields become query parameters.
function apiRisk(bin, args) {
  if (args.some((arg) => /^--input(=.*)?$/.test(arg))) return `${bin} api --input sends a request body`;
  let method = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-X" || args[i] === "--method") method = args[++i] ?? "";
    else method = args[i].match(/^(?:-X=?|--method=)(.+)$/)?.[1] ?? method;
  }
  method = (method ?? (args.some((arg) => FIELD_FLAG.test(arg)) ? "POST" : "GET")).toUpperCase();
  return method === "GET" ? null : `${bin} api ${method} writes to the remote`;
}

// Why a gh or glab command needs the user's yes, or null when it only reads.
function forgeRisk(bin, args) {
  const [group, action] = args;
  if (group === "api") return apiRisk(bin, args.slice(1));
  if (group === "auth" && args.some((arg) => /^(-t|--show-token)$/.test(arg))) return `${bin} auth --show-token prints the token`;
  const actions = READ_ONLY_FORGE[bin][group];
  if (actions === true || actions?.has(action)) return null;
  return `${[bin, group, action].filter(Boolean).join(" ")} may write to the remote`;
}

// The git subcommand, past `-C <dir>` and `-c <key=value>` options, which
// end up in `options`.
function gitSubcommand(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-C" || args[i] === "-c") i++;
    else if (!args[i].startsWith("-")) return { name: args[i], rest: args.slice(i + 1), options: args.slice(0, i) };
  }
  return { name: "", rest: [], options: args };
}

// `git checkout` options whose value is a branch name, not a path.
const CHECKOUT_BRANCH_OPTIONS = new Set(["-b", "-B", "--orphan"]);
const CHECKOUT_DISCARDS = /^(-f|--force|-p|--patch|--ours|--theirs|--)$/;

// The command text alone can't tell `git checkout src/a.js` from `git checkout
// feat/x`, so an argument is a path when it is `.`, has a glob character or
// names something that exists. That still misses a quoted path (quotes are
// blanked before this runs) and a path under `git -C <dir>` or after `cd`, and
// asks for a branch that shares a file's name.
function checkoutTakesPaths(rest) {
  if (rest.some((arg) => CHECKOUT_DISCARDS.test(arg))) return true;
  return rest
    .filter((arg, i) => !arg.startsWith("-") && !CHECKOUT_BRANCH_OPTIONS.has(rest[i - 1]))
    .some((arg) => arg === "." || /[*?[]/.test(arg) || fs.existsSync(path.resolve(shellDir, arg)));
}

// Why a git command throws away working-tree changes, or null when it only
// moves between branches or touches the index.
function discardRisk(name, rest, force) {
  if (name === "checkout" && rest.includes("-B")) return "git checkout -B resets an existing branch";
  if (name === "checkout" && force) return "git checkout -f throws away uncommitted changes";
  if (name === "checkout" && checkoutTakesPaths(rest)) return "git checkout of paths throws away uncommitted changes";
  if (name === "restore") {
    const staged = rest.some((arg) => arg === "--staged" || arg === "-S");
    const worktree = rest.some((arg) => arg === "--worktree" || arg === "-W");
    if (!staged || worktree) return "git restore throws away uncommitted changes";
  }
  if (name === "switch" && rest.some((arg) => /^(-C|--force-create)$/.test(arg))) return "git switch -C resets an existing branch";
  if (name === "switch" && (force || rest.includes("--discard-changes"))) return "git switch -f throws away uncommitted changes";
  if (name === "rm" && force) return "git rm -f deletes files with uncommitted changes";
  return null;
}

// Remove-Item and its aliases. `-r`, `-rec`, `-Recurse:$true` all mean
// -Recurse; only `-Recurse:$false` turns it off.
const REMOVE_ITEM = new Set(["remove-item", "ri", "del", "erase", "rd", "rmdir"]);
const POWERSHELL_RECURSE = /^-r(e(c(u(r(se?)?)?)?)?)?(:(?!\$false$).*)?$/i;

// Why this segment needs the user's yes, or null when it is routine.
function riskOf(words) {
  const start = commandIndex(words);
  const bin = binaryName(words[start]);
  const args = words.slice(start + 1);

  if (bin === "git") {
    const { name, rest } = gitSubcommand(args);
    const force = rest.some((arg) => /^(-f|--force(-with-lease)?)$/.test(arg));
    if (name === "push" && force) return "force-push rewrites remote history";
    if (name === "reset" && rest.includes("--hard")) return "git reset --hard throws away uncommitted work";
    if (name === "clean") return "git clean deletes untracked files";
    if (name === "branch" && rest.some((arg) => arg === "-D")) return "git branch -D deletes a branch with unmerged work";
    if (name === "stash" && ["drop", "clear"].includes(rest[0])) return "dropping a stash loses its changes";
    if (GIT_WRITES.has(name)) return `git ${name} changes history or shared branches`;
    // `git rm -rf` and `git checkout -fq` put -f in a cluster of short flags.
    const discard = discardRisk(name, rest, force || rest.some((arg) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(arg)));
    if (discard) return discard;
  }

  if (bin === "gh" || bin === "glab") return forgeRisk(bin, args);

  const recursive = args.some((arg) => arg === "--recursive" || /^-[a-z]*r[a-z]*$/i.test(arg));
  if (bin === "rm" && recursive) return "rm -r deletes a directory tree";
  if (REMOVE_ITEM.has(bin) && args.some((arg) => POWERSHELL_RECURSE.test(arg) || arg.toLowerCase() === "/s"))
    return `${bin} -Recurse or /s deletes a directory tree`;

  return null;
}

// Plugin agents are named "<plugin>:<agent>" in hook input.
const REVIEWER = "dev-kit:reviewer";
// `fetch` writes .git, but only to mirror the remote; the reviewer needs it to
// diff against the base branch.
const INSPECTING_GIT = new Set([
  "diff", "status", "log", "show", "merge-base", "fetch", "rev-parse", "ls-files", "ls-tree", "cat-file", "blame", "grep",
]);
// Read-only only as `git stash list`, `git worktree list`.
const LISTING_GIT = new Set(["stash", "worktree"]);
const BRANCH_LISTING = /^(--show-current|--list|-a|--all|-r|--remotes|-vv?)$/;
// Options that run a program or write a file: an external diff or textconv
// driver, `git grep -O<pager>`, `--output=<file>`, `fetch --upload-pack=<cmd>`.
const GIT_RUNS_OR_WRITES = /^(--ext-diff|--textconv|-O.*|--open-files-in-pager.*|--output(=.*)?|--upload-pack.*)$/;
const HARMLESS_COMMANDS = new Set(["cat", "head", "tail", "ls", "wc", "grep", "cut", "tr", "echo", "pwd", "cd"]);
// The only expansion the reviewer may use: a merge-base is a SHA, so it can't
// smuggle in an option the way `$(echo --output=x)` would.
const MERGE_BASE = /\$\(git merge-base((?:\s+[\w./@^~][\w./@^~-]*)+)\s*\)/g;
// Package-manager options that pick the workspace a script runs in.
const WORKSPACE_FLAG = /^(-r|--recursive|--(filter|dir)=.+)$/;
const WORKSPACE_OPTION = new Set(["--filter", "-F", "-C", "--dir"]);
// Redirects that write nothing. Every other `<` or `>` is refused.
const HARMLESS_REDIRECT = /(\d*>&\d|&?\d*>\s*\/dev\/null)(?=[\s;|)]|$)/g;

function gitMayRun(args) {
  const { name, rest, options } = gitSubcommand(args);
  // Only `-C <dir>` and `--no-pager` may come first: `-c`, `--git-dir` and
  // `--exec-path` point git at another config or program.
  for (let i = 0; i < options.length; i++) {
    if (options[i] === "-C") i++;
    else if (options[i] !== "--no-pager") return false;
  }
  if (rest.some((arg) => GIT_RUNS_OR_WRITES.test(arg))) return false;
  if (name === "branch") return rest.every((arg) => BRANCH_LISTING.test(arg));
  // One name reads a symbolic ref; a second one sets it, and -d deletes it.
  if (name === "symbolic-ref")
    return rest.every((arg) => /^(--short|-q|--quiet)$/.test(arg) || !arg.startsWith("-")) && rest.filter((arg) => !arg.startsWith("-")).length <= 1;
  // A refspec such as `+main:main` moves local branches.
  if (name === "fetch") return rest.every((arg) => !/^-|[:+]/.test(arg));
  if (LISTING_GIT.has(name)) return rest[0] === "list";
  return INSPECTING_GIT.has(name);
}

function checkScriptMayRun(args, checkScripts) {
  let i = 0;
  for (; args[i]?.startsWith("-"); i++) {
    if (WORKSPACE_OPTION.has(args[i])) i++;
    else if (!WORKSPACE_FLAG.test(args[i])) return false;
  }
  if (args[i] === "run") i++;
  // No extra arguments: `--fix`, `-o <file>`, `--outDir` and even a file
  // list for tsc make a check write files.
  return checkScripts.includes(args[i]) && i === args.length - 1;
}

function reviewerMayRunSegment(words, config) {
  const start = commandIndex(words);
  // Before the command only a merge-base assignment and rtk may come: a value
  // such as NODE_OPTIONS=... or GIT_EXTERNAL_DIFF=... changes what the
  // command runs, and sudo or exec run anything.
  if (!words.slice(0, start).every((word) => /^\w+=(MERGE_BASE)?$/.test(word) || word === "rtk" || word === "proxy")) return false;
  // `./git` would run a file of that name, maybe one the diff under review adds.
  if (/[\\/]/.test(words[start] ?? "")) return false;
  const bin = binaryName(words[start]);
  const args = words.slice(start + 1);
  if (!bin) return true;
  if (bin === "git") return gitMayRun(args);
  // The guard's read-only list, minus `--web`, which starts a browser.
  if (bin === "gh" || bin === "glab") return !forgeRisk(bin, args) && !args.some((arg) => /^(--web(=.*)?|-\w*w\w*)$/.test(arg));
  // The plugin's own kit-config: through ${CLAUDE_PLUGIN_ROOT} or the absolute
  // path it expands to, never a relative one inside the project.
  if (bin === "node") return args.length === 1 && /^(PLUGIN_ROOT|[A-Za-z]:|\/).*[\\/]hooks[\\/]kit-config\.mjs$/.test(args[0]);
  if (bin === config.packageManager) {
    const checkScripts = ["lint", "typecheck", "test", "formatCheck"].map((key) => config.scripts[key]).filter(Boolean);
    return checkScriptMayRun(args, checkScripts);
  }
  return HARMLESS_COMMANDS.has(bin);
}

function reviewerMayRun(command, config) {
  // The prompt names kit-config through ${CLAUDE_PLUGIN_ROOT}, which the `$`
  // check below would refuse.
  let plain = command.replace(/\$\{?CLAUDE_PLUGIN_ROOT\}?/g, "PLUGIN_ROOT").replace(HARMLESS_REDIRECT, " ");
  plain = plain.replace(MERGE_BASE, "MERGE_BASE");
  const mergeBaseNames = [...plain.matchAll(/\b(\w+)=MERGE_BASE\b/g)].map((match) => match[1]);
  plain = plain.replace(/\$\{?(\w+)\}?/g, (variable, name) => (mergeBaseNames.includes(name) ? "MERGE_BASE" : variable));
  // Syntax commandSegments can't follow is refused, not parsed: any other
  // expansion ($(...), $'...', $var), redirects, heredocs and here-strings,
  // backticks, escapes outside quotes (`\"` would make a quote look like it
  // starts), comments and quotes across lines (`# '` hides the next line).
  if (/[$`]/.test(plain)) return false;
  const quoted = /"(?:\\.|[^"\\])*"|'[^']*'/g;
  if ((plain.match(quoted) ?? []).some((text) => text.includes("\n"))) return false;
  if (/[<>\\]|@"|(^|\s)#/.test(plain.replace(quoted, '""'))) return false;
  // With no expansion left, quoted text is plain text: a `(` or `|` in it
  // must not split the command, and a space must not split the word, or
  // `-f "t=x -X GET"` would look like a GET.
  const unsplittable = plain.replace(quoted, (text) => text.replace(/[(){}|;&\s]/g, "_"));
  return commandSegments(unsplittable).every((words) => reviewerMayRunSegment(words, config));
}

const config = loadConfig();
const input = await readStdinJson();
const toolInput = input?.tool_input ?? {};
const shellTool = input?.tool_name === "Bash" || input?.tool_name === "PowerShell";
// Where relative paths in the command resolve.
const shellDir = input?.cwd ?? projectDir;

const target = shellTool ? null : (toolInput.file_path ?? toolInput.path);
const blockedSecret = shellTool ? readsSecret(toolInput.command ?? "") : target && isSecretPath(target);
if (blockedSecret) {
  console.error(
    "Blocked: this touches a secret file (.env*, key, credential or ~/.ssh). Ask the user for the names of the variables you need, or for a redacted copy, instead of reading the file.",
  );
  process.exit(2);
}

if (shellTool && input?.agent_type === REVIEWER && !reviewerMayRun(toolInput.command ?? "", config)) {
  console.error(
    "Blocked: the reviewer is read-only. It may run git, gh and glab commands that inspect, the project's check scripts, kit-config and plain file readers, without redirects into files. Report the change you wanted to make as a finding instead.",
  );
  process.exit(2);
}

if (!shellTool || config.guard.git === "off") process.exit(0);

const reasons = commandSegments(toolInput.command ?? "", { blankQuotes: true })
  .map(riskOf)
  .filter(Boolean);
if (reasons.length === 0) process.exit(0);

const reason = `${[...new Set(reasons)].join("; ")}. Needs your explicit yes.`;
if (config.guard.git === "deny") {
  console.error(`Blocked: ${reason}`);
  process.exit(2);
}
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  }),
);
