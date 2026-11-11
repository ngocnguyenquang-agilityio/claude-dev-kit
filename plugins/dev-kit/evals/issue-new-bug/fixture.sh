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
  const lines = [];
  for (let index = 0; index < rows.length - 1; index++) {
    lines.push(rows[index].join(","));
  }
  return lines.join("\n");
}
JS

mkdir -p docs/issues
cat > docs/issues/README.md <<'MD'
# Issues

| # | Title | Status | Depends on |
|---|---|---|---|
| 4 | [Add a date column to the export](04-export-date-column.md) | closed | none |
MD

cat > docs/issues/04-export-date-column.md <<'MD'
# Add a date column to the export

## Goal

Every exported invoice row shows its issue date.

## Tasks

- [x] Add `date` to the row built in `export.js`.

## Acceptance criteria

- The CSV has a `date` column in ISO format.
- `npm test` passes.

## Depends on

none
MD
