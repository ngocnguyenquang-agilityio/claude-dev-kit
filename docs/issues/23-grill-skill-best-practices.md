# Grill skill: question budget, pushback and behavior evals

## Goal

The `grill` skill asks only the questions that change what gets built, looks up facts without blocking the interview, challenges answers that conflict, and hands `plan` a fixed summary. Its evals grade how it interviews, not only whether it fires.

## Tasks

Should fix:

- [ ] Split facts from decisions in `plugins/dev-kit/skills/grill/SKILL.md`: facts are looked up, decisions are put to the user and never taken on their behalf.
- [ ] Look up facts without blocking: send an `Explore` sub-agent and ask the questions that do not depend on its answer meanwhile.
- [ ] Ask only what changes the outcome: a question whose every answer leads to the same work is not asked; small or easily reversed choices take a default and go under Assumptions. At most 4 questions per round; the rest wait for the next round.
- [ ] Ask with the `AskUserQuestion` tool when a question has 2 to 4 clear options, recommended option first; fall back to the numbered text format when the tool is not available.
- [ ] Push back once, with the reason, when an answer conflicts with an earlier answer, with the code or carries a clear risk. Then follow the user's call.
- [ ] Fixed output: Decisions, Assumptions, Out of scope, Open risks, then one confirmation question. When working an issue whose `docs/issues/<N>-*.md` file exists, also record the decisions there.
- [ ] Description in third person with the triggers "interview me", "stress-test" and "challenge my plan".
- [ ] `plugins/dev-kit/skills/plan/SKILL.md` step 1 starts from grill's Decisions and Assumptions.
- [ ] Evals under `plugins/dev-kit/evals/`:
  - `grill-vague-request/graders/criteria.md` accepts both question formats and fails a round of more than 4 questions.
  - New `grill-repo-fact`: the scaffolded project already answers a question (database and ORM); the response must not ask it.
  - New `grill-pushback`: the prompt holds conflicting requirements; the response must name the conflict and offer options instead of accepting both.
- [ ] Update the eval paragraph in `README.md` ("Test" section), `CHANGELOG.md` and the plugin version.

Judgement calls (decide during planning):

- [ ] Record decisions in the issue file only when it already exists; grill never creates files.
- [ ] Pushback happens once per conflict, so the interview does not turn into an argument.

## Acceptance criteria

- SKILL.md states each rule above in one place and stays short (under 60 lines).
- `claude plugin eval plugins/dev-kit --scaffold --allow-tools Edit --ablation none` passes every grader on the three grill cases, including `skill-fired`. A run with the default no-plugin baseline fails `criteria` on at least one of the new cases. Both results are noted in the PR.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

none
