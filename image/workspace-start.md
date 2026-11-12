# Start in a workspace

This guide belongs to the [sandbox software](README.md).

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
variables from `/run/ascii-secrets/env.sh`. Boat writes that file, and the
E2B adapter uses the same path. A systemd service does not get them in
another way. A Boat command process does not
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
other git operation does. At each create and each resume, the Worker then
runs the command of `workspaceStartupCommand`:

1. It writes the workspace owner's commit author to the Git system
   settings, as [Commit author](github.md#commit-author) says.
2. It writes the org's startup script to `/run/conductive/startup.sh`, with
   mode 600.
3. It runs the script with Bash in the repository folder, with the
   variables.
4. When the script succeeds, it writes the marker
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

The Worker gives no setting for the computer tools. On Boat, the provider
writes the `computer` server entry at each sandbox start. The E2B template
supplies no entry. The runner reads the optional entry, as
[What it does](../runner/README.md#what-it-does) says.
