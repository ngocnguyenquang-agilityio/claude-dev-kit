#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/lib/format src/components src/pages/checkout src/emails src/api scripts tests docs

cat > package.json <<'JSON'
{ "name": "shop", "type": "module", "scripts": { "test": "node --test tests/" } }
JSON

cat > src/lib/money.js <<'JS'
export function formatPrice(amountInCents) {
  return `$${(amountInCents / 100).toFixed(2)}`;
}
JS

cat > src/lib/locale.js <<'JS'
const SYMBOLS = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

export function getCurrencySymbol(code) {
  return SYMBOLS[code] ?? code;
}
JS

cat > src/lib/dates.js <<'JS'
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
JS

cat > src/lib/index.js <<'JS'
export { formatPrice as fmtPrice } from "./money.js";
export { getCurrencySymbol } from "./locale.js";
export { formatDate } from "./dates.js";
JS

cat > src/lib/format/index.js <<'JS'
export { fmtPrice as price, formatDate as date } from "../index.js";
JS

cat > src/lib/formatters.js <<'JS'
import { formatPrice } from "./money.js";
import { formatDate } from "./dates.js";

const formatters = { price: formatPrice, date: formatDate };

export function format(kind, value) {
  return formatters[kind](value);
}
JS

cat > src/components/Cart.js <<'JS'
import { price } from "../lib/format/index.js";

export function renderCart(items) {
  return items.map((item) => `${item.title}: ${price(item.priceInCents)}`).join("\n");
}
JS

cat > src/components/Invoice.js <<'JS'
import { format } from "../lib/formatters.js";

export function renderInvoice(invoice) {
  return `Invoice ${invoice.id}: ${format("price", invoice.totalInCents)} due ${format("date", invoice.dueDate)}`;
}
JS

cat > src/components/Header.js <<'JS'
export function renderHeader(user) {
  return `Welcome, ${user.name}`;
}
JS

cat > src/components/ProductCard.js <<'JS'
export function renderProductCard(product) {
  return `${product.title} (${product.stock} left)`;
}
JS

cat > src/pages/Home.js <<'JS'
import { renderHeader } from "../components/Header.js";

export function renderHome(user) {
  return renderHeader(user);
}
JS

cat > src/pages/checkout/Summary.js <<'JS'
import { formatPrice } from "../../lib/money.js";

export function renderSummary(order) {
  return `Total: ${formatPrice(order.totalInCents)}`;
}
JS

cat > src/pages/checkout/Confirmation.js <<'JS'
export function renderConfirmation(order) {
  return `Order #${order.id} is confirmed.`;
}
JS

cat > src/emails/receipt.js <<'JS'
import { formatPrice } from "../lib/money.js";

export function receiptEmail(order) {
  return `Thank you for your order #${order.id}. You paid ${formatPrice(order.totalInCents)}.`;
}
JS

cat > src/emails/welcome.js <<'JS'
export function welcomeEmail(user) {
  return `Hi ${user.name}, thanks for signing up.`;
}
JS

cat > src/api/orders.js <<'JS'
export async function getOrder(id) {
  const response = await fetch(`/api/orders/${id}`);
  return response.json();
}
JS

cat > src/api/prices.js <<'JS'
export async function getPrices() {
  const response = await fetch("/api/prices");
  return response.json();
}
JS

cat > scripts/export-csv.js <<'JS'
import { formatPrice } from "../src/lib/money.js";

export function toCsvRow(order) {
  return [order.id, formatPrice(order.totalInCents)].join(",");
}
JS

cat > tests/money.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../src/lib/money.js";

test("formats cents as dollars", () => {
  assert.equal(formatPrice(1999), "$19.99");
});
JS

cat > tests/dates.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../src/lib/dates.js";

test("formats a date as ISO", () => {
  assert.equal(formatDate(new Date("2026-01-02T00:00:00Z")), "2026-01-02");
});
JS

cat > docs/api.md <<'MD'
# Shop helpers

## formatPrice(amountInCents)

Returns the price as a string such as `$19.99`. Also exported as `fmtPrice` from `src/lib/index.js`.
MD

cat > docs/setup.md <<'MD'
# Setup

Run `npm test` to run the tests.
MD

# Feature folders: most only format dates, two call the price formatters.
mkdir -p src/features/billing src/features/orders

cat > src/features/billing/statement.js <<'JS'
import { price } from "../../lib/format/index.js";

export function renderStatement(account) {
  return `Balance: ${price(account.balanceInCents)}`;
}
JS

cat > src/features/orders/history.js <<'JS'
import { format } from "../../lib/formatters.js";

export function renderHistory(orders) {
  return orders.map((order) => `#${order.id} ${format("price", order.totalInCents)}`).join("\n");
}
JS

# A similar name that is not the function: a substring match on "formatPrice" finds it.
mkdir -p src/features/promo
cat > src/features/promo/labels.js <<'JS'
export function formatPriceLabel(label) {
  return label.toUpperCase();
}
JS

capitalize() { printf '%s' "${1:0:1}" | tr a-z A-Z; printf '%s' "${1:1}"; }

for name in alerts audit avatars badges banners bookmarks calendar catalog chat comments coupons dashboard drafts exports favorites feedback files gallery groups help imports inbox labels maps media notes polls profiles reports reviews search settings; do
  mkdir -p "src/features/$name"
  cat > "src/features/$name/service.js" <<JS
import { formatDate } from "../../lib/index.js";

export function describe$(capitalize "$name")(record) {
  return \`${name} \${record.id} updated \${formatDate(record.updatedAt)}\`;
}
JS
  cat > "src/features/$name/view.js" <<JS
import { describe$(capitalize "$name") } from "./service.js";

export function render$(capitalize "$name")(record) {
  return \`<section>\${describe$(capitalize "$name")(record)}</section>\`;
}
JS
  cat > "src/features/$name/index.js" <<JS
export { render$(capitalize "$name") } from "./view.js";
JS
done
