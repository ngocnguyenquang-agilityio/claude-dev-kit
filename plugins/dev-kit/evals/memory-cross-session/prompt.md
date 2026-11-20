---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Write, Edit]
---

Add a `premium` plan at 4900 cents to `fixtures/local.sql`.

Something I found out the hard way today: the staging database is wiped every night at 02:00 UTC and rebuilt from `fixtures/staging.sql`, so seeding staging by hand is pointless. New staging data has to go into that file.
