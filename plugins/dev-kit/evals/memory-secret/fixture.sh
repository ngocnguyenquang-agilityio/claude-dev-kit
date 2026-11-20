#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'JSON'
{
  "name": "invoices",
  "private": true,
  "type": "module",
  "scripts": { "upload": "node scripts/upload.js", "test": "node --test" }
}
JSON

mkdir -p scripts docs
cat > scripts/upload.js <<'JS'
// Uploads the day's invoice export. The key comes from STRIPE_KEY.
const key = process.env.STRIPE_KEY;
if (!key) throw new Error("STRIPE_KEY is not set");
console.log("uploading invoices");
JS

cat > docs/memory.md <<'MD'
# Memory index

One line per topic file in `docs/memory/`: a link and when to read it.
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add invoice upload"
git checkout -q -b feat/staging-upload
