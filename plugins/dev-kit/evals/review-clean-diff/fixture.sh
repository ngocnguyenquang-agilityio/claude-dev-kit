#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "greeting",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > greeting.js <<'JS'
export function greeting(user) {
  return `Hello, ${user.name}!`;
}
JS

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add greeting"

cat > greeting.js <<'JS'
export function greeting(user) {
  const name = user.name == null ? "Guest" : user.name;
  return `Hello, ${name}!`;
}
JS

cat > greeting.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { greeting } from "./greeting.js";

test("greets a user by name", () => {
  assert.equal(greeting({ name: "Ana" }), "Hello, Ana!");
});

test("greets a user with a null name as Guest", () => {
  assert.equal(greeting({ name: null }), "Hello, Guest!");
});

test("greets a user without a name field as Guest", () => {
  assert.equal(greeting({}), "Hello, Guest!");
});

test("keeps an empty name, which is a valid name here", () => {
  assert.equal(greeting({ name: "" }), "Hello, !");
});
JS
