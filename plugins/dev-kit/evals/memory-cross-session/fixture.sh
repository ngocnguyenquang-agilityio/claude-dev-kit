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

mkdir -p scripts fixtures docs
cat > scripts/seed.js <<'JS'
// Usage: node scripts/seed.js --env <local|staging>
const env = process.argv[process.argv.indexOf("--env") + 1] ?? "local";
console.log(`seeding ${env} from fixtures/${env}.sql`);
JS
cat > fixtures/local.sql <<'SQL'
INSERT INTO plans (name, price_cents) VALUES ('basic', 0), ('pro', 1500);
SQL
cp fixtures/local.sql fixtures/staging.sql

cat > docs/memory.md <<'MD'
# Memory index

One line per topic file in `docs/memory/`: a link and when to read it.
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add plans seed"
git checkout -q -b feat/premium-plan
