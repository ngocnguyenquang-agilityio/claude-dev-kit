#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/hooks src/pages

cat > src/api.js <<'JS'
export async function getUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
JS

cat > src/hooks/useUser.js <<'JS'
import { getUser } from "../api.js";

export function useUser(id) {
  return getUser(id);
}
JS

cat > src/pages/Profile.js <<'JS'
import { getUser } from "../api.js";

export async function loadProfile(id) {
  const user = await getUser(id);
  return { name: user.name };
}
JS
