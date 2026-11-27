# Hook events

Probed on 2026-11-27 (#84) with a throwaway hook that logged each call, on Windows 11, Claude Code desktop app and `claude -p` started from it.

- `SessionEnd` fires in both. In `claude -p` it fires when the print run exits; in the desktop app it fires when the user archives the session. Its stdin has `session_id`, `transcript_path`, `cwd`, `hook_event_name` and `reason`; `reason` was `other` every time.
- `PreCompact` fires in both, for a manual `/compact`, with `trigger: manual` and `custom_instructions` in its stdin. It fires even when compaction is refused with "Not enough messages to compact". Auto-compact (`trigger: auto`) was not observed.
- Closing a tab without archiving was not tried, so `SessionEnd` may not fire for it. A hook that must not lose state cannot rely on `SessionEnd` alone.
- `CLAUDE_CODE_ENTRYPOINT` is `claude-desktop` in both cases, because `claude -p` inherits the desktop app's environment. Do not use it to tell the clients apart.
- In Git Bash a prompt that starts with `/` (such as `/compact`) is rewritten to a Windows path; set `MSYS_NO_PATHCONV=1` before running `claude -p "/compact"`.
