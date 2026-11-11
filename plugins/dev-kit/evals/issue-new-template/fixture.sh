#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "invoice-export",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > export.js <<'JS'
export function toCsv(rows) {
  return rows.map((row) => row.join(",")).join("\n");
}
JS

mkdir -p .github/ISSUE_TEMPLATE
cat > .github/ISSUE_TEMPLATE/bug.md <<'MD'
---
name: Bug report
about: Something does not work as described
labels: ["bug", "needs-triage"]
---

## Summary

## Steps to reproduce

## Expected

## Actual

## Environment
MD
