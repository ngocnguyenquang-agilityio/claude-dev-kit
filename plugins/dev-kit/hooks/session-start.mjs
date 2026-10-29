// SessionStart: a plugin cannot ship CLAUDE.md rules, so put the working rules
// and the project context into the session instead. Whatever this prints is
// added to Claude's context. Turn parts off with `sessionStart` in .claude/kit.json.
import fs from "node:fs";
import path from "node:path";
import { BRANCH_PATTERN, detectBaseBranch, loadConfig, projectDir, run, scriptCommand } from "./lib.mjs";

const config = loadConfig();
const sections = [];

if (config.sessionStart.rules) {
  const rules = fs.readFileSync(new URL("../rules/working-rules.md", import.meta.url), "utf8").trim();
  sections.push(rules);
}

if (config.sessionStart.context) {
  const branch = run("git branch --show-current").output;
  const issue = branch.match(BRANCH_PATTERN)?.[2];
  const checks = ["lint", "typecheck", "formatCheck", "build", "test"]
    .map((key) => scriptCommand(config, key))
    .filter(Boolean);

  const lines = [
    "## dev-kit project context",
    `- Branch: ${branch || "(detached)"}${issue ? ` (issue #${issue})` : ""}; PRs target ${detectBaseBranch(config)}`,
    `- Package manager: ${config.packageManager ?? "none detected"}`,
    `- Checks to run before saying work is done: ${checks.length ? checks.join(", ") : "none found in package.json"}`,
  ];
  if (config.issuesDir) lines.push(`- Issue specs: ${config.issuesDir}/`);

  const note = branch && path.join(projectDir, ".claude", "wip", `${branch.replaceAll("/", "-")}.md`);
  if (note && fs.existsSync(note)) {
    lines.push("", "### Handoff note for this branch (from the previous session)", fs.readFileSync(note, "utf8").trim());
  }
  sections.push(lines.join("\n"));
}

if (sections.length > 0) console.log(sections.join("\n\n"));
