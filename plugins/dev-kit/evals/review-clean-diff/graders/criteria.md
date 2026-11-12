---
type: llm
---

PASS if the response is a review report whose one-line verdict says the change is clean (no Block items), with no Block item at all. Nits or Should fix items about style, such as preferring `===`, are allowed, as long as none of them claims that `user.name == null` gives a wrong result. It says the tests or checks were not verified (or not run) rather than claiming they pass.
FAIL if it lists any Block item, if it claims `== null` is a bug (it is true for both `null` and `undefined`, which is what the request asks for), if it claims an empty name should become "Guest", or if it says it committed.
