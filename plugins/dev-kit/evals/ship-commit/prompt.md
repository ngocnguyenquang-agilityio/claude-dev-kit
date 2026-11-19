---
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/dev-kit:ship commit 12

Issue #12: commas in invoice names broke the CSV export. `escapeCell` is already committed. The pending work makes `toCsv` use it and adds `export.test.js`, which passes. I have already reviewed this diff and it has no findings, so skip the review. Here is the pending change to `export.js`:

```diff
diff --git a/export.js b/export.js
--- a/export.js
+++ b/export.js
@@ -1,3 +1,5 @@
+import { escapeCell } from "./escape.js";
+
 export function toCsv(rows) {
-  return rows.map((r) => r.join(",")).join("\n");
+  return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
 }
```
