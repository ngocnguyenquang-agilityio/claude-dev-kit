// PostToolUse (Edit/Write): format the edited file with Prettier, and run
// eslint --fix on JS/TS files, when the project has those tools. ESLint errors
// that can't be fixed are sent back to Claude (exit 2).
import path from "node:path";
import { loadConfig, projectDir, readStdinJson, run, tail } from "./lib.mjs";

const config = loadConfig();
const input = await readStdinJson();
const filePath = input?.tool_input?.file_path;
// No exec words: a kit.json packageManager the kit doesn't know.
if (!filePath || !config.hasPackageJson || !config.exec) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath));
// Skip files outside the project (plans, memory, scratchpad).
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);

// Prettier itself skips files in .prettierignore and unknown file types.
if (config.tools.prettier) run([...config.exec, "prettier", "--write", "--ignore-unknown", relative]);

if (config.tools.eslint && /\.(c|m)?[jt]sx?$/.test(relative)) {
  const eslint = run([...config.exec, "eslint", "--fix", "--no-warn-ignored", relative]);
  if (!eslint.ok) {
    console.error(`ESLint errors remain in ${relative}:\n${tail(eslint.output)}`);
    process.exit(2);
  }
}
