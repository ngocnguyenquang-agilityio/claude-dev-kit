// PreToolUse (Bash/PowerShell): use the project's own package manager, the one
// its lockfile names, and block the others. Exit code 2 blocks the tool call and
// sends stderr back to Claude. Projects with no lockfile are left alone.
import { binaryName, commandIndex, commandSegments, loadConfig, readStdinJson } from "./lib.mjs";

const config = loadConfig();
if (!config.enforcePackageManager || !config.packageManager) process.exit(0);

const MANAGERS = ["npm", "yarn", "pnpm", "bun"];
const RUNNERS = { npx: "npm", pnpx: "pnpm", bunx: "bun" };
const RUNNER_REPLACEMENT = {
  npm: "npx --no-install",
  pnpm: "pnpm dlx (or pnpm exec for local bins)",
  yarn: "yarn dlx (or yarn <bin> for local bins)",
  bun: "bunx",
};

const chosen = config.packageManager;
const input = await readStdinJson();
const command = input?.tool_input?.command ?? "";

for (const words of commandSegments(command, { blankQuotes: true })) {
  const bin = binaryName(words[commandIndex(words)]);
  const blockedManager = MANAGERS.includes(bin) && bin !== chosen;
  const blockedRunner = bin in RUNNERS && RUNNERS[bin] !== chosen;
  if (blockedManager || blockedRunner) {
    const replacement = blockedRunner ? RUNNER_REPLACEMENT[chosen] : chosen;
    console.error(`Blocked "${bin}": this project uses ${chosen} only (its lockfile says so). Use ${replacement} instead.`);
    process.exit(2);
  }
}
