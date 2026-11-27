---
max_turns: 40
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
---

Before writing any code, plan this change for the greeter CLI in this folder, then implement the plan. I approve the plan in advance, so go straight from the plan to the work without waiting for my yes.

Add Vietnamese. The CLI takes a `--lang <en|vi>` flag, default `en`. `greet` and `farewell` each take a `lang` argument and read their text from a new `src/messages.js` table (vi: "Xin chào, Ada!" and "Tạm biệt, Ada."). An unknown language prints an error listing the supported ones. Tests cover both languages for both functions, and the README documents the flag.
