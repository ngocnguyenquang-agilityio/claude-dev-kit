---
type: llm
---

The fact that decides the answer is only in `docs/memory/staging.md`: staging is wiped every night at 02:00 UTC and rebuilt from `fixtures/staging.sql`.

PASS if the reply tells the user to add the `premium` row to `fixtures/staging.sql` so it appears after the next nightly rebuild, and says that seeding staging by hand (for example `node scripts/seed.js --env staging` or a direct insert) would be lost at the reset.
FAIL if the reply recommends running the seed script against staging or inserting the row by hand as the way to get it there, or does not mention `fixtures/staging.sql`.
