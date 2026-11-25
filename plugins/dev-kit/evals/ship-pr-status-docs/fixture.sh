#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests docs/issues

cat > package.json <<'JSON'
{ "name": "slugs", "type": "module", "scripts": { "test": "node --test tests/" } }
JSON

cat > src/slug.js <<'JS'
export function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, "-");
}
JS

cat > tests/slug.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";

test("joins words with a dash", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});
JS

cat > docs/issues/README.md <<'MD'
# Issues

One file per GitHub issue: `<NN>-<slug>.md`. The GitHub issue is the source of truth; these files hold the task checklist that `/dev-kit:issue finish` ticks.

| # | Title | Status | Depends on |
|---|---|---|---|
| 14 | [Strip punctuation in slugs](14-slug-punctuation.md) | open | none |
MD

cat > docs/issues/14-slug-punctuation.md <<'MD'
# Strip punctuation in slugs

## Goal

`slugify` drops punctuation, so "Hello, World!" gives `hello-world`.

## Tasks

- [x] `src/slug.js`: remove punctuation before joining words
- [ ] `tests/slug.test.js`: add a test for punctuation

## Acceptance criteria

- `slugify("Hello, World!")` returns `hello-world`
- `npm test` passes

## Out of scope

- Accented characters

## Depends on

none
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add slug module"

git checkout -q -b feat/slug-punctuation

cat > src/slug.js <<'JS'
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
JS

cat >> tests/slug.test.js <<'JS'

test("drops punctuation", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});
JS

git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "feat(#14): strip punctuation in slugify"
