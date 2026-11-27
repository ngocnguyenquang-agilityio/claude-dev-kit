---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
---

Finish issue 21 with the issue skill's finish mode. The work is done and sits uncommitted in the working tree on the branch `feat/slug-limit`, which is already checked out. The issue file is `docs/issues/21-slug-limit.md`. This fixture has no `origin` remote and no `gh`, so skip the `git push` and `gh` steps and carry on with the rest.

One thing I learned while doing this: the 40 character cap is not arbitrary. The legacy exporter rejects any filename longer than 48 characters, and it appends an 8 character hash plus `.md` to every slug, so 40 is the most a slug can be. Raising the limit will break exports without any error in our code.
