# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it before it runs the org's install script. A software image build installs
it once for each app software version. A first org build from that image
also checks and installs the newest release. Without a matching ready software image,
the first build installs it itself. Later builds and refreshes install the newest release. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner and the
preview relay. It also
gives git a fresh GitHub token for each operation. The release program also
supplies the workspace CLI and MCP server. The folder also holds two
[developer scripts](developer-scripts.md) that no build installs: the
archive packager and the live check.

## Responsibilities

- Install the pinned private Node after a check of its SHA-256 digest, or
  reuse it when the image already holds it.
- Install the newest release through a verified bootstrap program.
- Install and enable the systemd services of the agent runner and preview relay.
- Install and enable the preview relay's socket unit.
- Install the udev rule that stops disk flushes at each boot, as
  [Disk flushes](install.md#disk-flushes) says.
- Make the git credential helper the system credential helper of git.
- Install the GitHub CLI and its wrapper, which gets a fresh token for each command.
- Start no runner in a build sandbox. The service runs it only in a
  workspace sandbox.
- Start no service during installation.
- Package the runner archive and its digest on a developer machine or in
  the deploy workflow.
- Check the chat path and time the first agent start in a real sandbox.

The [terminal backend](../worker/terminal/README.md) supplies the terminal
script sources. The release packages those scripts and their units.
The build calls `terminalPackagesCommand()` for `ttyd` and `tmux`.
The release installer owns the installed scripts and units.
It enables services and starts none.

## The runner archive

The lifecycle admission still captures an `ImageSoftwareArtifact`. It is the public
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

The runner archive is now a release part. The release program verifies its digest.

The Worker does not serve the archive. Admission and refresh scheduling still
read the two variables as stored job metadata. Installation reads the newest
release JSON instead.

## Conductive release files

Each deploy from `main` also publishes a static `conductive` program and a
versioned parts file. The program embeds its release version and parts
list. The list holds the runner archive, the private Node archive, and the system archive,
with each part's URL and SHA-256 digest. Node stays at `nodejs.org`.

The program archive and the parts file have digest-named paths. The
newest-version JSON at
`https://runner.conductive.build/releases/latest/conductive/x86_64-unknown-linux-musl`
holds the absolute program archive URL and its digest. Its cache time is
60 seconds. The deploy replaces it only for a higher version, after the
release files pass their public size checks. The release version is
`0.0.<commit count of main>`. The Worker fetches this JSON when it composes a build or startup command.
`CONDUCTIVE_RELEASE_SERVER` overrides the base URL. Builds install through
the verified program. A workspace without it receives a background bootstrap
at its next normal start. A failed startup lookup warns and keeps startup running.

[The archive in each deploy](../docs/deployment/runner-archive.md#the-archive-in-each-deploy)
gives the exact keys and publication order. The
[release crate](../crates/cnd-release/README.md) gives local packaging commands.

## Release updates

[Release installation](install.md#release-installation) gives the command
sequence and the version layout. `conductive update check` stages a newer
release. `conductive update apply` activates a complete release locally.
The runner remains the Node program from the runner part.
The system installer links `/usr/local/bin/conductive` to
`/opt/conductive/current/conductive`. This Rust program supplies the workspace
CLI, the MCP server, and release updates.

`package-system.sh` builds a reproducible archive with the release units
from `release/`. It renders the start scripts with paths under
`/opt/conductive/current`. It generates terminal scripts from the existing
terminal module. The legacy units remain for tests of older installed software.

The root oneshot `conductive-update-apply.service` runs before the runner
and relay. Its workspace-ready condition prevents a boot without workspace
settings from consuming a pending update. The runner requests a background
check after each start. `conductive-update-check.timer` also checks after
30 seconds of boot and every hour. The root check service runs the program
and then exits. No separate updater process remains resident.

`conductive-update-confirm.service` runs after the runner start. It checks
that systemd reports the runner active before it calls `update started`.
A runner that exits before that check leaves pending for fallback.
This check confirms the local service start, not its Worker connection.

## The private Node runtime

[The private Node runtime](runtime.md) gives the pinned Node release, its
paths, and its update steps.

## Install

[Install in a build](install.md) describes the verified bootstrap, release
layout, apt packages, and startup locking. Every org build and refresh uses
the release installer. The [software image backend](../worker/software-image/README.md)
uses the same command. A workspace downloads updates in the background and
applies them before a later runner start. A workspace without the program
gets it through the background startup bootstrap.

## Start in a workspace

[Workspace startup](start.md#start-in-a-workspace) gives the sandbox variables,
startup command, service gates, and runner settings.

## Git credentials

[GitHub access](github.md) describes the git credential helper and the
GitHub CLI wrapper, their token rules, and their tests.

## Secrets

[Startup secrets](start.md#secrets) describes credentials, saved images,
start logs, runner events, and terminal passwords.

## Development

Run the installer tests with
`npm run test -- worker/lifecycle/image-runtime.test.ts worker/lifecycle/image-software.test.ts`.
They run the shipped scripts with local archives and a fake `curl`.

Run the start script test with
`npm run test -- worker/chat/integration/runner-launcher.test.ts`. It renders the shared start template in a temporary folder under
`.context/`, and runs `runner-start.sh` with `/bin/sh`. It checks
the settings that the runner configuration reads, and that the script uses
the private Node, not a `node` on the path. It also checks that a
build, a disk retention restart, and an unfinished start start no runner.

- Add release system files to `package-system.sh` and `install-system.sh`.
  The Worker downloads the release instead of staging individual files.
- Start Node in shared templates as `@CONDUCTIVE_NODE@`.
  The release packager renders the path under the version folder.
- `runner-start.sh` holds `@RUNNER_PATH@`.
  The release packager replaces it with `MACHINE_PATHS.runner`.
  Run only a rendered copy.
- Keep each start script safe to run in a build sandbox. Of the variables
  in the [startup table](start.md#start-in-a-workspace), a build sandbox has only the folder variables.
  The relay needs none of them.
- [Developer scripts](developer-scripts.md#development) gives the checks of
  the developer scripts.

### Key Code

- [`package-system.sh`](package-system.sh): packages the scripts and release units as a digest-named archive.
- [`install-system.sh`](install-system.sh): installs the active release system files without starting a unit.
- [Update engine](../crates/cnd-cli/README.md): stages downloads and applies or restores releases.
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
- [The terminal backend](../worker/terminal/service.ts): owns apt package installation and the workspace start hook.
- [`git-credential-helper.sh`](git-credential-helper.sh) and
  [`git-credential-helper.mjs`](git-credential-helper.mjs): the git
  credential helper.
- [`github-cli.sh`](github-cli.sh): gives the GitHub CLI a fresh token for each command.
- [`image-runtime.ts`](../worker/lifecycle/image-runtime.ts): the pinned
  Node release, its digest, and its paths.
- [Release crate](../crates/cnd-release/README.md): the shared parts format
  and the program release packager.
- [`image-software.ts`](../worker/lifecycle/image-software.ts): composes the release install and workspace startup commands.
- [`software-release.ts`](../worker/lifecycle/software-release.ts): reads and validates release metadata.
- [`software-bootstrap.ts`](../worker/lifecycle/software-bootstrap.ts): verifies the bootstrap archive and separates background download from activation.
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
