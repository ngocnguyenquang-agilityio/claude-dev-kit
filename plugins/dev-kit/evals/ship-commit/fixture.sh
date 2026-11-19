#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "invoices",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > export.js <<'JS'
export function toCsv(rows) {
  return rows.map((r) => r.join(",")).join("\n");
}
JS

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add CSV export"

git checkout -q -b feat/csv-escaping

cat > escape.js <<'JS'
export function escapeCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
JS
git add escape.js
git -c user.name=eval -c user.email=eval@example.com commit -q -m "feat(#12): add escapeCell"

# pending work: toCsv uses escapeCell and the test is written
cat > export.js <<'JS'
import { escapeCell } from "./escape.js";

export function toCsv(rows) {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
}
JS
cat > export.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./export.js";

test("a comma inside a name stays in one column", () => {
  assert.equal(toCsv([["Smith, Jo", "42"]]), '"Smith, Jo",42');
});
JS
