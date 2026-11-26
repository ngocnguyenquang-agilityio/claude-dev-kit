#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests docs/plans

cat > package.json <<'JSON'
{ "name": "text-helpers", "type": "module", "scripts": { "test": "node --test" } }
JSON

cat > src/slugify.js <<'JS'
export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
JS

cat > tests/slugify.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slugify.js";

test("slugifies a title", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});
JS

cat > src/truncate.js <<'JS'
export function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
JS

cat > tests/truncate.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { truncate } from "../src/truncate.js";

test("truncates long text with an ellipsis", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
  assert.equal(truncate("abc", 4), "abc");
});
JS

cat > docs/plans/2026-11-20-text-helpers.md <<'MD'
# Plan: text helpers

## Goal

Add four small string helpers, each in its own module with its own test.

## Steps

- [x] 1. Add slugify
  - **What**: Create `src/slugify.js` exporting `slugify(text)` and `tests/slugify.test.js`.
  - **Done when**: `node --test` passes.
- [x] 2. Add truncate
  - **What**: Create `src/truncate.js` exporting `truncate(text, max)` and `tests/truncate.test.js`.
  - **Done when**: `node --test` passes.
- [ ] 3. Add word count
  - **What**: Create `src/word-count.js` exporting `wordCount(text)`, which returns the number of whitespace-separated words, and `tests/word-count.test.js`.
  - **Done when**: `node --test` passes.
- [ ] 4. Add title case
  - **What**: Create `src/title-case.js` exporting `titleCase(text)`, which upper-cases the first letter of each word, and `tests/title-case.test.js`.
  - **Done when**: `node --test` passes.
MD
