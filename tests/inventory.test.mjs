// Tests for scripts/inventory.mjs. Each test runs the script as a separate
// process against a throwaway repo and a throwaway transcript folder.
// Run with: node --test tests
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "inventory.mjs");
const made = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// A repo with skills alpha and beta, agent helper and two registered hooks.
// `unlisted.mjs` sits in hooks/ but hooks.json does not register it.
function makeRepo(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-repo-"));
  made.push(root);
  const plugin = path.join(root, "plugins", "dev-kit");
  write(path.join(plugin, "skills", "alpha", "SKILL.md"), "---\nname: alpha\n---\n");
  write(path.join(plugin, "skills", "beta", "SKILL.md"), "---\nname: beta\n---\n");
  write(path.join(plugin, "agents", "helper.md"), "---\nname: helper\n---\n");
  write(path.join(plugin, "hooks", "guard.mjs"), "");
  write(path.join(plugin, "hooks", "nudge.mjs"), "");
  write(path.join(plugin, "hooks", "unlisted.mjs"), "");
  write(
    path.join(plugin, "hooks", "hooks.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/guard.mjs"] }] }],
        Stop: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/nudge.mjs"] }] }],
      },
    }),
  );
  write(
    path.join(root, "tests", "hooks.test.mjs"),
    [
      'describe("guard", () => {',
      '  it("one", () => {});',
      '  it("two", () => {});',
      "});",
      'describe("guard on the base branch", () => {',
      '  it("three", () => {});',
      "});",
      "",
    ].join("\n"),
  );
  for (const [relative, content] of Object.entries(extra)) write(path.join(root, relative), content);
  return root;
}

// Claude Code names a project's transcript folder after its path.
function transcriptFolder(projectsDir, root, suffix = "") {
  return path.join(projectsDir, root.replace(/[^a-zA-Z0-9]/g, "-") + suffix);
}

function makeProjectsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-projects-"));
  made.push(dir);
  return dir;
}

function skillCall(name, timestamp = "2026-11-10T10:00:00.000Z") {
  return { type: "assistant", timestamp, message: { content: [{ type: "tool_use", name: "Skill", input: { skill: name } }] } };
}

function agentCall(name, timestamp = "2026-11-10T10:00:00.000Z") {
  return { type: "assistant", timestamp, message: { content: [{ type: "tool_use", name: "Agent", input: { subagent_type: name, prompt: "x" } }] } };
}

function slashCommand(name, timestamp = "2026-11-10T10:00:00.000Z") {
  return { type: "user", timestamp, message: { content: `<command-name>${name}</command-name>\n<command-args></command-args>` } };
}

function writeTranscript(folder, entries, name = "session.jsonl") {
  write(path.join(folder, name), entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
}

function run(root, projectsDir, ...args) {
  const result = spawnSync("node", [script, "--root", root, "--projects-dir", projectsDir, ...args], {
    encoding: "utf8",
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

// The table as { component: { kind, uses, evidence, flags } }.
function rows(out) {
  const table = {};
  for (const line of out.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells[0] === "Component" || /^-+$/.test(cells[0])) continue;
    table[cells[0]] = { kind: cells[1], uses: cells[2], evidence: cells[3], flags: cells[4] };
  }
  return table;
}

after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

describe("inventory: components", () => {
  it("lists every skill, every agent and only the hooks hooks.json registers", () => {
    const root = makeRepo();
    const table = rows(run(root, makeProjectsDir()).out);
    assert.deepEqual(Object.keys(table).sort(), ["alpha", "beta", "guard", "helper", "nudge"]);
    assert.equal(table.alpha.kind, "skill");
    assert.equal(table.helper.kind, "agent");
    assert.equal(table.guard.kind, "hook");
  });
});

describe("inventory: hook detection", () => {
  it("ignores a hook named in a description and one whose script does not exist", () => {
    const root = makeRepo();
    write(
      path.join(root, "plugins", "dev-kit", "hooks", "hooks.json"),
      JSON.stringify({
        description: "see hooks/ghost.mjs",
        hooks: {
          Stop: [
            { hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/guard.mjs"] }] },
            { hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/missing.mjs"] }] },
          ],
        },
      }),
    );
    write(path.join(root, "plugins", "dev-kit", "hooks", "ghost.mjs"), "");
    const table = rows(run(root, makeProjectsDir()).out);
    assert.deepEqual(Object.keys(table).filter((name) => table[name].kind === "hook"), ["guard"]);
  });
});

describe("inventory: use counts", () => {
  it("counts Skill calls, slash commands and Agent calls, with or without the plugin prefix", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    writeTranscript(transcriptFolder(projects, root), [
      skillCall("dev-kit:alpha"),
      skillCall("alpha"),
      slashCommand("/dev-kit:alpha"),
      agentCall("dev-kit:helper"),
      skillCall("claude-api"),
    ]);
    const table = rows(run(root, projects).out);
    assert.equal(table.alpha.uses, "3");
    assert.equal(table.helper.uses, "1");
    assert.equal(table.beta.uses, "0");
    assert.equal(table["claude-api"], undefined);
  });

  it("adds up several sessions and the worktree folders of the same repo, but not another project", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    writeTranscript(transcriptFolder(projects, root), [skillCall("dev-kit:alpha")], "one.jsonl");
    writeTranscript(transcriptFolder(projects, root), [skillCall("dev-kit:alpha")], "two.jsonl");
    writeTranscript(transcriptFolder(projects, root, "--claude-worktrees-x"), [skillCall("dev-kit:alpha")]);
    writeTranscript(transcriptFolder(projects, root, "-other"), [skillCall("dev-kit:alpha")]);
    assert.equal(rows(run(root, projects).out).alpha.uses, "3");
  });

  it("counts only entries on or after --since", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    writeTranscript(transcriptFolder(projects, root), [
      skillCall("dev-kit:alpha", "2026-10-01T00:00:00.000Z"),
      skillCall("dev-kit:alpha", "2026-11-10T00:00:00.000Z"),
      slashCommand("/dev-kit:beta", "2026-09-01T00:00:00.000Z"),
    ]);
    const table = rows(run(root, projects, "--since", "2026-11-01").out);
    assert.equal(table.alpha.uses, "1");
    assert.equal(table.beta.uses, "0");
  });

  it("skips a damaged line and keeps counting", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    const folder = transcriptFolder(projects, root);
    write(path.join(folder, "s.jsonl"), `${JSON.stringify(skillCall("dev-kit:alpha"))}\n{not json\n${JSON.stringify(skillCall("dev-kit:alpha"))}\n`);
    assert.equal(rows(run(root, projects).out).alpha.uses, "2");
  });

  it("leaves out an entry with no timestamp when --since is given, and counts it otherwise", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    const undated = skillCall("dev-kit:alpha");
    delete undated.timestamp;
    writeTranscript(transcriptFolder(projects, root), [undated]);
    assert.equal(rows(run(root, projects).out).alpha.uses, "1");
    assert.equal(rows(run(root, projects, "--since", "2026-01-01").out).alpha.uses, "0");
  });

  it("does not count a slash-command tag that only appears in a reply or a Skill input", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    const quoted = "<command-name>/dev-kit:alpha</command-name>";
    writeTranscript(transcriptFolder(projects, root), [
      { type: "assistant", timestamp: "2026-11-10T10:00:00.000Z", message: { content: [{ type: "text", text: `the tag looks like ${quoted}` }] } },
      slashCommand("/dev-kit:beta"),
    ]);
    const table = rows(run(root, projects).out);
    assert.equal(table.alpha.uses, "0");
    assert.equal(table.beta.uses, "1");
  });

  it("prints no text from a transcript, only names and numbers", () => {
    const root = makeRepo();
    const projects = makeProjectsDir();
    const secret = "ZEBRA-PASSPHRASE-4417";
    writeTranscript(transcriptFolder(projects, root), [
      { type: "user", timestamp: "2026-11-10T10:00:00.000Z", message: { content: `please remember ${secret}` } },
      { type: "assistant", timestamp: "2026-11-10T10:00:01.000Z", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "dev-kit:alpha", args: secret } }] } },
    ]);
    const result = run(root, projects);
    assert.equal(rows(result.out).alpha.uses, "1");
    assert.ok(!result.out.includes(secret) && !result.err.includes(secret));
  });
});

describe("inventory: evals and tests", () => {
  it("counts the eval cases named after a skill and the graders that name an agent", () => {
    const root = makeRepo({
      "plugins/dev-kit/evals/alpha-basic/case.yaml": "name: alpha-basic\n",
      "plugins/dev-kit/evals/alpha-edge/case.yaml": "name: alpha-edge\n",
      "plugins/dev-kit/evals/beta-basic/case.yaml": "name: beta-basic\n",
      "plugins/dev-kit/evals/other-case/graders/spawned.md": "tool: Agent\ninput_match: 'helper'\n",
    });
    const table = rows(run(root, makeProjectsDir()).out);
    assert.equal(table.alpha.evidence, "2 evals");
    assert.equal(table.beta.evidence, "1 eval");
    assert.equal(table.helper.evidence, "1 eval");
  });

  it("counts the tests in the describe blocks that start with the hook's name", () => {
    const root = makeRepo();
    const table = rows(run(root, makeProjectsDir()).out);
    assert.equal(table.guard.evidence, "3 tests");
    assert.equal(table.nudge.evidence, "0 tests");
  });
});

describe("inventory: flags", () => {
  it("flags a component with no use as unused and one with no eval or test as unproven", () => {
    const root = makeRepo({ "plugins/dev-kit/evals/alpha-basic/case.yaml": "name: alpha-basic\n" });
    const projects = makeProjectsDir();
    writeTranscript(transcriptFolder(projects, root), [skillCall("dev-kit:alpha")]);
    const table = rows(run(root, projects).out);
    assert.equal(table.alpha.flags, "");
    assert.equal(table.beta.flags, "unused, unproven");
    assert.equal(table.helper.flags, "unused, unproven");
    assert.equal(table.guard.flags, "");
    assert.equal(table.nudge.flags, "unproven");
  });

  it("shows 'not counted' for the uses of a hook, never 0", () => {
    const root = makeRepo();
    const table = rows(run(root, makeProjectsDir()).out);
    assert.equal(table.guard.uses, "not counted");
    assert.ok(!table.guard.flags.includes("unused"));
  });
});

describe("inventory: no transcripts", () => {
  it("says so, shows n/a for skill and agent uses, and still prints the eval and test columns", () => {
    const root = makeRepo({ "plugins/dev-kit/evals/alpha-basic/case.yaml": "name: alpha-basic\n" });
    const missing = path.join(os.tmpdir(), "inventory-no-such-folder-" + process.pid);
    const result = run(root, missing);
    assert.equal(result.code, 0);
    assert.match(result.out, /no transcripts/i);
    const table = rows(result.out);
    assert.equal(table.alpha.uses, "n/a");
    assert.equal(table.alpha.evidence, "1 eval");
    assert.ok(!table.alpha.flags.includes("unused"));
    assert.equal(table.guard.evidence, "3 tests");
  });
});
