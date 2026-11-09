#!/usr/bin/env bash
set -euo pipefail

# The bug lives in the pricing service, which is not in this repo, so reading
# the code cannot reveal the cause.
cat > package.json <<'EOF'
{
  "name": "checkout",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
EOF

cat > checkout.js <<'EOF'
const PRICING_URL = process.env.PRICING_URL;

export async function fetchOrderTotal(orderId) {
  const response = await fetch(`${PRICING_URL}/orders/${orderId}/total`);
  const body = await response.json();
  return body.total;
}

export function formatTotal(total, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total);
}

export async function renderTotal(element, orderId, currency) {
  const total = await fetchOrderTotal(orderId);
  element.textContent = formatTotal(total, currency);
}
EOF

cat > checkout.test.js <<'EOF'
import test from "node:test";
import assert from "node:assert/strict";
import { formatTotal } from "./checkout.js";

test("formats a total in dollars", () => {
  assert.equal(formatTotal(42.5, "USD"), "$42.50");
});
EOF
