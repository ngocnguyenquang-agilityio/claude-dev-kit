#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "checkout",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > total.js <<'JS'
export function orderTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
JS

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add order total"

cat > total.js <<'JS'
export function orderTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal > 100 ? subtotal * 0.9 : subtotal;
}
JS

cat > total.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { orderTotal } from "./total.js";

test("takes 10% off a large order", () => {
  assert.equal(orderTotal([{ price: 150, quantity: 1 }]), 135);
});
JS
