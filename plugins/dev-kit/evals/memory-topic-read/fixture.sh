#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "plans-api",
  "private": true,
  "type": "module",
  "scripts": { "seed": "node scripts/seed.js", "test": "node --test" }
}
JSON

mkdir -p scripts fixtures docs/memory
cat > scripts/seed.js <<'JS'
// Usage: node scripts/seed.js --env <local|staging>
const env = process.argv[process.argv.indexOf("--env") + 1] ?? "local";
console.log(`seeding ${env} from fixtures/${env}.sql`);
JS
cat > fixtures/local.sql <<'SQL'
INSERT INTO plans (name, price_cents) VALUES ('basic', 0), ('pro', 1500);
SQL
cp fixtures/local.sql fixtures/staging.sql

# Written by an earlier session: the only place the staging fact lives.
cat > docs/memory.md <<'MD'
# Memory index

- [Build and CI](memory/build.md): read before changing the CI workflow or the test command.
- [Staging](memory/staging.md): read before seeding, migrating or changing data on staging.
- [Code style](memory/style.md): read before naming new files or modules.
MD
cat > docs/memory/build.md <<'MD'
# Build and CI

- CI runs `node --test` on Node 20 and 22; keep tests free of network calls.
MD
cat > docs/memory/staging.md <<'MD'
# Staging

- The staging database is wiped every night at 02:00 UTC and rebuilt from `fixtures/staging.sql`. Seeding it by hand is lost at the next reset, so new staging data goes into `fixtures/staging.sql` and appears after the next rebuild.
MD
cat > docs/memory/style.md <<'MD'
# Code style

- File names are kebab-case; one module per file.
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add plans seed and memory"
git checkout -q -b feat/premium-plan
