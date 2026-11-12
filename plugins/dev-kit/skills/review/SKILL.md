---
name: review
description: Reviews all pending changes before work is reported done. Use after finishing any file changes, before handing over commit commands, and whenever the user asks to review, check or look over their changes or a diff, even one pasted into the chat.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
---

# Review

Review everything pending, committed or not. Run it once at the end of a unit of work, not after every edit. It always runs when the work changed any file, docs and config included, so the spec (issue, plan or request) is still checked.

## Hand over to the reviewer

- **Config**: first run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`. It prints the config as JSON, so you never guess the base branch, issues folder or checks. A step, not a `!` injection: an injected command that cannot run stops the whole skill from loading, and plugin evals on Windows refuse every shell. It gives `baseBranch`, the `checks` commands, `issuesDir` and the branch's issue number. If it cannot run, say so, and name every config value you then use and where you took it from, so the user can correct it.
- **Issue**: the number comes from the caller (for example `issue finish`), else `branch.issue` in the config. Pass the issue file path `<issuesDir>/<NN>-*.md` too when `issuesDir` is set. If `branch.issues` lists more than one number and no caller gave one, name the conflict in the report. Do not block on asking.
- **No issue**: pass the file path of the plan the user approved instead (plans are saved under `docs/plans/`). With no plan either, pass the user's request verbatim. The reviewer cannot see this conversation, so paste the text rather than refer to it. Only with none of the three does the Spec axis get skipped.
- **Pasted diff**: pass it verbatim. If it is not the pending work on this branch (another branch, PR or repository), tell the reviewer to review the pasted text instead, and say so in the report.

Spawn the `reviewer` agent (`subagent_type: "dev-kit:reviewer"`) with the base branch and the spec (issue number and file path, plan, or request) in its prompt. It owns the diff handling, the six axes and the levels. Do not repeat its review here. It reports Block, Should fix and Nit items, a spec table and Follow-ups.

## After the review

Fix Block and Should fix items, except Scope items: the user may want that extra change, so report them as "needs your decision" and never revert them. When a Block fix changes more than a few lines, spawn the reviewer once more on the new diff; there is no third run, so report what is still open. Then re-run every command under `checks` from the config. This skill owns that re-run: callers such as `issue finish` and `/dev-kit:ship commit` don't repeat it. A check the config lists as `null` doesn't exist in this project: say "not verified" for it rather than skipping silently. Report:

1. One-line verdict: clean, or has Block items.
2. Findings under the headings Block, Should fix and Nit, named exactly so, each with `file:line`, the problem, the fix, and whether it is "fixed" or "needs your decision".
3. Follow-ups: problems outside the diff, left alone.

No praise filler, no restating the diff. This skill never runs `git commit` or `git push`.
