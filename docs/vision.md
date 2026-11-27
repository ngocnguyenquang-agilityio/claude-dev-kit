# Vision

## Purpose

dev-kit helps one developer write better code and keep memory across sessions, with a safety guard underneath.

## Who it is for

One user: the repo owner. There is no support for other teams, other stacks or shared configuration beyond what this repo uses.

## Pillars

1. **Quality workflow**: clarify, plan, debug, review and ship in small verified steps. Decisions (grill, plan, checks) run on the model you chose for the session; the steps of an approved plan run on Sonnet in the `implementer` agent, and the main session checks each one.
2. **Session memory**: what one session learned reaches the next. `handoff` keeps the per-branch notes; the kit's memory store (`docs/memory.md` and `docs/memory/`) keeps durable project facts and replaces Claude Code's native auto-memory.
3. **Safety guard**: a base layer that blocks or asks before risky actions. It stays as it is and is not extended, except for the one check named under Not in scope.

## Components

Quality workflow:

- Skills: `grill`, `plan`, `debug`, `review`, `issue`, `ship`
- Agents: `impact-mapper`, `reviewer`, `implementer`
- Hooks: Format on edit, Stop checks, Notify (tells you when Claude finishes or waits, so a prompt is not missed)

Session memory:

- Skill: `handoff`
- Hooks: SessionStart (loads the working rules, the checks, the memory index `docs/memory.md` and the branch's handoff note), Context nudge (once per session, asks you to run `handoff` when the context is nearly full)
- Memory store: the index `docs/memory.md` and topic files `docs/memory/<topic>.md`, written by Claude under the working rules and read on demand

Safety guard:

- Hooks: Safety guard, Package-manager guard

## Not in scope

- Skills that only wrap a command the project already has (releases, CI follow-up, a test-first loop).
- Browser or UI verification.
- Other stacks and other users.
- Extending the safety guard. One exception: it blocks a secret in a write to the memory store (`docs/memory.md`, `docs/memory/`), since those files are committed.

## Gate for new components

A new skill, agent or hook names the pillar it serves and ships with at least one eval. If it fits no pillar, it does not go in.

## Review cadence

Before every minor release, run an inventory: how often each component was used, and which components have an eval. Remove what is unused or unproven. `node scripts/inventory.mjs` prints this table from the Claude Code transcripts of all your projects, the hook usage log, the eval cases and the hook tests.

## Roadmap

In this order:

1. **A11**: stop checks work without `package.json`. Done when they run on this repo and report real results. Done in #51.
2. **A7**: the rules in `~/.claude/rules` move into the kit so one source remains. Done when `~/.claude/rules` holds no rule that the kit also holds.
3. **Evals for `handoff` and `ship`**: Done when each skill has one eval that passes 3 of 3 runs. Done in #47 and #55: `handoff-basic` and `ship-commit`.
4. **Kit-owned memory store**: only after items 1 to 3, with an eval, and after finding how to turn off native auto-memory. Done when one eval shows a fact written in one session is used in the next, and native auto-memory is off. Done in #61.
