// Stop: when code changed, run the project's typecheck, lint and the tests
// related to the changed files before Claude ends its turn. Failures are sent
// back to Claude (exit 2) so it keeps working on them. Which checks run comes
// from package.json scripts, `checks` in .claude/kit.json, or, with no
// package.json, the project's Node test files; `stopChecks` picks a subset.
// The "finished" notification is sent here, and only when Claude really stops:
// a separate Stop hook would run in parallel and fire even when a check fails.
// A passing run is remembered, so a tree left dirty across turns is not
// checked again until it changes.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileArgument, loadConfig, projectDir, readStdinJson, recordUsage, run, runTimed, scriptWords, sendNotification, tail } from "./lib.mjs";

function finish() {
  sendNotification("Finished. Your turn.");
  process.exit(0);
}

const config = loadConfig();
const input = await readStdinJson();
// Claude is already continuing because of this hook: don't loop forever.
if (input?.stop_hook_active) finish();

const CODE = /\.(c|m)?[jt]sx?$/;
// Files that change what the checks do or how they judge code. Editing one
// runs the checks again, though no code file changed.
const CHECK_CONFIG = /(^|\/)(package\.json|tsconfig\.json|\.eslintrc[^/]*|eslint\.config\.[^/]+)$/;

// -z: NUL-separated and unquoted, so paths with spaces still match. Each entry
// is "XY path"; renames and copies are followed by an extra entry holding the
// original path.
const entries = run(["git", "status", "--porcelain", "-z", "--untracked-files=all"]).stdout.split("\0");
const changed = [];
const untrackedFiles = [];
let codeChanged = false;
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  if (entry.length < 4) continue;
  const status = entry.slice(0, 2);
  const file = entry.slice(3);
  if (/[RC]/.test(status)) i++;
  if (!CODE.test(file) && !CHECK_CONFIG.test(file)) continue;
  codeChanged = true;
  if (CODE.test(file) && !status.includes("D")) changed.push(fileArgument(file));
  if (status === "??") untrackedFiles.push(file);
}
if (!codeChanged) finish();

function relatedTestsWords() {
  // No exec words: a kit.json packageManager the kit doesn't know.
  if (changed.length === 0 || !config.exec) return null;
  if (config.tools.jest) return [...config.exec, "jest", "--findRelatedTests", ...changed, "--passWithNoTests"];
  if (config.tools.vitest) return [...config.exec, "vitest", "related", "--run", "--passWithNoTests", ...changed];
  return null;
}

// A project with no package.json has no scripts to read. If it has Node test
// files, run them all with Node's own runner; `checks` in kit.json replaces this.
function nodeTestWords() {
  if (config.hasPackageJson || Object.keys(config.checks).length > 0) return null;
  const files = run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    .stdout.split("\0")
    // `--cached` still lists a tracked file that was deleted and not yet committed.
    .filter((file) => /\.test\.(c|m)?js$/.test(file) && fs.existsSync(path.join(projectDir, file)));
  return files.length > 0 ? ["node", "--test", ...files.map(fileArgument)] : null;
}

const commands = {
  typecheck: scriptWords(config, "typecheck"),
  lint: scriptWords(config, "lint"),
  relatedTests: relatedTestsWords(),
  nodeTests: nodeTestWords(),
  // Last, so an entry named like a built-in check replaces it.
  ...config.checks,
};

const checks = config.stopChecks.map((name) => commands[name]).filter(Boolean);

// What the checks see: their commands, the diff of tracked files and the
// contents of untracked code files. `git diff HEAD` prints nothing before the
// first commit, when every file is untracked anyway.
const hash = crypto.createHash("sha256").update(JSON.stringify(checks)).update(run(["git", "diff", "HEAD", "--binary"]).stdout);
for (const file of untrackedFiles) hash.update(`\0${file}\0`).update(fs.readFileSync(path.join(projectDir, file)));
const fingerprint = hash.digest("hex");

// --git-path also resolves inside a worktree, where .git is a file.
const lastPass = path.resolve(projectDir, run(["git", "rev-parse", "--git-path", "dev-kit-stop-checks"]).output);
const lastFingerprint = fs.existsSync(lastPass) ? fs.readFileSync(lastPass, "utf8") : null;
if (fingerprint === lastFingerprint) finish();

const deadline = Date.now() + config.stopCheckTimeoutSeconds * 1000;
for (const words of checks) {
  const result = await runTimed(words, Math.max(deadline - Date.now(), 1));
  if (result.timedOut) {
    const partial = result.output ? `\nOutput so far:\n${tail(result.output)}` : "";
    console.error(
      `The ${config.stopCheckTimeoutSeconds} s that all stop checks share ran out while ${words.join(" ")} was running, so it was stopped. ` +
        `Speed it up, or raise stopCheckTimeoutSeconds in .claude/kit.json. The checks did not pass.${partial}`,
    );
    recordUsage("stop-checks", "block");
    process.exit(2);
  }
  if (!result.ok) {
    console.error(`${words.join(" ")} failed. Fix it before finishing:\n${tail(result.output)}`);
    recordUsage("stop-checks", "block");
    process.exit(2);
  }
}
fs.writeFileSync(lastPass, fingerprint);
recordUsage("stop-checks", "fired");
finish();
