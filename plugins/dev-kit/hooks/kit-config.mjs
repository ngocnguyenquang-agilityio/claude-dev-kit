// Print the resolved dev-kit config for this project as JSON. Skills and
// commands call this instead of guessing the package manager, base branch or
// check commands: `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`.
import { BRANCH_PATTERN, detectBaseBranch, issuesFromCommits, loadConfig, run, scriptCommand } from "./lib.mjs";

const config = loadConfig();
const baseBranch = detectBaseBranch(config);
const branch = run(["git", "branch", "--show-current"]).output;
const [, type, slug] = branch.match(BRANCH_PATTERN) ?? [];
// `issue` is set only when the commits name exactly one; `issues` lists them all.
const issues = issuesFromCommits(baseBranch);

console.log(
  JSON.stringify(
    {
      packageManager: config.packageManager,
      baseBranch,
      issuesDir: config.issuesDir,
      checks: {
        lint: scriptCommand(config, "lint"),
        typecheck: scriptCommand(config, "typecheck"),
        formatCheck: scriptCommand(config, "formatCheck"),
        build: scriptCommand(config, "build"),
        test: scriptCommand(config, "test"),
      },
      branch: {
        name: branch || null,
        type: type ?? null,
        slug: slug ?? null,
        issue: issues.length === 1 ? issues[0] : null,
        issues,
      },
      wipNote: branch ? `.claude/wip/${branch.replaceAll("/", "-")}.md` : null,
    },
    null,
    2,
  ),
);
