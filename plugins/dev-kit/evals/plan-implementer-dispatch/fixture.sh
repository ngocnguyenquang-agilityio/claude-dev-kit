#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests

cat > package.json <<'JSON'
{ "name": "greeter", "type": "module", "bin": { "greeter": "src/cli.js" }, "scripts": { "test": "node --test tests/" } }
JSON

cat > src/greet.js <<'JS'
export function greet(name) {
  return `Hello, ${name}!`;
}
JS

cat > src/farewell.js <<'JS'
export function farewell(name) {
  return `Goodbye, ${name}.`;
}
JS

cat > src/cli.js <<'JS'
#!/usr/bin/env node
import { greet } from "./greet.js";
import { farewell } from "./farewell.js";

const [command, name] = process.argv.slice(2);

if (command === "hello") console.log(greet(name));
else if (command === "bye") console.log(farewell(name));
else console.error("usage: greeter <hello|bye> <name>");
JS

cat > tests/greet.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greet.js";

test("greets by name", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});
JS

cat > tests/farewell.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { farewell } from "../src/farewell.js";

test("says goodbye by name", () => {
  assert.equal(farewell("Ada"), "Goodbye, Ada.");
});
JS

cat > README.md <<'MD'
# greeter

```sh
greeter hello Ada   # Hello, Ada!
greeter bye Ada     # Goodbye, Ada.
```
MD
