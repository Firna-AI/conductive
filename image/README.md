# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it before it runs the org's install script. A software image build installs
it once for each app software version. A first org build from that image
also checks and installs the newest release. Without a matching ready software image,
the first build installs it itself. Later builds and refreshes install the newest release. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner and the
preview relay. It also
gives git a fresh GitHub token for each operation. The agent tools are not
in this folder yet. The folder also holds two
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
The [command dispatcher](conductive.sh) sends `update` to the Rust program.
Other commands use `/opt/conductive/agent-tools/conductive` with the release's private Node runtime.
Builds write that legacy launcher separately from the public command link.
The first startup bootstrap copies an existing launcher before apply replaces the link.

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

The Worker gives each workspace sandbox these variables at create and at
each resume, together with the org's env vars:

| Name | Value |
| --- | --- |
| `WORKSPACE_TOKEN` | The workspace token. |
| `CONDUCTIVE_WORKSPACE_ID` | The workspace ID. |
| `CONDUCTIVE_MACHINE_ORIGIN` | The origin of the machine hostname. |
| `CONDUCTIVE_DEFAULT_BRANCH` | The workspace base branch, with the repository default as a fallback. |
| `CONDUCTIVE_WORKSPACE_BRANCH` | The workspace branch that the app tracks, from the Worker's record of the workspace. |
| `CONDUCTIVE_REPOSITORY_DIR` | The folder of the workspace's repository, from the folder map that the workspace captured. |
| `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` | The folder of each repository of the image, with one variable for each repository. |
| `CONDUCTIVE_DISK_KEEPALIVE` | `1` in a disk retention restart, and `0` otherwise. |

The sandbox variables hold no value of an agent turn. The runner gives each
agent process the turn ID, `CONDUCTIVE_TURN_ID`, and the commit author of
the turn sender. A shell can load the sandbox variables again, as a login
shell does, and it then keeps these values. The Worker leaves out an org
env var with the name of one of these values. The
[commit author](github.md#commit-author) section says where Git gets the
owner's author outside a turn.

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

At a create, the Worker fetches the workspace base branch into its remote-tracking ref.
It creates the workspace branch at the event commit of an opened or pushed pull request run.
A missing event commit uses the fetched head.
Other creates start at the fetched head.
The branch's `gh-merge-base` Git setting names the workspace base. When the GitHub repository has no refs, the fetch step
first pushes an empty first commit to the default branch. That push gets
its token from the [git credential helper](#git-credentials), as every
other git operation does. At each create and each resume, the Worker then
runs the command of `workspaceStartupCommand`:

1. It writes the workspace owner's commit author to the Git system
   settings, as [Commit author](github.md#commit-author) says.
2. It writes the org's startup script to `/run/conductive/startup.sh`, with
   mode 600.
3. It runs the script with Bash in the repository folder, with the
   variables.
4. When the script succeeds, it starts a background bootstrap if the program is missing.
5. It writes `/run/conductive/workspace-ready` and restarts the runner service under the activation lock.

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
That mode writes the owner's commit author and runs the startup script,
but it writes no ready marker and does not restart the runner service.

Otherwise, `runner-start.sh` runs `runner/main.mjs` with the private
Node, in the repository folder. The runner unit restarts its service after
a failure. The terminal backend describes its launcher, its shell server,
its password, and its automatic restart in its
[README](../worker/terminal/README.md). That README also says how the
workspace shell keeps running when a terminal connection drops.

The preview relay runs in `conductive-preview-relay.service` as `user`.
Boat starts its enabled socket and service after each resume and fork.
The service requires `conductive-preview-relay.socket` to start first.
The socket holds `127.0.0.1:7682` while the service restarts.
Both units stay enabled, so the relay starts without waiting for a preview request.
Its start script runs `runner/relay.mjs` with the private Node.
It reads no workspace variable or workspace marker.
Its service restarts it after each exit.
A restart of the runner service does not restart the relay service.

Before it runs the runner, `runner-start.sh` sets three variables of the
runner's [configuration](../runner/README.md#configuration) from the table.
Each value replaces a saved variable of the same name.

| Runner variable | Value |
| --- | --- |
| `CONDUCTIVE_WORKSPACE_TOKEN` | `WORKSPACE_TOKEN` |
| `CONDUCTIVE_REPOSITORY` | `CONDUCTIVE_REPOSITORY_DIR` |
| `CONDUCTIVE_RUNNER_URL` | `CONDUCTIVE_MACHINE_ORIGIN` without a trailing slash, then the path of `MACHINE_PATHS.runner` |

The Worker gives no setting for the computer tools. Boat writes the entry
of the `computer` server into each sandbox at its start, and the runner
reads it, as [What it does](../runner/README.md#what-it-does) says.

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
- The helper never writes a token to its error output. From a Worker
  response, it writes only a safe error message, as
  [GitHub access](github.md#git-credential-helper) says.

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
  in the table, a build sandbox has only the folder variables.
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
