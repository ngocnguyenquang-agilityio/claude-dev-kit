#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "format",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > format.js <<'JS'
function two(n) {
  return String(n).padStart(2, "0");
}

export function formatPrice(cents) {
  return "$" + cents / 100;
}

export function formatDate(date) {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}
JS

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add formatters"

cat > format.js <<'JS'
function padTwoDigits(n) {
  return String(n).padStart(2, "0");
}

export function formatPrice(cents) {
  return "$" + (cents / 100).toFixed(2);
}

export function formatDate(date) {
  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
}
JS

cat > format.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "./format.js";

test("shows two decimals", () => {
  assert.equal(formatPrice(150), "$1.50");
});

test("shows whole dollars with two decimals", () => {
  assert.equal(formatPrice(200), "$2.00");
});
JS
