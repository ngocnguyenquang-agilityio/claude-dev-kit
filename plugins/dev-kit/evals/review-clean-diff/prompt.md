---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

Users with `name: null` or no `name` field at all should be greeted as "Guest". An empty string is a valid name in our system and must be kept. I changed `greeting.js` and added `greeting.test.js`. Review it before I commit. Here is `git diff` for `greeting.js`:

```diff
diff --git a/greeting.js b/greeting.js
--- a/greeting.js
+++ b/greeting.js
@@ -1,3 +1,4 @@
 export function greeting(user) {
-  return `Hello, ${user.name}!`;
+  const name = user.name == null ? "Guest" : user.name;
+  return `Hello, ${name}!`;
 }
```
