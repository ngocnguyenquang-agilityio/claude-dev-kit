---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent, Edit]
---

`formatPrice(150)` shows `$1.5` instead of `$1.50`. Fix only that. I changed `format.js` and added `format.test.js`. Review it before I commit. Here is `git diff` for `format.js`:

```diff
diff --git a/format.js b/format.js
--- a/format.js
+++ b/format.js
@@ -1,11 +1,11 @@
-function two(n) {
+function padTwoDigits(n) {
   return String(n).padStart(2, "0");
 }
 
 export function formatPrice(cents) {
-  return "$" + cents / 100;
+  return "$" + (cents / 100).toFixed(2);
 }
 
 export function formatDate(date) {
-  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
+  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
 }
```
