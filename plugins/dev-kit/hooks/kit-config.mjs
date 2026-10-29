// Print the resolved dev-kit config for this project as JSON. Skills and
// commands call this instead of guessing the package manager, base branch or
// check commands: `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`.
import { BRANCH_PATTERN, detectBaseBranch, loadConfig, run, scriptCommand } from "./lib.mjs";

const config = loadConfig();
const branch = run("git branch --show-current").output;
const [, type, issue, slug] = branch.match(BRANCH_PATTERN) ?? [];

console.log(
  JSON.stringify(
    {
      packageManager: config.packageManager,
      baseBranch: detectBaseBranch(config),
      issuesDir: config.issuesDir,
      checks: {
        lint: scriptCommand(config, "lint"),
        typecheck: scriptCommand(config, "typecheck"),
        formatCheck: scriptCommand(config, "formatCheck"),
        build: scriptCommand(config, "build"),
        test: scriptCommand(config, "test"),
      },
      branch: { name: branch || null, type: type ?? null, issue: issue ? Number(issue) : null, slug: slug ?? null },
      wipNote: branch ? `.claude/wip/${branch.replaceAll("/", "-")}.md` : null,
    },
    null,
    2,
  ),
);
