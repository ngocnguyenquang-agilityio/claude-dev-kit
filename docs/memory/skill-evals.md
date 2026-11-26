# Skill evals

- An eval case is one session: the user cannot answer questions. To grade what a skill does after an interview (such as grill's final summary), put the earlier rounds and their answers in the prompt. A prompt that only says "every decision is settled" does not work: grill still found real open decisions and asked a round in 3 of 3 runs (#72).
- A transcript-style prompt that ends "give me the final summary" was answered without calling the skill in 2 of 3 runs. Name the skill in the prompt ("Use the grill skill on ...") when the case grades output, not triggering; other cases cover triggering.
- `grill-vague-request` and `grill-repo-fact` have a `fixture.sh`, so they need `--scaffold`. Without it they run in an empty folder and fail (#72).
- Wording with a subjective way out ("a scope that fits one PR") let the model skip a rule; a rule phrased only in terms it can check held better (#72).
- A `tool_used` grader's `input_match` is a regex over the whole serialized tool input. To check that an agent was not sent to redo a step, match the step's action (`Create .src/slugify`), not the bare file name: the implementer prompt names earlier files as a style reference ("match the style of `src/slugify.js`"), and a bare-name grader failed 3 of 3 correct runs (#83).
- Evals on Windows have no shell, so `plan` cannot run a step's Done when check: it implements the first open step, does not tick it and stops. Grade what it spawns, not ticks or later steps (#83).
- `node --test tests/` fails on Node 24 for Windows (the directory is read as a file to run); fixtures use plain `node --test` (#83).
