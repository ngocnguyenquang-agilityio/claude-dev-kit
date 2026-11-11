---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill, Edit]
---

This change touches 3 files: `src/api.js`, `src/hooks/useUser.js` and `src/pages/Profile.js`. Rename `getUser` to `fetchUser` everywhere it is used.
