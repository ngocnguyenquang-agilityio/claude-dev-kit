// SessionStart: a plugin cannot ship CLAUDE.md rules, so put the working rules
// and the project context into the session instead. Whatever this prints is
// added to Claude's context. Turn the project context off with `sessionStart.context`
// in .claude/kit.json; the rules and the memory index always print.
import fs from "node:fs";
import path from "node:path";
import { baseRef, detectBaseBranch, isHookMade, issuesFromCommits, loadConfig, projectDir, recordUsage, run, scriptCommand, wipNoteName } from "./lib.mjs";

const config = loadConfig();
const sections = [fs.readFileSync(new URL("../rules/working-rules.md", import.meta.url), "utf8").trim()];

if (config.sessionStart.context) {
  const branch = run(["git", "branch", "--show-current"]).output;
  const baseBranch = detectBaseBranch(config);
  const issues = issuesFromCommits(baseBranch).map((number) => `#${number}`);
  const issueNote =
    issues.length === 1 ? ` (issue ${issues[0]})` : issues.length > 1 ? ` (issues ${issues.join(", ")}: conflict)` : "";
  const checks = ["lint", "typecheck", "formatCheck", "build", "test"]
    .map((key) => scriptCommand(config, key))
    .filter(Boolean);

  const lines = [
    "## dev-kit project context",
    `- Branch: ${branch || "(detached)"}${issueNote}; PRs target ${baseBranch}`,
    `- Package manager: ${config.packageManager ?? "none detected"}`,
    `- Checks to run before saying work is done: ${checks.length ? checks.join(", ") : "none found in package.json"}`,
  ];
  if (config.issuesDir) lines.push(`- Issue specs: ${config.issuesDir}/`);
  lines.push(...planLines(branch, baseBranch));

  const noteName = branch && wipNoteName(branch);
  const note = noteName && path.join(projectDir, noteName);
  if (note && fs.existsSync(note)) {
    const base = branch !== baseBranch && baseRef(baseBranch);
    if (base && isMergedInto(base)) {
      lines.push("", `Handoff note ${noteName} is for a branch already merged into ${base}, so it was not loaded. The user can delete it.`);
    } else {
      const text = fs.readFileSync(note, "utf8").trim();
      const warning = staleWarning(noteSha(text));
      lines.push("", "### Handoff note for this branch (from the previous session)", ...(warning ? [`> ${warning}`, ""] : []), text);
      if (isHookMade(text)) {
        lines.push("", "> This note holds only an automatic State (written by a hook). Run /dev-kit:handoff for a full note.");
      }
    }
  }
  sections.push(lines.join("\n"));
}

// Claude Code cuts hook output at 10000 characters and Claude does not read the
// rest. The index goes last, so a cut loses the end of the index rather than
// the handoff note, and the prune line comes well before that.
const MEMORY_INDEX = "docs/memory.md";
const MEMORY_WARN_CHARACTERS = 6000;
// A rotted store must not push the index itself past the 10000-character cut.
const MEMORY_STALE_SHOWN = 10;
const memoryPath = path.join(projectDir, MEMORY_INDEX);
const index = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf8").trim() : "";
if (index) {
  const warning =
    index.length > MEMORY_WARN_CHARACTERS
      ? [`> The memory index is ${index.length} characters; merge or prune topics to keep it under ${MEMORY_WARN_CHARACTERS} (output past 10000 is cut).`, ""]
      : [];
  const stale = staleMemory(index);
  if (stale.length) {
    const more = stale.length > MEMORY_STALE_SHOWN ? ` (and ${stale.length - MEMORY_STALE_SHOWN} more)` : "";
    warning.push(`> Stale memory: ${stale.slice(0, MEMORY_STALE_SHOWN).join("; ")}${more}. Fix or drop these before trusting the entries.`, "");
  }
  sections.push([`## Project memory (${MEMORY_INDEX})`, ...warning, index].join("\n"));
}

// Memory rots when files move. Name index links whose topic file is gone and
// backticked paths in the topic files that no longer exist in the project.
function staleMemory(indexText) {
  const stale = [];
  const skip = /[\s*<>]|^[~/]|^[a-z][a-z0-9+.-]*:/i;
  for (const [, target] of indexText.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const file = target.split("#")[0];
    const topic = path.join(projectDir, "docs", file);
    if (!fs.existsSync(topic)) {
      stale.push(`link \`${target}\` has no file`);
      continue;
    }
    if (!fs.statSync(topic).isFile()) continue;
    const text = fs.readFileSync(topic, "utf8");
    for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
      if (skip.test(token) || !/\/.*\.\w+$/.test(token)) continue;
      if (!fs.existsSync(path.join(projectDir, token))) stale.push(`\`${token}\` in ${file} does not exist`);
    }
  }
  return [...new Set(stale)];
}

// The sha from the note's `HEAD <sha>` State line, never from an `Auto:` line.
// Only hex passes: the note is a file anyone can edit, and the sha goes to git
// without asking.
function noteSha(text) {
  return [...text.matchAll(/^HEAD ([0-9a-f]{7,40})\b/gm)].at(-1)?.[1];
}

function staleWarning(sha) {
  const check = "Check it against the repo before acting on it.";
  if (!sha || !run(["git", "merge-base", "--is-ancestor", sha, "HEAD"]).ok) {
    return `This note's HEAD sha is missing or not in this branch's history (rebased, amended or reset?). ${check}`;
  }
  const count = Number(run(["git", "rev-list", "--count", `${sha}..HEAD`]).stdout.trim());
  return count ? `Note written at \`${sha}\`; ${count} commit${count === 1 ? "" : "s"} since. ${check}` : null;
}

// Merged with a merge commit, the branch tip sits off the base's first-parent
// line; a new branch with no commits of its own sits on it. Squash and
// fast-forward merges are not detected, so those notes still load.
function isMergedInto(base) {
  if (!run(["git", "merge-base", "--is-ancestor", "HEAD", base]).ok) return false;
  const head = run(["git", "rev-parse", "HEAD"]).stdout.trim();
  const firstParents = run(["git", "rev-list", "--first-parent", base, "--not", "HEAD^@"]).stdout.split("\n");
  return !firstParents.includes(head);
}

// Plans under docs/plans/ changed on this branch (committed since the merge-base,
// modified or untracked) with a ticked and an unticked step are half done. A step
// is a top-level checkbox line; `k` is the first unticked one, where `plan` resumes.
// On the base branch only uncommitted and untracked plans count.
function planLines(branch, baseBranch) {
  const names = ([command, ...rest]) => run(["git", command, "-z", ...rest]).stdout.split("\0").filter((name) => name.endsWith(".md"));
  const changed = new Set([
    ...names(["diff", "--name-only", "HEAD", "--", "docs/plans"]),
    ...names(["ls-files", "--others", "--exclude-standard", "--", "docs/plans"]),
  ]);
  if (branch !== baseBranch) {
    const base = baseRef(baseBranch);
    const mergeBase = base && run(["git", "merge-base", "HEAD", base]);
    if (mergeBase?.ok) {
      if (isMergedInto(base)) return [];
      for (const name of names(["diff", "--name-only", mergeBase.output, "HEAD", "--", "docs/plans"])) changed.add(name);
    }
  }
  const lines = [];
  for (const name of [...changed].sort()) {
    const file = path.join(projectDir, name);
    if (!fs.existsSync(file)) continue;
    const steps = fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.match(/^[-*] \[( |x|X)\]/)?.[1]).filter(Boolean);
    const first = steps.findIndex((mark) => mark === " ");
    if (first !== -1 && steps.some((mark) => mark !== " ")) {
      lines.push(`- Plan in progress: ${name}, step ${first + 1} of ${steps.length}`);
    }
  }
  return lines;
}

recordUsage("session-start", "fired");
console.log(sections.join("\n\n"));
