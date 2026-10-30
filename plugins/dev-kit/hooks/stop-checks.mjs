// Stop: when code changed, run the project's typecheck, lint and the tests
// related to the changed files before Claude ends its turn. Failures are sent
// back to Claude (exit 2) so it keeps working on them. Which checks run comes
// from package.json scripts; `stopChecks` in .claude/kit.json picks a subset.
// The "finished" notification is sent here, and only when Claude really stops:
// a separate Stop hook would run in parallel and fire even when a check fails.
// A passing run is remembered, so a tree left dirty across turns is not
// checked again until it changes.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileArgument, loadConfig, projectDir, readStdinJson, run, scriptWords, sendNotification, tail } from "./lib.mjs";

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
const entries = run(["git", "status", "--porcelain", "-z", "--untracked-files=all"]).stdout.split("\0");
const changed = [];
const untrackedCode = [];
let codeChanged = false;
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  if (entry.length < 4) continue;
  const status = entry.slice(0, 2);
  const file = entry.slice(3);
  if (/[RC]/.test(status)) i++;
  if (!CODE.test(file) && !/(^|\/)tsconfig\.json$/.test(file)) continue;
  codeChanged = true;
  if (CODE.test(file) && !status.includes("D")) changed.push(fileArgument(file));
  if (status === "??") untrackedCode.push(file);
}
if (!codeChanged) finish();

function relatedTestsWords() {
  // No exec words: a kit.json packageManager the kit doesn't know.
  if (changed.length === 0 || !config.exec) return null;
  if (config.tools.jest) return [...config.exec, "jest", "--findRelatedTests", ...changed, "--passWithNoTests"];
  if (config.tools.vitest) return [...config.exec, "vitest", "related", "--run", "--passWithNoTests", ...changed];
  return null;
}

const commands = {
  typecheck: scriptWords(config, "typecheck"),
  lint: scriptWords(config, "lint"),
  relatedTests: relatedTestsWords(),
};

const checks = config.stopChecks.map((name) => commands[name]).filter(Boolean);

// What the checks see: their commands, the diff of tracked files and the
// contents of untracked code files. `git diff HEAD` prints nothing before the
// first commit, when every file is untracked anyway.
const hash = crypto.createHash("sha256").update(JSON.stringify(checks)).update(run(["git", "diff", "HEAD", "--binary"]).stdout);
for (const file of untrackedCode) hash.update(`\0${file}\0`).update(fs.readFileSync(path.join(projectDir, file)));
const fingerprint = hash.digest("hex");

// --git-path also resolves inside a worktree, where .git is a file.
const lastPass = path.resolve(projectDir, run(["git", "rev-parse", "--git-path", "dev-kit-stop-checks"]).output);
const lastFingerprint = fs.existsSync(lastPass) ? fs.readFileSync(lastPass, "utf8") : null;
if (fingerprint === lastFingerprint) finish();

for (const words of checks) {
  const result = run(words);
  if (!result.ok) {
    console.error(`${words.join(" ")} failed. Fix it before finishing:\n${tail(result.output)}`);
    process.exit(2);
  }
}
fs.writeFileSync(lastPass, fingerprint);
finish();
