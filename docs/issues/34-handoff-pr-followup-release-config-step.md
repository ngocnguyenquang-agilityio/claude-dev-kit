# Handoff, pr-followup and release: load config as a step so evals can load them

## Goal

`handoff`, `pr-followup` and `release` still load their config with a `!` injection. Where the shell is refused, as in every `claude plugin eval` run on Windows, these skills fail to load. Running kit-config as each skill's first step, as `issue`, `ship` and `review` already do, means no dev-kit skill depends on the injection.

## Tasks

- [ ] `plugins/dev-kit/skills/handoff/SKILL.md`, `pr-followup/SKILL.md`, `release/SKILL.md`: replace the injection with the first step `issue`/`ship` use. That includes what to say when kit-config cannot run.
- [ ] Check that `handoff`'s `allowed-tools` still allows the kit-config command.
- [ ] Update the README sentence that says which skills run kit-config as a step, the comment at the top of `hooks/kit-config.mjs`, `CHANGELOG.md` and the plugin version.

## Acceptance criteria

- `grep -n '!`node' plugins/dev-kit/skills/*/SKILL.md` finds nothing.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- Evals for these skills: all three set `disable-model-invocation`, so an eval prompt cannot trigger them.

## Depends on

#32

