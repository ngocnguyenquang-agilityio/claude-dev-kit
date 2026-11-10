---
type: llm
---

PASS if the response treats the stack as known (an Express server with Prisma on PostgreSQL, from `package.json` and `prisma/schema.prisma`), asks one round of at most 4 questions only about decisions the code cannot answer (for example how users sign in, whether recipes become owned by a user), each with options and a recommended option first, marked "(Recommended)", and stops to wait for answers without writing code.
FAIL if it asks the user which database, ORM, framework or language the app uses, asks more than 4 questions, or starts implementing.
