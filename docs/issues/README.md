# Issues

One file per GitHub issue: `<NN>-<slug>.md`. The GitHub issue is the source of truth; these files hold the task checklist that `/dev-kit:issue finish` ticks.

| # | Title | Status | Depends on |
|---|---|---|---|
| 15 | [Safety guard: ask before any gh or glab command that is not read-only](15-gh-read-only-allowlist.md) | closed | none |
| 16 | [Safety guard: ask before discarding work or deleting a directory tree](16-guard-discard-and-recursive-delete.md) | closed | #15 |
| 17 | [Safety guard: block more credential files](17-more-secret-files.md) | closed | #16 |
| 21 | [Debug skill: gates, escalation and behavior evals](21-debug-skill-best-practices.md) | closed | none |
| 23 | [Grill skill: question budget, pushback and behavior evals](23-grill-skill-best-practices.md) | closed | none |
| 26 | [Review: check the spec when there is no issue](26-review-spec-without-issue.md) | closed | none |
| 28 | [Handoff skill: stale-note check, expiry and a stricter note format](28-handoff-skill-best-practices.md) | closed | none |
| 30 | [Issue skill: one-level references, evals, better drafts and repo issue templates](30-issue-skill-best-practices.md) | closed | none |

Order: 15 → 16 → 17. All three change `safety-guard.mjs` and `tests/hooks.test.mjs`, so each starts after the previous one is merged. 21, 23, 26, 28 and 30 are independent of them and of each other.
