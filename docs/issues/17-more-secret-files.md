# Safety guard: block more credential files

## Goal

The safety guard blocks the common credential files, not only `.env*`, keys, `~/.ssh`, `~/.aws`, `~/.gnupg` and `.netrc`, so the README's "credential files" is true. Today `.pypirc`, `.git-credentials`, `.envrc`, `*.tfvars`, `~/.docker/config.json`, `~/.kube/config`, `credentials.json` and `~/.npmrc` can be read.

## Tasks

- [ ] Extend `SECRET_NAME` in `plugins/dev-kit/hooks/safety-guard.mjs` with `.git-credentials`, `.pypirc`, `.envrc`, `*.tfvars`, `*.tfvars.json` and `credentials.json`, and `SECRET_DIR` with `.kube/`.
- [ ] `.docker/config.json` fits neither list: `SECRET_NAME` matches only the basename (`config.json`) and `SECRET_DIR` only folders. Add a path-suffix match for it, or block the whole `.docker/` folder.
- [ ] Decide on `.npmrc` and `.envrc`. The guard never sees the package manager or direnv read them; blocking only stops Claude's Read, Edit and Write tools and its shell readers. The cost is that Claude can no longer edit a project `.npmrc` (registry, `auto-install-peers`) or an `.envrc`. Options: block every copy, block only `~/.npmrc` (where the auth token usually lives), or leave it out.
- [ ] Keep the example exemption: `terraform.tfvars.example` and `.envrc.sample` stay readable through `SECRET_EXAMPLE`.
- [ ] Add tests in `tests/hooks.test.mjs` for each new file through the Read tool and through a shell reader (`cat`, `Get-Content`), and for the example variants.
- [ ] Update the Safety guard row, the `permissions.deny` example and the test count in `README.md`, so the listed files match the code.

## Acceptance criteria

- Reading each file in the first two tasks with Read, `cat` or `Get-Content` is blocked with exit code 2. `.npmrc` and `.envrc` are blocked or allowed as the third task decides, and a test pins that choice.
- `terraform.tfvars.example` and `.envrc.sample` are not blocked.
- The README names the same file set the code blocks.
- `node --test tests/hooks.test.mjs` passes.
- `claude plugin validate --strict plugins/dev-kit` and `claude plugin validate --strict .` pass.

## Depends on

#16 (same file and test file: start after #16 is merged to avoid conflicts)
