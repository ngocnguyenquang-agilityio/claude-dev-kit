---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use the grill skill on a Node CLI that checks links in Markdown files. We already did the interview rounds below; my answers are final.

Local file links: resolve them relative to the Markdown file and report missing files. Heading anchors: check `#anchor` links against the headings of the target file, using GitHub-style slugs. External HTTP links: send a HEAD request with a 5 second timeout, retry once on failure, and treat 4xx and 5xx as broken. Report: print one line per broken link as file:line plus the reason, then a summary count, and exit with code 1 if any link is broken.

Round 1

Q: What if HEAD is rejected with 405 or 403?
A: Retry once with GET and judge the link by the GET response.

Q: What does the retry cover?
A: Only timeouts, network errors and 5xx. A 4xx is broken at once, and 429 is reported as rate limited.

Q: Which files are checked?
A: Files or folders as arguments. Folders are searched recursively for `*.md`, skipping `node_modules` and `.git`. No arguments means the current folder.

Q: How are links found?
A: With markdown-it (one dependency), skipping code blocks and inline code. Reference-style links are included.

Round 2

Q: Which Node version?
A: Node 20+ with built-in fetch.

Q: What about redirects?
A: Follow them; the final status decides.

Q: How much concurrency?
A: At most 8 requests at once, and each unique URL is checked once.

Q: What about non-HTTP schemes like `mailto:`?
A: Skipped.

For any other small choice, take your recommended default and list it under Assumptions. No more questions: give me the final summary.
