#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests docs/issues

cat > package.json <<'JSON'
{ "name": "users", "type": "module", "scripts": { "test": "node --test tests/" } }
JSON

cat > src/api.js <<'JS'
const users = { 1: { id: 1, name: "Ada" }, 2: { id: 2, name: "Grace" } };

export function getUser(id) {
  return users[id] ?? null;
}
JS

cat > src/profile.js <<'JS'
import { getUser } from "./api.js";

export function profileLine(id) {
  const user = getUser(id);
  return user ? `#${user.id} ${user.name}` : "unknown user";
}
JS

cat > tests/api.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { getUser } from "../src/api.js";

test("finds a user by id", () => {
  assert.equal(getUser(1).name, "Ada");
});
JS

cat > docs/issues/14-rename-get-user.md <<'MD'
# Rename getUser to fetchUser

## Goal

Rename the function `getUser` to `fetchUser` everywhere it is used.

## Tasks

- [ ] `src/api.js`: rename the definition of `getUser` to `fetchUser`
- [ ] `src/profile.js`: update the import and the call
- [ ] `tests/api.test.js`: update the import and the call

## Acceptance criteria

- No reference to `getUser` remains
- `npm test` passes

## Out of scope

- Any other change to behavior

## Depends on

none
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add users module"

git checkout -q -b refactor/rename-get-user
