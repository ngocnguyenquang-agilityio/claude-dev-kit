// Stop: when code changed, run the project's typecheck, lint and the tests
// related to the changed files before Claude ends its turn. Failures are sent
// back to Claude (exit 2) so it keeps working on them. Which checks run comes
// from package.json scripts; `stopChecks` in .claude/kit.json picks a subset.
// The "finished" notification is sent here, and only when Claude really stops:
// a separate Stop hook would run in parallel and fire even when a check fails.
import { loadConfig, readStdinJson, run, scriptCommand, sendNotification, tail } from "./lib.mjs";

function finish() {
  sendNotification("Finished. Your turn.");
  process.exit(0);
}

const config = loadConfig();
const input = await readStdinJson();
// Claude is already continuing because of this hook: don't loop forever.
if (input?.stop_hook_active || !config.hasPackageJson) finish();

const CODE = /\.(c|m)?[jt]sx?$/;

// -z: NUL-separated and unquoted, so paths with spaces still match. Each entry
// is "XY path"; renames and copies are followed by an extra entry holding the
// original path.
const entries = run("git status --porcelain -z --untracked-files=all").stdout.split("\0");
const changed = [];
let codeChanged = false;
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  if (entry.length < 4) continue;
  const status = entry.slice(0, 2);
  const file = entry.slice(3);
  if (/[RC]/.test(status)) i++;
  if (CODE.test(file) || /(^|\/)tsconfig\.json$/.test(file)) codeChanged = true;
  if (CODE.test(file) && !status.includes("D")) changed.push(file);
}
if (!codeChanged) finish();

function relatedTestsCommand() {
  if (changed.length === 0) return null;
  const files = changed.map((file) => JSON.stringify(file)).join(" ");
  if (config.tools.jest) return `${config.exec} jest --findRelatedTests ${files} --passWithNoTests`;
  if (config.tools.vitest) return `${config.exec} vitest related --run --passWithNoTests ${files}`;
  return null;
}

const commands = {
  typecheck: scriptCommand(config, "typecheck"),
  lint: scriptCommand(config, "lint"),
  relatedTests: relatedTestsCommand(),
};

for (const name of config.stopChecks) {
  const command = commands[name];
  if (!command) continue;
  const result = run(command);
  if (!result.ok) {
    console.error(`${command} failed. Fix it before finishing:\n${tail(result.output)}`);
    process.exit(2);
  }
}
finish();
