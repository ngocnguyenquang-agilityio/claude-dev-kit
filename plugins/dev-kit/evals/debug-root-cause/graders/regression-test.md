---
type: llm
---

PASS if the response explicitly names a regression test for this bug: either it says the existing test "rejects a day that does not exist in the month" is the regression test that covers the fix, or it adds a new test.
FAIL if the response only says to run the tests without naming which test guards against this bug coming back.
