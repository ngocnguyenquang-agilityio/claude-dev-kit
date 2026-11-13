---
type: llm
---

This checks discovery with evidence, not design choices.

PASS if the plan shown in the reply covers every one of these files by path, each with a reason tied to `formatPrice` (it calls it, re-exports it, aliases it, tests it, documents it, or is left unchanged for a stated reason): `src/lib/money.js`, `src/lib/formatters.js`, `src/components/Cart.js`, `src/components/Invoice.js`, `src/pages/checkout/Summary.js`, `src/emails/receipt.js`, `src/features/billing/statement.js`, `src/features/orders/history.js`, `scripts/export-csv.js`, `tests/money.test.js` and `docs/api.md`; and it names `getCurrencySymbol` in `src/lib/locale.js` as existing code to reuse.
A file counts when the plan lists it as affected, as a caller, or as left unchanged for a stated reason. The plan may decide that the callers need no edit.
FAIL if any of those eleven files is missing from the plan or appears only as a bare name with no reason, if `getCurrencySymbol` is not named as reusable (or the plan writes a new currency-symbol helper instead), or if the plan lists `src/features/promo/labels.js` (it holds `formatPriceLabel`, a different function) or any other `src/features/` folder besides `billing` and `orders` as affected by the change.
