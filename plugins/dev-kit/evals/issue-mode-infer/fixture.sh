#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "signup",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > signup.js <<'JS'
export function validateSignup(form) {
  const errors = [];
  if (!form.email.includes("@")) errors.push("email");
  if (form.password.length < 8) errors.push("password");
  return errors;
}
JS

cat > signup.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { validateSignup } from "./signup.js";

test("accepts a valid form", () => {
  assert.deepEqual(validateSignup({ email: "a@b.co", password: "long enough" }), []);
});
JS
