#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests docs/issues

cat > package.json <<'JSON'
{ "name": "slugs", "private": true, "type": "module", "scripts": { "test": "node --test" } }
JSON

cat > src/slug.js <<'JS'
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
JS

cat > tests/slug.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";

test("slugifies a title", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});
JS

cat > docs/issues/21-slug-limit.md <<'MD'
# Limit slug length

## Goal

Cap the length of slugs produced by `slugify` at 40 characters.

## Tasks

- [x] `src/slug.js`: truncate the slug to 40 characters and drop a trailing `-`
- [x] `tests/slug.test.js`: add a test for a long title

## Acceptance criteria

- `slugify` never returns more than 40 characters
- `npm test` passes

## Out of scope

- Any other change to behavior

## Depends on

none
MD

cat > docs/memory.md <<'MD'
# Memory index

One line per topic file in `docs/memory/`: a link and when to read it.
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add slugify"
git checkout -q -b feat/slug-limit

# Work done but not committed, so the finish step has a diff to review.
cat > src/slug.js <<'JS'
const MAX_LENGTH = 40;

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-$/, "");
}
JS

cat >> tests/slug.test.js <<'JS'

test("caps a long title at 40 characters", () => {
  const slug = slugify("a very long title that keeps going well past the limit");
  assert.ok(slug.length <= 40);
  assert.ok(!slug.endsWith("-"));
});
JS
