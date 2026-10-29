// PreToolUse: turn the written safety rules into real checks.
//  - Secret files (.env*, keys, ~/.ssh, credentials) are never read or edited: blocked.
//  - git writes, gh/glab writes and destructive commands make Claude Code ask the
//    user first, every time. Set guard.git to "deny" in .claude/kit.json to block
//    them outright, or "off" to turn this check off.
// Exit code 2 blocks the call and sends stderr to Claude. A JSON "ask" decision
// on stdout shows the user a permission prompt.
import path from "node:path";
import { binaryName, commandIndex, commandSegments, loadConfig, readStdinJson } from "./lib.mjs";

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
const GH_WRITES = {
  pr: new Set(["create", "merge", "close", "reopen", "comment", "review", "edit", "ready"]),
  issue: new Set(["create", "close", "reopen", "comment", "edit", "delete"]),
  release: new Set(["create", "delete", "edit"]),
};

// The git subcommand, past `-C <dir>` and `-c <key=value>` options.
function gitSubcommand(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-C" || args[i] === "-c") i++;
    else if (!args[i].startsWith("-")) return { name: args[i], rest: args.slice(i + 1) };
  }
  return { name: "", rest: [] };
}

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
  }

  if (bin === "gh" || bin === "glab") {
    const [group, action] = args;
    if (GH_WRITES[group]?.has(action) || (group === "mr" && action !== "view" && action !== "list"))
      return `${bin} ${group} ${action} writes to the remote`;
    const flagIndex = args.findIndex((arg) => arg === "-X" || arg === "--method");
    const method = flagIndex >= 0 ? args[flagIndex + 1] : args.find((arg) => arg.startsWith("--method="))?.slice(9);
    if (group === "api" && method && method.toUpperCase() !== "GET") return `${bin} api ${method} writes to the remote`;
  }

  const recursive = args.some((arg) => arg === "--recursive" || /^-[a-z]*r[a-z]*$/i.test(arg));
  if (bin === "rm" && recursive) return "rm -r deletes a directory tree";
  if (bin === "remove-item" && args.some((arg) => /^-recurse$/i.test(arg))) return "Remove-Item -Recurse deletes a directory tree";
  if (bin === "rmdir" && args.some((arg) => arg.toLowerCase() === "/s")) return "rmdir /s deletes a directory tree";

  return null;
}

const config = loadConfig();
const input = await readStdinJson();
const toolInput = input?.tool_input ?? {};
const shellTool = input?.tool_name === "Bash" || input?.tool_name === "PowerShell";

const target = shellTool ? null : (toolInput.file_path ?? toolInput.path);
const blockedSecret = shellTool ? readsSecret(toolInput.command ?? "") : target && isSecretPath(target);
if (blockedSecret) {
  console.error(
    "Blocked: this touches a secret file (.env*, key, credential or ~/.ssh). Ask the user for the names of the variables you need, or for a redacted copy, instead of reading the file.",
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
