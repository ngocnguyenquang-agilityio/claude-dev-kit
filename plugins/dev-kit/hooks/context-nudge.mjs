// UserPromptSubmit: when the session's context passes `contextWarnTokens`,
// tell the user once to run /dev-kit:handoff and continue in a fresh session.
// Only a message: it never blocks a prompt and never runs handoff. Any problem
// (no transcript, renamed usage fields) prints nothing and exits 0.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, projectDir, readStdinJson, recordUsage, run } from "./lib.mjs";

// Context size is everything the last reply read: fresh input plus the cache.
// Looked for from the end of the transcript, which is one JSON object per line.
function lastContextTokens(lines) {
  for (let index = lines.length - 1; index >= 0; index--) {
    try {
      const usage = JSON.parse(lines[index])?.message?.usage;
      if (!usage) continue;
      const total = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"].reduce(
        (sum, key) => sum + (Number.isFinite(usage[key]) ? usage[key] : 0),
        0,
      );
      if (total > 0) return total;
    } catch {
      // A line that is not JSON is skipped.
    }
  }
  return null;
}

function firstTimestamp(lines) {
  for (const line of lines) {
    try {
      const time = Date.parse(JSON.parse(line)?.timestamp);
      if (Number.isFinite(time)) return time;
    } catch {
      // Skipped.
    }
  }
  return null;
}

try {
  const input = await readStdinJson();
  // Without a session id there is no way to nudge once per session.
  if (typeof input.session_id !== "string" || !input.session_id) process.exit(0);
  const config = loadConfig();
  const lines = fs.readFileSync(input.transcript_path, "utf8").split("\n").filter(Boolean);
  const tokens = lastContextTokens(lines);
  if (tokens === null || tokens < config.contextWarnTokens) process.exit(0);

  const branch = run(["git", "branch", "--show-current"]).output;
  const note = branch && `.claude/wip/${branch.replaceAll("/", "-")}.md`;
  // A note written during this session already holds what the next one needs.
  const started = firstTimestamp(lines);
  if (note && started !== null && fs.existsSync(path.join(projectDir, note))) {
    if (fs.statSync(path.join(projectDir, note)).mtimeMs > started) process.exit(0);
  }

  // Once per session: the marker is a file named after the session.
  const marker = path.join(os.tmpdir(), `dev-kit-nudge-${String(input.session_id).replace(/[^\w-]/g, "_")}`);
  if (fs.existsSync(marker)) process.exit(0);
  fs.writeFileSync(marker, "");

  const where = note ? ` The note goes to ${note}.` : "";
  const message = `dev-kit: this session holds about ${Math.round(tokens / 1000)}k tokens of context. Run /dev-kit:handoff, then continue in a fresh session.${where}`;
  recordUsage("context-nudge", "nudge");
  console.log(JSON.stringify({ systemMessage: message }));
} catch {
  // Fail open: a nudge is never worth breaking a prompt.
}
