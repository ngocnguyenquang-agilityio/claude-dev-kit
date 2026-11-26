// Tests for scripts/eval-history.mjs. Each test runs the script as a separate
// process against a throwaway git repo and a throwaway report.
// Run with: node --test tests/eval-history.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "eval-history.mjs");
const made = [];

function git(root, ...args) {
  return spawnSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { encoding: "utf8" });
}

// A repo with one commit; `second` adds a later one so HEAD differs from the first.
function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eval-history-repo-"));
  made.push(root);
  git(root, "init", "-q");
  git(root, "commit", "-q", "--allow-empty", "-m", "first");
  return root;
}

const run = (passed) => ({ score: passed ? 1 : 0, passed });

const fixtureReport = {
  startedAt: "2026-11-26T07:02:08.063Z",
  suite: { judgeModel: "sonnet", ablation: "none" },
  cases: [
    { name: "two-of-three", arms: { with: [run(true), run(false), run(true)] } },
    { name: "three-of-three", arms: { with: [run(true), run(true), run(true)] } },
    { name: "no-runs", arms: { with: [] } },
  ],
};

// Reports are written outside the repo, as eval results are git-ignored, so the repo stays clean.
function writeReport(report = fixtureReport) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-history-report-"));
  made.push(dir);
  const file = path.join(dir, "aggregate-result.json");
  fs.writeFileSync(file, JSON.stringify(report));
  return file;
}

function record(root, report, ...extra) {
  const history = path.join(root, "docs", "evals", "history.jsonl");
  const result = spawnSync("node", [script, "record", report, "--root", root, "--history", history, ...extra], { encoding: "utf8" });
  return { result, history };
}

const readLines = (file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

describe("eval-history record", () => {
  it("appends one line per case with runs", () => {
    const root = makeRepo();
    const { result, history } = record(root, writeReport());
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Recorded 2 cases to /);
    const head = git(root, "rev-parse", "HEAD").stdout.trim();
    assert.ok(fs.readFileSync(history, "utf8").endsWith("\n"));
    assert.deepEqual(readLines(history), [
      { date: "2026-11-26", commit: head, case: "two-of-three", runs: 3, passes: 2, judge: "sonnet", ablation: "none" },
      { date: "2026-11-26", commit: head, case: "three-of-three", runs: 3, passes: 3, judge: "sonnet", ablation: "none" },
    ]);
  });

  // The history file sits inside the repo here on purpose: the second record must
  // not count it as an uncommitted change.
  it("appends again instead of overwriting", () => {
    const root = makeRepo();
    const report = writeReport();
    const first = record(root, report);
    assert.equal(first.result.status, 0, first.result.stderr);
    const { result, history } = record(root, report);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readLines(history).length, 4);
  });

  it("refuses uncommitted changes unless --commit names the commit", () => {
    const root = makeRepo();
    fs.writeFileSync(path.join(root, "SKILL.md"), "changed\n");
    const report = writeReport();
    const refused = record(root, report);
    assert.equal(refused.result.status, 1);
    assert.match(refused.result.stderr, /Uncommitted changes/);
    assert.equal(fs.existsSync(refused.history), false);
    const head = git(root, "rev-parse", "HEAD").stdout.trim();
    const { result, history } = record(root, report, "--commit", "HEAD");
    assert.equal(result.status, 0, result.stderr);
    for (const line of readLines(history)) assert.equal(line.commit, head);
  });

  it("exits 1 and writes nothing when the report has no cases", () => {
    const root = makeRepo();
    const { result, history } = record(root, writeReport({}));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /has no cases/);
    assert.equal(fs.existsSync(history), false);
  });

  it("stores the full hash of --commit", () => {
    const root = makeRepo();
    const first = git(root, "rev-parse", "HEAD").stdout.trim();
    git(root, "commit", "-q", "--allow-empty", "-m", "second");
    const { result, history } = record(root, writeReport(), "--commit", first.slice(0, 7));
    assert.equal(result.status, 0, result.stderr);
    for (const line of readLines(history)) assert.equal(line.commit, first);
  });

  it("exits 1 and writes nothing when the report is missing", () => {
    const root = makeRepo();
    const { result, history } = record(root, path.join(root, "missing.json"));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot read report/);
    assert.equal(fs.existsSync(history), false);
  });

  it("prints usage and exits 1 for an unknown subcommand", () => {
    const result = spawnSync("node", [script, "nope"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage/);
  });
});

// Two commits A then B; `entries` are [commit, case, passes, runs] history lines.
function makeHistory(entries) {
  const root = makeRepo();
  const a = git(root, "rev-parse", "HEAD").stdout.trim();
  git(root, "commit", "-q", "--allow-empty", "-m", "second");
  const b = git(root, "rev-parse", "HEAD").stdout.trim();
  const history = path.join(root, "history.jsonl");
  const commits = { A: a, B: b };
  fs.writeFileSync(
    history,
    entries.map(([c, name, passes, runs]) => JSON.stringify({ commit: commits[c], case: name, passes, runs })).join("\r\n") + "\r\n\r\n",
  );
  return { root, history, a };
}

function compare(root, history, ...extra) {
  return spawnSync("node", [script, "compare", "--root", root, "--history", history, ...extra], { encoding: "utf8" });
}

describe("eval-history compare", () => {
  it("shows base, newest and pooled rates per case", () => {
    const { root, history, a } = makeHistory([
      ["A", "shared", 2, 3],
      ["B", "shared", 3, 3],
      ["B", "only-b", 1, 2],
    ]);
    const result = compare(root, history, "--base", a);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n"), [
      "| Case | Base | Newest | All runs |",
      "| --- | --- | --- | --- |",
      "| shared | 2/3 (67%) | 3/3 (100%) | 5/6 (83%) |",
      "| only-b | n/a | 1/2 (50%) | 1/2 (50%) |",
    ]);
  });

  it("exits 1 for an unknown base ref", () => {
    const { root, history } = makeHistory([["A", "shared", 1, 1]]);
    const result = compare(root, history, "--base", "nope");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot resolve commit/);
  });

  it("exits 1 naming the entry when a history line is not JSON", () => {
    const { root, history, a } = makeHistory([["A", "shared", 1, 1]]);
    fs.appendFileSync(history, "{broken\n");
    const result = compare(root, history, "--base", a);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /entry 2 is not valid JSON/);
  });

  it("prints the no-history line when the history is missing", () => {
    const { root, history, a } = makeHistory([]);
    fs.rmSync(history);
    const result = compare(root, history, "--base", a);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `No eval history at ${history}`);
  });
});
