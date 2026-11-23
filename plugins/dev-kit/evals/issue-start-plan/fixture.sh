#!/usr/bin/env bash
set -euo pipefail

mkdir -p src tests docs/issues

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

cat > README.md <<'MD'
# greeter

```sh
greeter hello Ada   # Hello, Ada!
greeter bye Ada     # Goodbye, Ada.
```
MD

cat > docs/issues/README.md <<'MD'
# Issues

One file per GitHub issue: `<NN>-<slug>.md`. The GitHub issue is the source of truth; these files hold the task checklist that `/dev-kit:issue finish` ticks.

| # | Title | Status | Depends on |
|---|---|---|---|
| 12 | [Add a shout mode that upper-cases greetings](12-shout-mode.md) | open | none |
MD

cat > docs/issues/12-shout-mode.md <<'MD'
# Add a shout mode that upper-cases greetings

## Goal

Users want loud greetings. Add a `--shout` flag that upper-cases the output of `hello` and `bye`, with the casing rules in one shared module so both commands behave the same.

## Tasks

- [ ] `src/shout.js`: new module exporting `shout(text)`, which upper-cases the text and keeps the punctuation
- [ ] `src/greet.js`: take an optional `{ shout }` option and apply `shout()` when it is set
- [ ] `src/farewell.js`: the same option and the same call to `shout()`
- [ ] `src/cli.js`: parse `--shout`, pass it to `greet` and `farewell`, and list it in the usage line
- [ ] `tests/shout.test.js`: new tests for `shout()`; extend `tests/greet.test.js` to cover the option
- [ ] `README.md`: document the flag with an example

## Acceptance criteria

- `greeter hello Ada --shout` prints `HELLO, ADA!`
- `greeter bye Ada --shout` prints `GOODBYE, ADA.`
- Without the flag the output is unchanged
- `npm test` passes

## Out of scope

- Other languages or other text transforms
- A config file for default flags

## Depends on

none
MD

git init -q -b main
git add .
git -c user.name=eval -c user.email=eval@example.com commit -q -m "Add greeter CLI"

git checkout -q -b feat/shout-mode
