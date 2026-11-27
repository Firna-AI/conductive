# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it before it runs the org's install script. A software image build installs
it once for each app software version. A first org build from that image
also checks and installs the newest release. Without a matching ready software image,
the first build installs it itself. The software image lives in the `boat`
account, so the first build of an org on `e2b` starts from the
[E2B template](e2b/README.md) and installs the software. Later builds and
refreshes install the newest release. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner and the
preview relay. It also
gives git a fresh GitHub token for each operation. The release program also
supplies the workspace CLI and MCP server. The folder also holds [developer scripts](developer-scripts.md) that no build installs: release
packaging, a real-sandbox live check, and the E2B template builder.

## Responsibilities

- Install the pinned private Node after a check of its SHA-256 digest, or
  reuse it when the image already holds it.
- Install the newest release through the installed program, or through a
  verified bootstrap program when the image has none.
- Install and enable the systemd services of the agent runner and preview relay.
- Install and enable the preview relay's socket unit.
- Install the udev rule that stops disk flushes at each boot, as
  [Disk flushes](install.md#disk-flushes) says.
- Make the git credential helper the system credential helper of git.
- Install the GitHub CLI and its wrapper, which gets a fresh token for each command.
- Start no runner in a build sandbox. The service runs it only in a
  workspace sandbox.
- Start no service during installation.
- Package the system part on a developer machine or in the deploy workflow.
- Check the chat path and time the first agent start in a real sandbox.

The [terminal backend](../worker/terminal/README.md) supplies the terminal
script sources. The release packages those scripts and their units.
The build calls `terminalPackagesCommand()` for `ttyd` and `tmux` when the
image lacks a package, when the ttyd service is not masked, or when the apt
part changed.
The release installer owns the installed scripts and units.
It enables services and starts none.

## Conductive release files

Each deploy from `main` publishes a static `conductive` program and a
versioned parts file. The program embeds its release version and parts
list. The list holds `node`, `system`, and `sdk-helper`,
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

[The release in each deploy](../docs/deployment/runner-archive.md#the-release-in-each-deploy)
gives the exact keys and publication order. The
[release crate](../crates/cnd-release/README.md) gives local packaging commands.

## Release updates

[Release installation](install.md#release-installation) gives the command
sequence and the version layout. `conductive update check` stages a newer
release. `conductive update apply` activates a complete release locally.
The runner service executes `/opt/conductive/current/conductive runner`.
The Rust runner starts private Node only for the SDK helper.
The system installer links `/usr/local/bin/conductive` to
`/opt/conductive/current/conductive`. This Rust program supplies the workspace
CLI, the MCP server, the preview relay, Git credentials, and release updates.

`package-system.sh` builds a reproducible archive with the release units
from `release/`. It renders the start scripts with paths under
`/opt/conductive/current`. It generates terminal scripts from the existing
terminal module. The previous release keeps its own system part for fallback.
The terminal files are `terminal`, `terminal-attach`, `terminal-password`,
and `terminal-sessions`, plus the `terminal-bridge` folder.
The launcher embeds the attach program in ttyd's arguments at start.
An apply or rollback therefore changes no attach program of a running ttyd.

The runner service applies a staged release in its root pre-start step.
It applies only when `/run/conductive/workspace-ready` exists.
Relay and terminal restarts do not apply or roll back releases.
The terminal start command checks the running ttyd before it reports support
for several terminals. An updated file alone does not prove that support.
The system installer that an apply runs restarts a running relay, so the relay
runs the active release. The installer of an older release, which a rollback
can run, may not restart it.
The runner requests a background check after each start. `conductive-update-check.timer` also checks after
30 seconds of boot and every 10 minutes. The root check service runs the program
and then exits. No separate updater process remains resident.

The root `conductive-disk-hold.service` sets the hold when the sandbox
has a configured disk line. Its timer schedules a run 20 seconds after
boot and every five minutes. Its path unit runs the service when the
restore marker is created or touched. The timer covers a marker that
exists before the path unit starts.

A running runner also applies a staged release when its workspace is idle,
as the [runner service guide](../runner/service/README.md) describes. It
runs `update apply` through `sudo -n`, then executes the new
`current/system/runner-start.sh` in the same process. The service does not
restart. [Release installation](install.md#release-installation) says when
a changed runner unit applies. A runner without this step applies a release
only at its next start.
The relay and terminal processes keep their release until they start again.
A new terminal connection runs the bridge from `current` under the command
line of the running terminal service. So the bridge keeps its command-line
arguments compatible across releases.

The Rust runner calls `update started` only after its first valid Worker
`welcome`. A process start alone leaves the pending marker in place.
The next apply restores the previous release when confirmation did not occur.

## The private Node runtime

[The private Node runtime](runtime.md) gives the pinned Node release, its
paths, and its update steps.

## E2B base template

The [E2B template](e2b/README.md) supplies Ubuntu 24.04 and the software of
`BASE_IMAGE`, with 4 vCPU and 8192 MiB. Its developer builder uploads only
public image inputs and prints the actual template ID.
It installs a private TCP relay for web servers that listen on loopback.
An enabled systemd service seeds that relay under `/run` at boot.
The relay holds no credential. The template also supplies the `computer`
MCP server through Cua Driver 0.54.0, with Google Chrome, Xvfb, and Openbox
on display `:0`. Enabled services start the desktop and merge the computer
entry into `/home/user/.claude.json` at each boot. It supplies no desktop
stream. The [template guide](e2b/README.md#software-and-pins) gives the pins
and their sources.
Each org image build still installs the newest release of the sandbox
software, as on Boat.

## Install

[Install in a build](install.md) describes the verified bootstrap, release
layout, apt packages, and startup locking. Every org build and refresh uses
the release installer. The [software image backend](../worker/software-image/README.md)
uses the same command. A workspace downloads updates in the background. Its
runner applies them when the workspace is idle, or before a later runner
start. A workspace without the program gets it through the background
startup bootstrap.

## Start in a workspace

[Workspace startup](start.md#start-in-a-workspace) gives the sandbox variables,
startup command, service gates, and runner settings.

## Services

[Services](../docs/protocol/services.md) run outside every agent turn.
The image installs no project service unit. The runner's
[native manager](../crates/cnd-services/README.md) creates each unit at run
time through noninteractive sudo. Systemd sets its user and group to `user`
before the helper reads private command, folder, and environment data.
Its independent cgroup survives a runner restart. Its unit-owned writer
stores output under `/run/conductive/services`, with definitions and receipts.
No saved disk or org image holds these runtime files.

## Git credentials

[GitHub access](github.md) describes the git credential helper and the
GitHub CLI wrapper, their token rules, and their tests.

## Secrets

[Startup secrets](start.md#secrets) describes credentials, saved images,
start logs, runner events, and terminal passwords.

## Development

Run `cargo test -p cnd-cli --test update_tests` for release installation,
state retention, and fallback. Run `cargo test -p cnd-runner` for the
runner and its first-welcome confirmation.

Run `npm run test -- worker/chat/integration/runner-launcher.test.ts` for
the shared shell launcher. It renders the template in a temporary folder
and checks its Rust command, environment mapping, working folder, and gates.
A build, a disk retention restart, and an unfinished start launch no runner.

- Add release system files to `package-system.sh` and `install-system.sh`.
  The Worker downloads the release instead of staging individual files.
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
- [`runner-start.sh`](runner-start.sh) and
  [`conductive-runner.service`](release/conductive-runner.service): start the Rust runner and map its environment.
- [`preview-relay-start.sh`](preview-relay-start.sh), the
  [relay service](release/conductive-preview-relay.service), and
  [relay socket](conductive-preview-relay.socket): start the Rust preview relay with its inherited listener.
- [The terminal backend](../worker/terminal/service.ts): owns apt package installation and the workspace start hook.
- [Credential crate](../crates/cnd-credential/README.md): supplies the Rust Git credential helper and token mode.
- [`github-cli.sh`](github-cli.sh): gives the GitHub CLI a fresh token for each command.
- [`image-runtime.ts`](../worker/lifecycle/image-runtime.ts): the pinned
  Node release and its digest.
- [Release crate](../crates/cnd-release/README.md): the shared parts format
  and the program release packager.
- [`image-software.ts`](../worker/lifecycle/image-software.ts): composes the release install and workspace startup commands.
- [`software-release.ts`](../worker/lifecycle/software-release.ts): reads and validates release metadata.
- [`software-bootstrap.ts`](../worker/lifecycle/software-bootstrap.ts): verifies the bootstrap archive and separates background download from activation.
- [`saved-script.ts`](../worker/lifecycle/saved-script.ts):
  `savedScriptCommand`, which writes the org's install or startup script to
  a file and runs it with Bash.
- [Developer scripts](developer-scripts.md#key-code): the system packager
  and the live check.

### Related Docs

- [Install in a build](install.md), [the private Node runtime](runtime.md),
  and [developer scripts](developer-scripts.md): the guides of this folder.
- [Workspace lifecycle](../worker/lifecycle/README.md): the builds, the
  start steps, and the git credential route.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the startup script, and the env vars.
- [Services](../docs/protocol/services.md): the lifetime, the environment,
  and the logs of services.
- [Access and security](../docs/protocol/access-and-security.md): what a
  sandbox holds, GitHub tokens, and the terminal.
- [Architecture](../docs/architecture/components.md#sandbox-software): the sandbox
  software and its parts.
