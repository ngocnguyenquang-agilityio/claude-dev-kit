#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'EOF'
{
  "name": "date-validation",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
EOF

cat > date.js <<'EOF'
export function isValidDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return !Number.isNaN(date.getTime());
}
EOF

cat > date.test.js <<'EOF'
import test from "node:test";
import assert from "node:assert/strict";
import { isValidDate } from "./date.js";

test("accepts a real date", () => {
  assert.equal(isValidDate("2024-02-29"), true);
});

test("rejects a day that does not exist in the month", () => {
  assert.equal(isValidDate("2024-02-30"), false);
});
EOF
