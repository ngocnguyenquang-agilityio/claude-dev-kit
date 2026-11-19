#!/usr/bin/env node
// Inventory for the review cadence in docs/vision.md: how often each dev-kit
// component was used, and which have an eval or a test. Run before a minor
// release to see what is unused or unproven.
//
//   node scripts/inventory.mjs [--since YYYY-MM-DD] [--root DIR] [--projects-dir DIR]
//
// Use comes from this repo's Claude Code transcripts and only names and counts
// are read from them: no prompt, reply or path is ever printed. A hook leaves
// no tool call, so its use is "not counted".
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_PREFIX = "dev-kit:";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const root = path.resolve(option("--root", path.join(path.dirname(fileURLToPath(import.meta.url)), "..")));
const projectsDir = option("--projects-dir", path.join(os.homedir(), ".claude", "projects"));
const since = option("--since", null);
const pluginDir = path.join(root, "plugins", "dev-kit");

function listDirectory(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

// Only the `command` and `args` values of hooks.json count, and the script must
// exist: a mention in a description or a stale entry is not a hook.
function registeredHooks() {
  let config;
  try {
    config = JSON.parse(readText(path.join(pluginDir, "hooks", "hooks.json")));
  } catch {
    return [];
  }
  const registered = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key !== "command" && key !== "args") {
        visit(value);
        continue;
      }
      for (const text of [value].flat()) {
        const script = typeof text === "string" ? text.match(/hooks\/([\w.-]+)\.mjs/) : null;
        if (script && fs.existsSync(path.join(pluginDir, "hooks", `${script[1]}.mjs`))) registered.add(script[1]);
      }
    }
  };
  visit(config);
  return [...registered];
}

function findComponents() {
  const skills = listDirectory(path.join(pluginDir, "skills"))
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(pluginDir, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name);
  const agents = listDirectory(path.join(pluginDir, "agents"))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -3));
  return { skills: skills.sort(), agents: agents.sort(), hooks: registeredHooks().sort() };
}

// Claude Code names a project's transcript folder after its path; a worktree of
// the repo adds `--<something>` to that name.
function transcriptFiles() {
  const encoded = root.replace(/[^a-zA-Z0-9]/g, "-");
  const files = [];
  for (const entry of listDirectory(projectsDir)) {
    if (!entry.isDirectory()) continue;
    if (entry.name !== encoded && !entry.name.startsWith(`${encoded}--`)) continue;
    const folder = path.join(projectsDir, entry.name);
    for (const file of listDirectory(folder)) {
      if (file.isFile() && file.name.endsWith(".jsonl")) files.push(path.join(folder, file.name));
    }
  }
  return files;
}

function knownName(raw, names) {
  const name = String(raw ?? "").replace(/^\//, "");
  const bare = name.startsWith(PLUGIN_PREFIX) ? name.slice(PLUGIN_PREFIX.length) : name;
  return names.includes(bare) && (bare === name || name.startsWith(PLUGIN_PREFIX)) ? bare : null;
}

function countUses(files, skills, agents) {
  const uses = new Map([...skills, ...agents].map((name) => [name, 0]));
  const add = (name) => uses.set(name, uses.get(name) + 1);
  for (const file of files) {
    for (const line of readText(file).split("\n")) {
      if (!line) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (since && !(typeof entry.timestamp === "string" && entry.timestamp >= since)) continue;
      const content = entry.message?.content;
      const blocks = Array.isArray(content) ? content : [{ type: "text", text: content }];
      for (const block of blocks) {
        if (block?.type === "tool_use" && block.name === "Skill") {
          const name = knownName(block.input?.skill, skills);
          if (name) add(name);
        } else if (block?.type === "tool_use" && (block.name === "Agent" || block.name === "Task")) {
          const name = knownName(block.input?.subagent_type, agents);
          if (name) add(name);
        } else if (entry.type === "user" && block?.type === "text" && typeof block.text === "string") {
          const command = block.text.match(/<command-name>([^<]*)<\/command-name>/);
          const name = command && knownName(command[1], skills);
          if (name) add(name);
        }
      }
    }
  }
  return uses;
}

function evalCases() {
  const evalsDir = path.join(pluginDir, "evals");
  return listDirectory(evalsDir)
    .filter((entry) => entry.isDirectory() && entry.name !== "results")
    .map((entry) => {
      const graders = listDirectory(path.join(evalsDir, entry.name, "graders"))
        .filter((grader) => grader.isFile())
        .map((grader) => readText(path.join(evalsDir, entry.name, "graders", grader.name)))
        .join("\n");
      return { name: entry.name, graders };
    });
}

// Tests per hook: the `it(` lines inside the describe blocks named after it.
function hookTestCounts(hooks) {
  const counts = new Map(hooks.map((hook) => [hook, 0]));
  let current = null;
  for (const line of readText(path.join(root, "tests", "hooks.test.mjs")).split("\n")) {
    const block = line.match(/^describe\(\s*["'`]([^"'`]+)["'`]/);
    if (block) {
      current = hooks.find((hook) => block[1] === hook || block[1].startsWith(`${hook} `)) ?? null;
    } else if (current && /^\s+it\(/.test(line)) {
      counts.set(current, counts.get(current) + 1);
    }
  }
  return counts;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const { skills, agents, hooks } = findComponents();
const files = transcriptFiles();
const haveTranscripts = files.length > 0;
const uses = countUses(files, skills, agents);
const cases = evalCases();
const hookTests = hookTestCounts(hooks);

const table = [];
for (const name of skills) {
  const evals = cases.filter((evalCase) => evalCase.name.startsWith(`${name}-`)).length;
  table.push({ name, kind: "skill", uses: uses.get(name), evidence: evals, unit: "eval" });
}
for (const name of agents) {
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  const evals = cases.filter((evalCase) => pattern.test(evalCase.graders)).length;
  table.push({ name, kind: "agent", uses: uses.get(name), evidence: evals, unit: "eval" });
}
for (const name of hooks) {
  table.push({ name, kind: "hook", uses: null, evidence: hookTests.get(name), unit: "test" });
}

console.log(
  haveTranscripts
    ? `Transcripts: ${plural(files.length, "file")}, ${since ? `since ${since}` : "all time"}.`
    : `No transcripts found for this repo under ${projectsDir}; uses are n/a.`,
);
console.log("");
console.log("| Component | Kind | Uses | Evals/tests | Flag |");
console.log("| --- | --- | --- | --- | --- |");
for (const row of table) {
  const usesCell = row.kind === "hook" ? "not counted" : haveTranscripts ? String(row.uses) : "n/a";
  const flags = [];
  if (row.kind !== "hook" && haveTranscripts && row.uses === 0) flags.push("unused");
  if (row.evidence === 0) flags.push("unproven");
  console.log(`| ${row.name} | ${row.kind} | ${usesCell} | ${plural(row.evidence, row.unit)} | ${flags.join(", ")} |`);
}
