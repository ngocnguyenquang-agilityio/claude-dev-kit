// SessionStart: a plugin cannot ship CLAUDE.md rules, so put the working rules
// and the project context into the session instead. Whatever this prints is
// added to Claude's context. Turn the project context off with `sessionStart.context`
// in .claude/kit.json; the rules always print.
import fs from "node:fs";
import path from "node:path";
import { baseRef, detectBaseBranch, issuesFromCommits, loadConfig, projectDir, run, scriptCommand } from "./lib.mjs";

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

  const noteName = branch && `.claude/wip/${branch.replaceAll("/", "-")}.md`;
  const note = noteName && path.join(projectDir, noteName);
  if (note && fs.existsSync(note)) {
    const base = branch !== baseBranch && baseRef(baseBranch);
    if (base && isMergedInto(base)) {
      lines.push("", `Handoff note ${noteName} is for a branch already merged into ${base}, so it was not loaded. The user can delete it.`);
    } else {
      const text = fs.readFileSync(note, "utf8").trim();
      const warning = staleWarning(noteSha(text));
      lines.push("", "### Handoff note for this branch (from the previous session)", ...(warning ? [`> ${warning}`, ""] : []), text);
    }
  }
  sections.push(lines.join("\n"));
}

// The sha from the note's `HEAD <sha>` State line. Only hex passes: the note is
// a file anyone can edit, and the sha goes to git without asking.
function noteSha(text) {
  return [...text.matchAll(/\bHEAD ([0-9a-f]{7,40})\b/g)].at(-1)?.[1];
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

console.log(sections.join("\n\n"));
