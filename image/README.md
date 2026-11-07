# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it into the org image before it runs the org's install script. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner. It also
gives git a fresh GitHub token for each operation. The agent tools are not
in this folder yet. The folder also holds two
[developer scripts](developer-scripts.md) that no build installs: the
archive packager and the live check.

## Responsibilities

- Install the pinned private Node after a check of its SHA-256 digest, or
  reuse it when the image already holds it.
- Install the runner archive after a check of its SHA-256 digest.
- Install and enable the agent runner's systemd service.
- Make the git credential helper the system credential helper of git.
- Start no runner in a build sandbox. The service runs it only in a
  workspace sandbox.
- Package the runner archive and its digest on a developer machine.
- Check the chat path and time the first agent start in a real sandbox.

The [terminal backend](../worker/terminal/README.md) owns ttyd, tmux, their
services, the terminal launcher, and the local password. It also owns the
shell server, which keeps the workspace shell in tmux. The software step of
each image build runs that area's `terminalInstallCommand()` after
`install.sh`. The build log shows the output of both. The terminal
installer installs the `ttyd` and `tmux` packages with `apt-get`. It
enables the terminal service and starts nothing.

## The runner archive

Each build takes one input, an `ImageSoftwareArtifact`. It is the public
HTTPS URL of a `.tar.gz` archive, with the SHA-256 digest of the archive.
The caller of the lifecycle routes supplies it as the `software` option, as
the [lifecycle README](../worker/lifecycle/README.md#browser-routes) says.
`readImageSoftware` in
[`image-software.ts`](../worker/lifecycle/image-software.ts) refuses a URL
with a user name, a password, a query, or a fragment. It also refuses a
digest that is not 64 hexadecimal characters.

The archive must hold `runner/main.mjs`: the agent runner, with its SDK
dependencies. It needs no Node, because the runner runs on the
[private Node runtime](runtime.md).

Put no credential in the URL or in the archive. Each saved snapshot keeps
the unpacked archive.

[`package-runner.mjs`](package-runner.mjs) makes the archive on a
developer machine, as
[Developer scripts](developer-scripts.md#package-the-archive) says. It
writes the URL and the digest of the archive to `<archive>.json`.

To supply an archive:

1. Publish the exact archive at its URL, on a public HTTPS host.
2. Set the Worker variables `CONDUCTIVE_RUNNER_ARCHIVE_URL` and
   `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` to that URL and the matching digest,
   as [Deployment inputs](../docs/deployment.md#the-runner-archive) says.
   `<archive>.json` holds both.

A build fails when the file at the URL does not match the digest. So a
versioned URL for each archive is a good choice.

The Worker does not serve the archive. No route reads the two variables
yet, because the Worker does not route the image builds.

## The private Node runtime

[The private Node runtime](runtime.md) gives the pinned Node release, its
paths, and its update steps.

## Install

[Install in a build](install.md) describes the software step of each image
build: the staged scripts, the private Node, and the steps of `install.sh`.
A refresh skips that step.

## Start in a workspace

The Worker gives each workspace sandbox these variables at create and at
each resume, together with the org's env vars:

| Name | Value |
| --- | --- |
| `WORKSPACE_TOKEN` | The workspace token. |
| `CONDUCTIVE_WORKSPACE_ID` | The workspace ID. |
| `CONDUCTIVE_MACHINE_ORIGIN` | The origin of the machine hostname. |
| `CONDUCTIVE_DEFAULT_BRANCH` | The default branch of the workspace's repository. |
| `CONDUCTIVE_COMPUTER_MCP_URL` | The URL of the `computer` MCP server, from the Worker secret of the same name. It is empty when the Worker has no such secret. |
| `CONDUCTIVE_REPOSITORY_DIR` | The folder of the workspace's repository, from the folder map that the workspace captured. |
| `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` | The folder of each repository of the image, with one variable for each repository. |
| `CONDUCTIVE_TURN_ID` | Empty. The runner sets it for each agent process. |
| `CONDUCTIVE_DISK_KEEPALIVE` | `1` in a disk retention restart, and `0` otherwise. |

[Repository folders](../docs/protocol/repository-folders.md) gives the
folder names and the variable names. The
[repository layout](../worker/lifecycle/repository-layout.md) says how the
Worker makes and keeps the folder map.

The runner, the terminal launcher, and the terminal's shell server read the
variables from `/run/ascii-secrets/env.sh`, where Boat puts them. A systemd
service does not get them in another way. A Boat command process does not
get them either. So the install command of a build loads the same file,
with automatic export, before Bash runs the org's install script. The
install script then gets the folder variables.

At a create, the Worker first fetches the default branch and creates the
workspace branch. When the GitHub repository has no refs, the fetch step
first pushes an empty first commit to the default branch. That push gets
its token from the [git credential helper](#git-credentials), as every
other git operation does. At each create and each resume, the Worker then
runs the command of `workspaceStartupCommand`:

1. It writes the org's startup script to `/run/conductive/startup.sh`, with
   mode 600.
2. It runs the script with Bash in the repository folder, with the
   variables.
3. When the script succeeds, it writes the marker
   `/run/conductive/workspace-ready`, and restarts the runner service.

After that command succeeds, the Worker calls the terminal backend's start
hook. That hook starts the terminal service and its shell server. It caches
the locally generated password in encrypted form before the workspace
becomes ready.

The runner start script exits with success, and starts nothing, in these
cases:

- `CONDUCTIVE_DISK_KEEPALIVE` is `1`.
- `WORKSPACE_TOKEN` or `CONDUCTIVE_WORKSPACE_ID` is empty.
- The marker `/run/conductive/workspace-ready` does not exist.

So a build sandbox and a disk retention restart start no runner. The
terminal backend needs its own marker under `/run`, which only its
workspace start hook creates. Builds and disk retention restarts do not
call that hook, so they start no terminal and no terminal shell. A disk
retention restart runs `workspaceStartupCommand` in its `retention` mode.
That mode runs the startup script, but it writes no ready marker and does
not restart the runner service.

Otherwise, `runner-start.sh` runs `runner/main.mjs` with the private
Node, in the repository folder. The runner unit restarts its service after
a failure. The terminal backend describes its launcher, its shell server,
its password, and its automatic restart in its
[README](../worker/terminal/README.md). That README also says how the
workspace shell keeps running when a terminal connection drops.

Before it runs the runner, `runner-start.sh` sets three variables of the
runner's [configuration](../runner/README.md#configuration) from the table.
Each value replaces a saved variable of the same name.

| Runner variable | Value |
| --- | --- |
| `CONDUCTIVE_WORKSPACE_TOKEN` | `WORKSPACE_TOKEN` |
| `CONDUCTIVE_REPOSITORY` | `CONDUCTIVE_REPOSITORY_DIR` |
| `CONDUCTIVE_RUNNER_URL` | `CONDUCTIVE_MACHINE_ORIGIN` without a trailing slash, then the path of `MACHINE_PATHS.runner` |

Without `CONDUCTIVE_COMPUTER_MCP_URL`, the runner fails at its start.
[Deployment inputs](../docs/deployment.md#the-mcp-url) says how the Worker
protects that URL.

## Git credentials

`install.sh` installs `git-credential-helper.sh` as
`/usr/local/bin/conductive-git-credential`. This wrapper keeps the
caller's `CONDUCTIVE_TURN_ID`, loads the sandbox variables, and runs
`git-credential-helper.mjs` with the private Node.

- The helper answers only a `get` request for `https` on `github.com`. It
  ignores every other request.
- It posts to the git credential route, `/v1/git/credential`, at
  `CONDUCTIVE_MACHINE_ORIGIN`, with the workspace token as a bearer token. It sends the turn ID in the
  `X-Conductive-Turn-Id` header. It sends no request body. It refuses
  redirects, and it stops after 30 seconds.
- It gives git the token as the password of the user `x-access-token`.
- The Worker returns a fresh GitHub user token of the sender of that turn.
  The helper saves nothing, so each git operation asks again.
- Without a current turn, or when the Worker refuses, the helper writes one
  fixed message. Git then gets no credential from the helper.

The Worker serves that route on the machine hostname, as the
[lifecycle README](../worker/lifecycle/README.md#machine-route) says.

## Secrets

- A build sandbox starts with no org env vars and no workspace token. It
  gets only the folder variables, which hold no secret. So no saved
  snapshot holds a secret of a workspace.
- The Worker gives each read token only to the Git command that copies its
  repository. The Worker revokes it before the build goes on, as
  [GitHub tokens](../docs/protocol/access-and-security.md#github-tokens)
  says. The software step and the install script run only after that.
- The workspace object keeps the env values and output chunks of a start
  only in encrypted form. Before it returns a start log, it masks the
  complete joined stdout and stderr with the saved env values. This hides
  a value across chunks and across the stdout and stderr boundary.
- The terminal password stays in `/run/conductive-terminal/password`, with
  mode 600. The terminal backend checks that it has 64 lowercase
  hexadecimal characters.
  The readiness command writes no password to output or command history.
- The helper never writes a token or the Worker's response to its error
  output.

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

Run the installer tests with
`npm run test -- worker/lifecycle/image-runtime.test.ts worker/lifecycle/image-software.test.ts`.
They run the shipped scripts with local archives and a fake `curl`.

Run the start script test with
`npm run test -- worker/chat/integration/runner-launcher.test.ts`. It stages
the software with `installImageSoftware` in a temporary folder under
`.context/`, and runs the staged `runner-start.sh` with `/bin/sh`. It checks
the settings that the runner configuration reads, and that the script uses
the private Node, not a `node` on the path. It also checks that a
build, a disk retention restart, and an unfinished start start no runner.

- The Worker imports each file with Vite's `?raw` suffix. When you add a
  file that the sandbox needs, also add it to `installImageSoftware`.
  Add it to `install.sh` too when a sandbox uses it after the build. The
  developer scripts stay out of the sandbox.
- Start Node in a script only as `@CONDUCTIVE_NODE@`.
- `runner-start.sh` holds the placeholder `@RUNNER_PATH@`.
  `installImageSoftware` replaces it with `MACHINE_PATHS.runner` when it
  stages the script, so the runner path has one source. Run only the staged
  copy.
- Keep each start script safe to run in a build sandbox. Of the variables
  in the table, a build sandbox has only the folder variables.
- [Developer scripts](developer-scripts.md#development) gives the checks of
  the developer scripts.

### Key Code

- [`install-runtime.sh`](install-runtime.sh): installs the private Node.
  Its arguments are the download URL, the digest, and the version folder.
- [`install.sh`](install.sh): installs the runner archive, its service,
  and the git helper. Its arguments are the archive URL and the digest.
- [`runner-start.sh`](runner-start.sh) and
  [`conductive-runner.service`](conductive-runner.service): start the agent
  runner, and map the sandbox variables to the runner variables.
- [The terminal backend](../worker/terminal/service.ts): owns the terminal
  install command, its two services, and its workspace start hook.
- [`git-credential-helper.sh`](git-credential-helper.sh) and
  [`git-credential-helper.mjs`](git-credential-helper.mjs): the git
  credential helper.
- [`image-runtime.ts`](../worker/lifecycle/image-runtime.ts): the pinned
  Node release, its digest, and its paths.
- [`image-software.ts`](../worker/lifecycle/image-software.ts): stages these
  files for a build, adds the terminal install command, and makes the
  startup command for a workspace start or a disk retention restart.
- [`saved-script.ts`](../worker/lifecycle/saved-script.ts):
  `savedScriptCommand`, which writes the org's install or startup script to
  a file and runs it with Bash.
- [Developer scripts](developer-scripts.md#key-code): the archive packager
  and the live check.

### Related Docs

- [Install in a build](install.md), [the private Node runtime](runtime.md),
  and [developer scripts](developer-scripts.md): the guides of this folder.
- [Workspace lifecycle](../worker/lifecycle/README.md): the builds, the
  start steps, and the git credential route.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the startup script, and the env vars.
- [Access and security](../docs/protocol/access-and-security.md): what a
  sandbox holds, GitHub tokens, and the terminal.
- [Architecture](../docs/architecture.md#sandbox-software): the sandbox
  software and its parts.
