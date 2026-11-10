#!/usr/bin/env bash
set -euo pipefail

cat > package.json <<'EOF'
{
  "name": "recipe-box",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node server.js", "test": "node --test" },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "express": "^4.21.0"
  },
  "devDependencies": { "prisma": "^5.22.0" }
}
EOF

mkdir -p prisma
cat > prisma/schema.prisma <<'EOF'
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Recipe {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  createdAt DateTime @default(now())
}
EOF

cat > server.js <<'EOF'
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.get("/recipes", async (request, response) => {
  response.json(await prisma.recipe.findMany());
});

app.post("/recipes", async (request, response) => {
  response.status(201).json(await prisma.recipe.create({ data: request.body }));
});

app.listen(3000);
EOF
