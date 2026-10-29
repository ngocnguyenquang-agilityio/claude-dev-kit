---
name: release
description: Prepare a release. Collects the merged PRs and commits since the last tag, drafts the changelog entry, proposes the version bump and prints the release commands. Use when the user wants to cut a release.
argument-hint: "[version, or major|minor|patch]"
disable-model-invocation: true
---

Prepare a release: `$ARGUMENTS`. This skill drafts and prints; it never tags, pushes or publishes.

1. **Last release.** `git describe --tags --abbrev=0` (no tag means the first release: use the first commit). Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"` for `baseBranch` and `checks`. Stop if the working tree is dirty or the branch is not `<baseBranch>` up to date with `origin/<baseBranch>`; tell the user.
2. **Changes.** `git log <tag>..HEAD --no-merges --format="%h %s"`, and `gh pr list --state merged --base <baseBranch> --search "merged:>=<tag date>" --json number,title,labels`. Group by conventional type: feat, fix, refactor, docs, chore, test. Flag commits that do not follow the convention.
3. **Version.** If `$ARGUMENTS` names a version, use it. Otherwise propose one by semver: any breaking change means major, any feat means minor, else patch. Give the reason and wait for the user to confirm.
4. **Changelog.** Draft the entry in the file's existing format (`CHANGELOG.md`; create one only if the user agrees): the version, today's date, then Added / Fixed / Changed lines in plain language that name the PR numbers, and a "Breaking" line when relevant.
5. **Verify.** Run every check in the config on the release commit. A check that does not exist is "not verified".
6. **Print the commands** for the user to run, each in its own `bash` block: bump the version in `package.json` (name the exact edit), `git commit`, `git tag -a v<version> -m "v<version>"`, `git push origin <baseBranch> v<version>`, and `gh release create v<version> --notes-file <file>`.

Done when the changelog entry, the version and the checks are shown and the commands are printed.
