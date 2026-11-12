#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "cart",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > cart.js <<'JS'
export function itemCount(items) {
  return items.length;
}

export function averagePrice(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total / items.length;
}
JS

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add cart helpers"

cat > cart.js <<'JS'
export function itemCount(items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function averagePrice(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total / items.length;
}
JS

cat > cart.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { itemCount } from "./cart.js";

test("counts every unit, not every line", () => {
  assert.equal(itemCount([{ quantity: 2 }, { quantity: 3 }]), 5);
});

test("counts an empty cart as zero", () => {
  assert.equal(itemCount([]), 0);
});
JS
