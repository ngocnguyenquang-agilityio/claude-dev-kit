// PreToolUse (Bash/PowerShell): a `gh pr create` waits until the issue it closes
// is `closed` in the issues index and has no unticked task, so the status docs
// are done by `/dev-kit:issue finish` before the PR exists. Exit code 2 blocks
// the tool call and sends stderr back to Claude. Projects with no issues folder
// are left alone.
import fs from "node:fs";
import path from "node:path";
import {
  binaryName,
  commandIndex,
  commandSegments,
  detectBaseBranch,
  issuesFromCommits,
  loadConfig,
  projectDir,
  readStdinJson,
} from "./lib.mjs";

const input = await readStdinJson();
const command = input?.tool_input?.command ?? "";

const isPrCreate = (words) => {
  const index = commandIndex(words);
  return binaryName(words[index]) === "gh" && words[index + 1] === "pr" && words[index + 2] === "create";
};

if (!commandSegments(command, { blankQuotes: true }).some(isPrCreate)) process.exit(0);

const config = loadConfig();
if (!config.issuesDir) process.exit(0);

// The body is scanned as raw command text: --body's quoting differs between
// Bash, PowerShell and here-strings. A body file adds its contents.
let body = command;
for (const words of commandSegments(command).filter(isPrCreate)) {
  words.forEach((word, i) => {
    const file = /^(?:--body-file|-F)$/.test(word) ? words[i + 1] : word.match(/^--body-file=(.+)$/)?.[1];
    if (!file) return;
    try {
      body += `\n${fs.readFileSync(path.resolve(projectDir, file), "utf8")}`;
    } catch {
      // An unreadable file adds nothing.
    }
  });
}

const closing = [...body.matchAll(/\b(?:closes|fixes|resolves)\s+#(\d+)/gi)].map((match) => Number(match[1]));
let numbers = [...new Set(closing)];
if (numbers.length === 0 && !/\b(?:refs|part of)\s+#\d+/i.test(body)) {
  const fromCommits = issuesFromCommits(detectBaseBranch(config))[0];
  if (fromCommits) numbers = [fromCommits];
}

const issuesDir = path.resolve(projectDir, config.issuesDir);
const indexPath = path.join(issuesDir, "README.md");
const index = `${config.issuesDir}/README.md`;
const finish = "Run /dev-kit:issue finish before opening the PR.";
const deny = (reason) => {
  console.error(`${reason}. ${finish}`);
  process.exit(2);
};

for (const number of numbers) {
  const rows = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8").split("\n") : [];
  const row = rows
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    .find((cells) => cells[0] === String(number));
  if (!row) deny(`no row for #${number} in ${index}`);
  if (row[2] !== "closed") deny(`#${number}'s status in ${index} is \`${row[2] ?? ""}\`, not \`closed\``);

  const prefix = `${String(number).padStart(2, "0")}-`;
  const file = fs.readdirSync(issuesDir).find((name) => name.startsWith(prefix) && name.endsWith(".md"));
  if (!file) continue;
  const unticked = fs.readFileSync(path.join(issuesDir, file), "utf8").split("\n").filter((line) => /^\s*[-*]\s+\[ \]/.test(line)).length;
  if (unticked > 0) deny(`${config.issuesDir}/${file} has ${unticked} unticked task(s)`);
}
