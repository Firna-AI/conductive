# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it into the org image before it runs the org's install script. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner and the
preview relay. It also
gives git a fresh GitHub token for each operation. The agent tools are not
in this folder yet. The folder also holds
[developer scripts](developer-scripts.md) that no build installs: the
archive packager, the live check, and the E2B template builder.

## Responsibilities

- Install the pinned private Node after a check of its SHA-256 digest, or
  reuse it when the image already holds it.
- Install the runner archive after a check of its SHA-256 digest.
- Install and enable the systemd services of the agent runner and preview relay.
- Install and enable the preview relay's socket unit.
- Make the git credential helper the system credential helper of git.
- Install the GitHub CLI and its wrapper, which gets a fresh token for each command.
- Start no runner in a build sandbox. The service runs it only in a
  workspace sandbox.
- Start no service during installation.
- Package the runner archive and its digest on a developer machine or in
  the deploy workflow.
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

The archive must hold these programs:

- `runner/main.mjs`: the agent runner, with its SDK dependencies.
- `runner/relay.mjs`: the preview relay, with no npm dependency.

Both programs use the [private Node runtime](runtime.md).
The archive holds no Node runtime.

Put no credential in the URL or in the archive. Each saved snapshot keeps
the unpacked archive.

[`package-runner.mjs`](package-runner.mjs) makes the archive on a
developer machine or in the deploy workflow, as
[Developer scripts](developer-scripts.md#package-the-archive) says. It
writes the URL and the digest of the archive to `<archive>.json`. Its
`--base-url` option names the URL after the digest of the archive. The
deploy workflow uses that option.

Each deploy from `main` publishes the archive of its commit when the
archive is new. It sets both variables to that archive, as
[Deployment inputs](../docs/deployment.md#the-archive-in-each-deploy)
says. To supply an archive by hand:

1. Publish the exact archive at its URL, on a public HTTPS host.
2. Set the Worker variables `CONDUCTIVE_RUNNER_ARCHIVE_URL` and
   `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` to that URL and the matching digest,
   as [Deployment inputs](../docs/deployment.md#the-runner-archive) says.
   `<archive>.json` holds both.

A build fails when the file at the URL does not match the digest. So a
versioned URL for each archive is a good choice.

The Worker does not serve the archive. Image builds and refreshes read the
two variables.

## The private Node runtime

[The private Node runtime](runtime.md) gives the pinned Node release, its
paths, and its update steps.

## E2B base template

The [E2B template](e2b/README.md) supplies Ubuntu 24.04 and the software of
`BASE_IMAGE`, with 4 vCPU and 8192 MiB. Its developer builder uploads only
public image inputs and prints the actual template ID.
It installs a private TCP relay for web servers that listen on loopback.
An enabled systemd service seeds that relay under `/run` at boot.
The relay holds no credential and supplies no computer tools.
Each org image still installs the shared runner and terminal software.

## Install

[Install in a build](install.md) describes the software step of each image
build: the staged scripts, the private Node, and the steps of `install.sh`.
A refresh skips that step.
A workspace gets the relay only from a new image build.
An existing workspace keeps the software of its image, also after a resume.
Start a new workspace from the new image to get the relay.

## Start in a workspace

[Workspace startup](workspace-start.md) gives the variables, startup steps,
service gates, and preview relay behavior for the installed software.

## Git credentials

[GitHub access](github.md) describes the git credential helper and the
GitHub CLI wrapper, their token rules, and their tests.

## Secrets

- A build sandbox starts with no org env vars and no workspace token. It
  gets only the folder variables, which hold no secret. So no saved
  snapshot holds a secret of a workspace.
- The Worker gives each read token only to the Git command that copies its
  repository. The Worker revokes it before the build goes on, as
  [GitHub tokens](../docs/protocol/tokens-and-secrets.md#github-tokens)
  says. The software step and the install script run only after that.
- The workspace object keeps the env values and output chunks of a start
  only in encrypted form. Before it returns a start log, it masks the
  complete joined stdout and stderr with the marked env values and workspace
  token. This hides a value across chunks and across the stdout and stderr boundary.
- The workspace object filters runner events with the marked env values
  from the actual start capture before it checks their meaning, stores
  them, or sends them. This applies to older installed runners too.
  The runner masks workspace tokens and logins. It receives no separate
  org-value list, so its local state can keep raw org values. Real paths
  and base refs stay available for operations. Separate labels are masked.
- The terminal password stays in `/run/conductive-terminal/password`, with
  mode 600. The terminal backend checks that it has 64 lowercase
  hexadecimal characters.
  The readiness command writes no password to output or command history.
- The helper never writes a token or the Worker's response to its error
  output.

## Development

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
  The relay needs none of them.
- [Developer scripts](developer-scripts.md#development) gives the checks of
  the developer scripts.

### Key Code

- [`install-runtime.sh`](install-runtime.sh): installs the private Node.
  Its arguments are the download URL, the digest, and the version folder.
- [`install.sh`](install.sh): installs the runner archive, its service,
  the relay service and socket, and the git helper.
  Its arguments are the archive URL and the digest.
- [`runner-start.sh`](runner-start.sh) and
  [`conductive-runner.service`](conductive-runner.service): start the agent
  runner, and map the sandbox variables to the runner variables.
- [`preview-relay-start.sh`](preview-relay-start.sh) and
  [`conductive-preview-relay.service`](conductive-preview-relay.service):
  start the preview relay with the private Node.
- [`conductive-preview-relay.socket`](conductive-preview-relay.socket):
  holds the relay port and passes its listener to the relay service.
- [The terminal backend](../worker/terminal/service.ts): owns the terminal
  install command, its two services, and its workspace start hook.
- [`git-credential-helper.sh`](git-credential-helper.sh) and
  [`git-credential-helper.mjs`](git-credential-helper.mjs): the git
  credential helper.
- [`github-cli.sh`](github-cli.sh): gives the GitHub CLI a fresh token for each command.
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
- [Architecture](../docs/architecture/components.md#sandbox-software): the sandbox
  software and its parts.
