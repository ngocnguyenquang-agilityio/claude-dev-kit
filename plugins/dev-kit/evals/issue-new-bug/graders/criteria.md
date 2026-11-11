---
type: llm
---

PASS if the response shows an issue draft that has all of: steps to reproduce (for example export 3 invoices and count the rows), expected versus actual behavior (3 rows versus 2), and an out-of-scope section or list; and it stops for the user's review or yes before creating the issue on GitHub.
FAIL if any of those three parts is missing, or it says the issue was created without waiting for the user.
