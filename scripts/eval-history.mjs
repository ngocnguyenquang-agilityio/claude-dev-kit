#!/usr/bin/env node
// Keeps a history of eval pass rates so a drop between two commits shows up.
//
//   node scripts/eval-history.mjs record <aggregate-result.json> [--commit REF] [--history FILE] [--root DIR]
//   node scripts/eval-history.mjs compare [--base REF] [--history FILE] [--root DIR]
//
// `record` appends one JSON line per case that ran with the kit (arms.with) to
// the history file (default docs/evals/history.jsonl under the root).
// `compare` prints each case's pass rate at the base ref (default main), in the
// newest record, and pooled over all records.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const root = path.resolve(option("--root", path.join(path.dirname(fileURLToPath(import.meta.url)), "..")));
const historyFile = path.resolve(option("--history", path.join(root, "docs", "evals", "history.jsonl")));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  fail(
    "Usage:\n" +
      "  node scripts/eval-history.mjs record <aggregate-result.json> [--commit REF] [--history FILE] [--root DIR]\n" +
      "  node scripts/eval-history.mjs compare [--base REF] [--history FILE] [--root DIR]",
  );
}

function resolveCommit(ref) {
  const git = spawnSync("git", ["-C", root, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { encoding: "utf8" });
  if (git.status !== 0 || !git.stdout.trim()) fail(`Cannot resolve commit "${ref}" in ${root}`);
  return git.stdout.trim();
}

// A run on uncommitted changes is not a run of HEAD: stamped with HEAD, a branch
// result recorded before its first commit would show up as the base's result.
// The history file itself is left out, so several reports can be recorded in a row.
function requireCleanTree() {
  const pathspec = ["--", "."];
  const relative = path.relative(root, historyFile);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) pathspec.push(`:(exclude)${relative.split(path.sep).join("/")}`);
  const git = spawnSync("git", ["-C", root, "status", "--porcelain", ...pathspec], { encoding: "utf8" });
  if (git.status !== 0) fail(`git status failed in ${root}: ${git.stderr.trim()}`);
  if (git.stdout.trim()) fail(`Uncommitted changes in ${root}. Commit the change the eval ran on, then record, or pass --commit REF.`);
}

function record(reportPath) {
  if (!reportPath) usage();
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (error) {
    fail(`Cannot read report ${reportPath}: ${error.message}`);
  }
  if (!report || !Array.isArray(report.cases)) fail(`Report ${reportPath} has no cases`);

  const commitRef = option("--commit");
  if (!commitRef) requireCleanTree();
  const commit = resolveCommit(commitRef ?? "HEAD");
  const date = String(report.startedAt ?? "").slice(0, 10);
  const lines = [];
  for (const entry of report.cases) {
    const runs = entry.arms?.with;
    // A case with no run in the kit arm has no pass rate to track.
    if (!Array.isArray(runs) || runs.length === 0) continue;
    lines.push(
      JSON.stringify({
        date,
        commit,
        case: entry.name,
        runs: runs.length,
        passes: runs.filter((run) => run.passed === true).length,
        judge: report.suite?.judgeModel,
        ablation: report.suite?.ablation,
      }) + "\n",
    );
  }

  fs.mkdirSync(path.dirname(historyFile), { recursive: true });
  fs.appendFileSync(historyFile, lines.join(""));
  console.log(`Recorded ${lines.length} cases to ${historyFile}`);
}

const cell = (passes, runs) => `${passes}/${runs} (${Math.round((passes / runs) * 100)}%)`;

function compare() {
  const base = resolveCommit(option("--base", "main"));
  const records = fs.existsSync(historyFile)
    ? fs
        .readFileSync(historyFile, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            fail(`${historyFile}: entry ${index + 1} is not valid JSON`);
          }
        })
    : [];
  if (records.length === 0) {
    console.log(`No eval history at ${historyFile}`);
    return;
  }

  // One git call per distinct commit: is it the base commit or one of its ancestors?
  const onBase = new Map();
  for (const { commit } of records) {
    if (onBase.has(commit)) continue;
    const git = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor", commit, base]);
    onBase.set(commit, git.status === 0);
  }

  const cases = new Map();
  for (const entry of records) {
    if (!cases.has(entry.case)) cases.set(entry.case, []);
    cases.get(entry.case).push(entry);
  }

  const rows = ["| Case | Base | Newest | All runs |", "| --- | --- | --- | --- |"];
  for (const [name, list] of cases) {
    const atBase = list.findLast((entry) => onBase.get(entry.commit));
    const newest = list[list.length - 1];
    const passes = list.reduce((sum, entry) => sum + entry.passes, 0);
    const runs = list.reduce((sum, entry) => sum + entry.runs, 0);
    rows.push(`| ${name} | ${atBase ? cell(atBase.passes, atBase.runs) : "n/a"} | ${cell(newest.passes, newest.runs)} | ${cell(passes, runs)} |`);
  }
  console.log(rows.join("\n"));
}

// Flags that take a value, so their values are not taken for positionals.
const VALUE_FLAGS = new Set(["--base", "--commit", "--history", "--root"]);
const positional = process.argv.slice(2).filter((arg, i, all) => !arg.startsWith("--") && !VALUE_FLAGS.has(all[i - 1]));
const [command, ...rest] = positional;

if (command === "record") record(rest[0]);
else if (command === "compare") compare();
else usage();
