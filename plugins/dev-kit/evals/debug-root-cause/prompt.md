---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

This is broken: `isValidDate("2024-02-30")` returns `true`, so bad dates get saved. Here is the function:

```js
export function isValidDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return !Number.isNaN(date.getTime());
}
```

Fix it.
