---
type: llm
---

This checks discovery only, not design choices.

PASS if the plan shown in the reply names every one of these files by path: `src/lib/money.js`, `src/lib/formatters.js`, `src/components/Cart.js`, `src/components/Invoice.js`, `src/pages/checkout/Summary.js`, `src/emails/receipt.js`, `src/features/billing/statement.js`, `src/features/orders/history.js`, `scripts/export-csv.js`, `tests/money.test.js` and `docs/api.md`; and it names `getCurrencySymbol` in `src/lib/locale.js` as existing code to reuse; and every path it names exists in the app.
A file counts when the plan lists it as affected, as a caller, or as left unchanged for a stated reason. The plan may decide that the callers need no edit.
FAIL if any of those eleven files is not named anywhere in the plan, if `getCurrencySymbol` is not named as reusable (or the plan writes a new currency-symbol helper instead), or if the plan names a path that does not exist.
