# GitHub access

This guide belongs to the [sandbox software](README.md).

## Commit author

At each create and resume, the Worker gives the sandbox the workspace
owner's commit author. This includes a disk retention restart.
It sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and
`GIT_COMMITTER_EMAIL`. These variables take precedence over Git settings
and org variables with the same names.
[Commit author](../docs/protocol/github-tokens.md#commit-author) states the
name and email rules.

## Git credential helper

`install.sh` installs `git-credential-helper.sh` as
`/usr/local/bin/conductive-git-credential`. This wrapper keeps the
caller's `CONDUCTIVE_TURN_ID` and `CONDUCTIVE_ACTIVATION_ID`, loads the
sandbox variables, and runs `git-credential-helper.mjs` with the private Node.

- In Git credential mode, the helper answers only a `get` request for `https` on `github.com`. It
  ignores every other request.
- It posts to the git credential route, `/v1/git/credential`, at
  `CONDUCTIVE_MACHINE_ORIGIN`, with the workspace token as a bearer token. It sends the turn ID in the
  `X-Conductive-Turn-Id` header. It sends no request body. It refuses
  redirects, and it stops after 30 seconds.
- It gives git the token as the password of the user `x-access-token`.
- The Worker returns a fresh GitHub user token of the sender of that turn.
  The helper saves nothing, so each git operation asks again.
- During the restore of an import activation, the runner sets
  `CONDUCTIVE_ACTIVATION_ID` for its Git and LFS processes. The helper then
  sends it in the `X-Conductive-Activation-Id` header in place of a turn ID,
  and the Worker returns the activator's token.
- Without a current turn or activation, or when the Worker refuses, the
  helper writes one fixed message. Git then gets no credential from the helper.

The Worker serves that route on the machine hostname, as the
[lifecycle README](../worker/lifecycle/README.md#machine-route) says.

### GitHub CLI

`install.sh` installs `github-cli.sh` as `/usr/local/bin/gh`.
It installs the `gh` package when `/usr/bin/gh` is missing.
The wrapper asks `conductive-git-credential token` for a fresh token.
That mode reads no stdin and returns only the token.
The wrapper sets `GH_TOKEN` for `/usr/bin/gh`, then replaces itself with that program.
Arguments, stdin, signals, and exit status pass through.
An explicit `GH_TOKEN` or `GITHUB_TOKEN` takes precedence.
The wrapper classifies help, version, and completion before it requests a token.
The first-argument forms pass through without a credential request.
A lone `-h` does too.
A later `--help` passes through only before `--`, after a non-flag argument
or an argument with `=`.
Other forms keep their credential request because the flag can be a value.
This preserves `--title --help` and the hostname flag `-h`.
Extension execution and dynamic completion keep their credential requests.

With a turn ID, the Worker returns that turn sender's token.
Without a turn ID, it returns the workspace owner's token.
An invalid or ended turn gets no token.
[GitHub tokens](../docs/protocol/github-tokens.md) states the access rules.
The wrapper saves no token and changes no shell profile or login file.

An org must build its image again to get this wrapper.
An existing workspace keeps its installed software, also after a resume.
Create a new workspace from the rebuilt image to get the change.

### GitHub App permissions

Automatic authentication uses the permissions of the Conductive Build GitHub App.
The App requests Issues read and write for issue commands.
Private issue listing needs the Issues repository permission with read access.
Creating or changing issues needs write access.
The app owner must change this setting on GitHub.
Each affected installation must approve an added permission before it takes effect.
The wrapper cannot grant a permission that the GitHub App does not have.
See GitHub's [issue permissions](https://docs.github.com/en/rest/issues/issues#list-repository-issues)
and [permission update steps](https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration#changing-the-permissions-of-a-github-app).

## Development

Run the credential helper test with
`npm run test -- worker/lifecycle/git-credential-helper.test.ts`. It
installs copies of the shipped launcher and helper, with a saved variables
file, in a temporary folder under `.context/`. It maps only
`/opt/conductive` and `/run/ascii-secrets` to that folder, and it refuses
a launcher that uses any other absolute path. It runs the launcher with
`/bin/sh`, and checks the outgoing credential request and its turn ID.
Both shell fixtures decode their files from the command of
`installImageSoftware` through one shared test helper.

Run the GitHub CLI wrapper tests with
`npm run test -- worker/lifecycle/github-cli.test.ts`.
They check token delivery, stdin, arguments, exit status, and safe failures.

The [GitHub CLI environment reference](https://cli.github.com/manual/gh_help_environment)
describes the token variables that the wrapper supplies.
