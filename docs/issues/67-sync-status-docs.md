# Docs: sync issue index and roadmap status with GitHub

## Goal

Pillar 2 (session memory). The repo's status docs disagree with GitHub, so a new session reading them gets the project state wrong. #34 and #47 are closed on GitHub but still `open` in `docs/issues/README.md`, and `docs/vision.md` says roadmap item 4 is "In progress in #61" though #61 is closed.

## Tasks

- [x] `docs/issues/README.md`: set #34 and #47 to `closed`
- [x] `docs/vision.md` (Roadmap, item 4): replace "In progress in #61." with "Done in #61.", and add "Done in #51." to item 1 (stop checks without `package.json`)

## Acceptance criteria

- Every status cell in `docs/issues/README.md` matches `gh issue view <N> --json state`.
- No roadmap item in `docs/vision.md` says "In progress" for a closed issue.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- New roadmap items.
- Roadmap item 2 (A7, rules moved into the kit): whether it is done is not checked here.
- Any code change.

## Depends on

none
