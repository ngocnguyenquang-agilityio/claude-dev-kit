# Memory store

- SessionStart reads the index and every topic file it links, and reports under the index (#85): links whose file is missing, and backticked tokens with a `/` and a file extension that do not exist from the repo root. It only reports; it never edits memory.
- A backticked token in a topic file is treated as a repo path. To quote an example name that is not a real path (a file from an eval fixture, a made-up name), write it without backticks, or the next session warns about it. Tokens with spaces, `*`, `<`, `>`, a URL scheme or a leading `~` or `/` are skipped.
- The report lists each dead path once, at most 10, then a count, so a rotted store cannot push the index past the 10000-character cut of hook output.
- `issue finish` has a Memory step before Review that writes any durable fact the work taught; the `issue-finish-memory` eval covers it. On Windows run evals with `--allow-tools Edit Write`: granting `Bash` is refused because there is no sandbox.
