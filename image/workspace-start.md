# Start in a workspace

This page belongs to the [sandbox software](README.md) guide.

The Worker gives each workspace sandbox these variables at create, at each
resume, and at an import activation, together with the org's env vars:

| Name | Value |
| --- | --- |
| `WORKSPACE_TOKEN` | The workspace token. |
| `CONDUCTIVE_WORKSPACE_ID` | The workspace ID. |
| `CONDUCTIVE_MACHINE_ORIGIN` | The origin of the machine hostname. |
| `CONDUCTIVE_DEFAULT_BRANCH` | The workspace base branch, with the repository default as a fallback. |
| `CONDUCTIVE_WORKSPACE_BRANCH` | The workspace branch that the app tracks, from the Worker's record of the workspace. |
| `CONDUCTIVE_REPOSITORY_DIR` | The folder of the workspace's repository, from the folder map that the workspace captured. |
| `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` | The folder of each repository of the image, with one variable for each repository. |
| `CONDUCTIVE_TURN_ID` | Empty. The runner sets it for each agent process. |
| `CONDUCTIVE_ACTIVATION_ID` | Empty. The runner sets it only for the Git and LFS processes of an import restore. Agent processes never get it. |
| `CONDUCTIVE_DISK_KEEPALIVE` | `1` in a disk retention restart, and `0` otherwise. |
| `GIT_AUTHOR_NAME` | The workspace owner's commit author name. The runner replaces it with the turn sender's name for each agent turn. |
| `GIT_AUTHOR_EMAIL` | The workspace owner's GitHub no-reply address. The runner replaces it with the turn sender's address for each agent turn. |
| `GIT_COMMITTER_NAME` | The workspace owner's commit author name. The runner replaces it with the turn sender's name for each agent turn. |
| `GIT_COMMITTER_EMAIL` | The workspace owner's GitHub no-reply address. The runner replaces it with the turn sender's address for each agent turn. |

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
its token from the [git credential helper](README.md#git-credentials), as every
other git operation does. A create that continues an existing branch fetches
that branch in place of the base branch. It checks the branch out with
tracking, and writes no `gh-merge-base` setting. At each create and each
resume, the Worker then
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

## An import activation

The first activation of an imported workspace runs its own commands, in
this order, as [Import activation](../worker/lifecycle/import-activation.md#the-phases)
says:

1. The workspace tools command and `installImageSoftware` of the runner
   archive of the current deploy, as [Install](install.md) says.
2. `workspaceRunnerLaunch` writes the attempt ID to
   `/home/user/.conductive/import-pending`, writes the ready marker, and
   restarts the runner service. So the runner starts before the startup
   script, and it restores the work.
3. After the restore, `workspaceStartupBody` runs the startup script, with
   no second runner launch.

Only that activation installs software at a start. A create, a resume, and a
disk retention restart keep `workspaceStartupCommand`, and the org image
keeps its runner.
