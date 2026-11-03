# Finding the issue number

Take the issue number `N` from the first of these that gives one:

- `branch.issue` in the config: set when the branch's commits name exactly one issue as `<type>(#N): ...`.
- When `branch.issues` lists more than one number, ask the user which one this is for.
- A number in the arguments (`12` or `#12`). Any other text is a hint about the change and never becomes a number.
- Ask the user for the issue number, or whether there is none.

With no issue, leave out every issue part: the `(#N)` in commit messages, the `Closes` line, the issue read and the status docs.
