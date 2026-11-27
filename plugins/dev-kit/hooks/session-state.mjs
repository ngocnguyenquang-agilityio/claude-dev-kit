// SessionEnd and PreCompact: write the mechanical part of the handoff note
// (HEAD, dirty files, commits since the base) to .claude/wip/<branch>.md, so
// the next session always has State. A note written by /dev-kit:handoff keeps
// every line; only one `Auto:` line below its State line is added or replaced.
// Names and subjects only, never file contents or diffs. It prints nothing and
// always exits 0: a session must never be held up by its own bookkeeping.
import fs from "node:fs";
import path from "node:path";
import { AUTO_NEXT, SECRET_CONTENT, baseRef, detectBaseBranch, isHookMade, issuesFromCommits, loadConfig, projectDir, readStdinJson, recordUsage, run, wipNoteName } from "./lib.mjs";

const MAX_LISTED = 10;
const MAX_SUBJECT = 100;
const NOTE_DIRECTORY = ".claude/wip/";

// Text that looks like a token, key or password never reaches the note.
function redact(text) {
  return SECRET_CONTENT.reduce((result, pattern) => result.replace(new RegExp(pattern.source, `${pattern.flags}g`), "<REDACTED>"), text);
}

// At most MAX_LISTED entries, then how many more there were.
function listed(items) {
  const shown = items.slice(0, MAX_LISTED);
  return items.length > MAX_LISTED ? [...shown, `+${items.length - MAX_LISTED} more`] : shown;
}

function dirtyFiles() {
  const entries = run(["git", "status", "--porcelain", "-z", "--untracked-files=all"]).stdout.split("\0");
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    // A rename or copy is followed by an entry holding the original path.
    if (/[RC]/.test(entry.slice(0, 2))) i++;
    // A name with a line break must not add lines to the note.
    const file = entry.slice(3).replace(/[\r\n]/g, " ");
    // The note itself is not work in progress.
    if (!file.startsWith(NOTE_DIRECTORY)) files.push(file);
  }
  return files;
}

function stamp() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function hookMadeNote({ branch, issue, sha, commits, dirty }) {
  const done = [
    ...listed(commits.map((subject) => `commit: ${redact(subject).slice(0, MAX_SUBJECT)}`)),
    ...listed(dirty.map((file) => `uncommitted: ${redact(file)}`)),
  ];
  return [
    `# WIP: ${redact(branch)}${issue ? ` (#${issue})` : ""} - ${stamp()}`,
    "",
    "Before acting: run `git status` and `git log -3` and compare them with State. Where they disagree, trust the repo, not this note.",
    "",
    "## Done",
    "",
    ...(done.length > 0 ? done.map((line) => `- ${line}`) : ["- nothing committed or changed yet"]),
    "",
    "## Next",
    "",
    AUTO_NEXT,
    "",
    "## Open",
    "",
    "- none",
    "",
    "## Decisions",
    "",
    "- none",
    "",
    "## Tried",
    "",
    "- none",
    "",
    "## State",
    "",
    `HEAD ${sha} · ${dirty.length} dirty files · checks: not run · skills to use next: none · auto`,
    "",
  ].join("\n");
}

// Every line stays; the one `Auto:` line goes right after State's HEAD line, or
// at the end when the note has no State heading.
function withAutoLine(text, autoLine) {
  const ending = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\r?\n$/, "").split(/\r?\n/).filter((line) => !line.startsWith("Auto: HEAD "));
  const state = lines.findIndex((line) => /^##\s+State\s*$/.test(line));
  const head = state === -1 ? -1 : lines.findIndex((line, index) => index > state && line.startsWith("HEAD "));
  if (head === -1) lines.push(autoLine);
  else lines.splice(head + 1, 0, autoLine);
  return `${lines.join(ending)}${ending}`;
}

try {
  await readStdinJson();
  const config = loadConfig();
  const branch = run(["git", "branch", "--show-current"]).output;
  const sha = run(["git", "rev-parse", "--short", "HEAD"]);
  if (!branch || !sha.ok) process.exit(0);
  const baseBranch = detectBaseBranch(config);
  if (branch === baseBranch) process.exit(0);

  const base = baseRef(baseBranch);
  const commits = base ? run(["git", "log", "--format=%s", `${base}..HEAD`]).output.split("\n").filter(Boolean) : [];
  const dirty = dirtyFiles();
  const noteFile = path.join(projectDir, wipNoteName(branch));
  const existing = fs.existsSync(noteFile) ? fs.readFileSync(noteFile, "utf8") : null;
  if (commits.length === 0 && dirty.length === 0 && existing === null) process.exit(0);

  const issues = issuesFromCommits(baseBranch);
  let text;
  let keepTime = null;
  if (existing === null || isHookMade(existing)) {
    text = hookMadeNote({ branch, issue: issues.length === 1 ? issues[0] : null, sha: sha.output, commits, dirty });
  } else {
    text = withAutoLine(existing, `Auto: HEAD ${sha.output} · ${dirty.length} dirty files`);
    // The nudge reads a newer modified time as "handoff ran this session".
    keepTime = fs.statSync(noteFile);
  }

  fs.mkdirSync(path.dirname(noteFile), { recursive: true });
  const temporary = `${noteFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, text);
  if (keepTime) fs.utimesSync(temporary, keepTime.atime, keepTime.mtime);
  fs.renameSync(temporary, noteFile);
  recordUsage("session-state", "written");
} catch {
  // Fail open: the note is a convenience.
}
process.exit(0);
