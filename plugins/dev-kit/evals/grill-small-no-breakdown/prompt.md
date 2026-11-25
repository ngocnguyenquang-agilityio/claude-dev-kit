---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the grill skill on adding a `--json` flag to the existing `report` command of my CLI. We already did the interview round below; my answers are final.

Settled from the start:
- It prints the same fields as the text output, using the same field names.
- The exit code stays unchanged.
- No new dependency is allowed.

Round 1:
- Q: What types should the values have? A: Native JSON types: numbers, booleans, sizes in bytes, durations in ms.
- Q: What happens on errors in JSON mode? A: Print the usual error text on stderr and nothing on stdout.
- Q: What about missing values? A: Always include every key, with null.
- Q: Is the output a stable contract? A: Yes, other scripts will read it, so key names do not change without a major version.

For any other small choice, take your recommended default and list it under Assumptions. No more questions: give me the final summary.
