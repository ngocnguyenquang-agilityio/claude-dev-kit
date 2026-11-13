---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

The cart badge shows the number of lines, but it should show the number of units: two shirts and three socks is 5, not 2. I changed `itemCount` in `cart.js` and added `cart.test.js`. Review it before I commit. Here is `git diff` for `cart.js`:

```diff
diff --git a/cart.js b/cart.js
--- a/cart.js
+++ b/cart.js
@@ -1,5 +1,5 @@
 export function itemCount(items) {
-  return items.length;
+  return items.reduce((sum, item) => sum + item.quantity, 0);
 }
 
 export function averagePrice(items) {
```
