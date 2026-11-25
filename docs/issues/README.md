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
| 32 | [Ship and review skills: load config as a step so evals can load them](32-ship-review-config-step.md) | closed | #30 |
| 34 | [Handoff, pr-followup and release: load config as a step so evals can load them](34-handoff-pr-followup-release-config-step.md) | closed | #32 |
| 35 | [Plan skill: approval gate, out of scope, saved plans and stricter checks](35-plan-skill-best-practices.md) | closed | none |
| 37 | [Review skill: verified findings, scoped rules, scope decisions and behavior evals](37-review-skill-best-practices.md) | closed | none |
| 39 | [Add a read-only impact-mapper agent that plan calls at step 2](39-impact-mapper-agent.md) | closed | none |
| 43 | [Impact-mapper follow-ups: stricter eval criteria, fallback check and a real-project trial](43-impact-mapper-followups.md) | closed | none |
| 45 | [Focus the kit on its purpose](45-focus-kit-scope.md) | closed | none |
| 47 | [Handoff skill: behavior evals and a Next-items rule](47-handoff-evals.md) | closed | none |
| 49 | [Safety guard: ask before editing files on the base branch](49-base-branch-edit-guard.md) | closed | none |
| 51 | [Stop checks: run without package.json, re-run on config edits, report timeouts](51-stop-checks-reliability.md) | closed | none |
| 53 | [Context nudge: suggest handoff when a session gets long](53-context-nudge.md) | closed | none |
| 55 | [Evals for ship and a 3-of-3 bar for handoff-basic](55-ship-evals-handoff-3of3.md) | closed | none |
| 57 | [Inventory script for the review cadence](57-inventory-script.md) | closed | none |
| 59 | [Re-run the grill baseline and tighten grill-pushback](59-grill-baseline.md) | closed | none |
| 61 | [Kit-owned memory store: an indexed docs/memory/ with a secret guard](61-memory-store.md) | closed | none |
| 63 | [Plan skill: run approved steps on Sonnet through an implementer agent](63-plan-implementer-agent.md) | closed | none |
| 65 | [Reviewer agent: evals that check it is spawned, and a pasted-diff case](65-reviewer-evals.md) | closed | none |
| 67 | [Docs: sync issue index and roadmap status with GitHub](67-sync-status-docs.md) | closed | none |
| 69 | [Issue start: route multi-file issues through plan so steps run in the implementer](69-issue-start-plan.md) | closed | none |
| 72 | [Grill: propose ordered vertical-slice issues when the settled scope is bigger than one issue](72-grill-proposed-issues.md) | closed | none |
| 73 | Issue new: draft a list of issues in full, review once, then file them in dependency order (not planned) | closed | #72 |
| 75 | [PR status guard: block gh pr create while the closed issue's status docs are not updated](75-pr-status-guard.md) | closed | none |
| 76 | [Ship pr and working rules: stop before a PR whose issue's status docs are not updated](76-ship-pr-status-docs.md) | open | none |

Order: 15 → 16 → 17. All three change `safety-guard.mjs` and `tests/hooks.test.mjs`, so each starts after the previous one is merged. 21, 23, 26, 28, 30, 32, 34, 35, 37, 39, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67 and 69 are independent of them and of each other. Next: 75 → 76. 75 blocks `gh pr create` in a hook, so 76's own PR is already checked by it; 76 makes `ship pr` and the working rules stop first.
