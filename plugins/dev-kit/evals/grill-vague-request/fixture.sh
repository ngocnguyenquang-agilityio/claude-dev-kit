#!/usr/bin/env bash
set -euo pipefail

# A small app whose stack is plain from the files, so the only open decisions
# are about the accounts themselves, not about where the code lives.
cat > package.json <<'JSON'
{
  "name": "notes-app",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node server.js", "test": "node --test" },
  "dependencies": { "express": "^4.21.0" }
}
JSON

cat > server.js <<'JS'
import express from "express";

const notes = [];
const app = express();
app.use(express.json());

app.get("/notes", (request, response) => {
  response.json(notes);
});

app.post("/notes", (request, response) => {
  notes.push({ id: notes.length + 1, text: request.body.text });
  response.status(201).json(notes.at(-1));
});

app.listen(3000);
JS
