#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'EOF'
{
  "name": "config-loader",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
EOF

cat > config.js <<'EOF'
let settings = null;

export function loadSettings() {
  setTimeout(() => {
    settings = { theme: "dark" };
  }, Math.random() * 20);
}

export function getSettings() {
  return settings;
}
EOF

cat > config.test.js <<'EOF'
import test from "node:test";
import assert from "node:assert/strict";
import { loadSettings, getSettings } from "./config.js";

test("loads the saved settings", async () => {
  loadSettings();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(getSettings(), { theme: "dark" });
});
EOF
