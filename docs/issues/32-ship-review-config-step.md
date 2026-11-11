# Ship and review skills: load config as a step so evals can load them

## Goal

`ship` and `review` load their config with a `!` injection. When the shell is refused, as in every `claude plugin eval` run on Windows, the skill fails to load and the eval measures nothing. Running kit-config as the skill's first step, as `issue` does since #30, lets the skills load anywhere and makes `review` testable.

## Tasks

- [x] `plugins/dev-kit/skills/review/SKILL.md`: replace the `!` injection with a first step that runs `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`, with the same wording as `issue/SKILL.md`, including what to say when it cannot run.
- [x] `plugins/dev-kit/skills/ship/SKILL.md`: the same change.
- [x] Eval `plugins/dev-kit/evals/review-boundary-bug/`: a scaffolded git repo where the working tree adds a discount with `> 100` while the request says "100 or more". Passes when the review gives a verdict, levels Block / Should fix / Nit, flags the boundary as Block with file and line, and calls the checks not verified. Run it against the current skill first for a baseline.
- [x] Add `review` to the eval paragraph in `README.md`, and update `CHANGELOG.md` and the plugin version.

## Acceptance criteria

- `grep -n '!`node' plugins/dev-kit/skills/{ship,review}/SKILL.md` finds no injection.
- The `review-boundary-bug` baseline run shows in its judge evidence that the skill did not load; after the change, the evidence shows it loaded and the case passes. Scores before and after are in the PR.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Out of scope

- `handoff`, `pr-followup` and `release` still use the injection; they get their own issue.
- An eval for `ship`: it sets `disable-model-invocation`, so an eval prompt cannot fire it.
- The `tdd` eval from audit item A22: this issue covers its `review` part only (the `issue` mode inference part came with #30).

## Depends on

#30
