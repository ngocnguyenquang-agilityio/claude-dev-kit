---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

A teammate wants my review on a change in their `auth-service` repo, which I don't have checked out here. The task was: "drop expired sessions; a session is expired once `expiresAt` is earlier than now". Review this diff before they merge it:

```diff
diff --git a/src/sessions.js b/src/sessions.js
--- a/src/sessions.js
+++ b/src/sessions.js
@@ -1,3 +1,7 @@
 export function activeSessions(sessions) {
   return sessions;
 }
+
+export function removeExpired(sessions, now) {
+  return sessions.filter((session) => session.expiresAt < now);
+}
```
