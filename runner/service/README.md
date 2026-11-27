# Runner service

The [agent runner](../README.md) runs as an unprivileged systemd service.
The [release installer](../../image/install.md#release-installation) installs
its unit. Installation enables services and starts none.

Boat restarts the enabled services after each resume and fork. On E2B,
each create and each resume boots the sandbox from its disk, and systemd
starts the enabled services. So the runner starts in each sandbox that
starts from the org image.

The unit is [conductive-runner.service](../../image/release/conductive-runner.service).
It runs as `user`, after the network and the local update-apply unit.
Its launcher is [runner-start.sh](../../image/runner-start.sh).
The launcher loads recorded repository folder variables after the start settings.
The launcher loads `/run/ascii-secrets/env.sh`, the file of the variables
of the sandbox. Boat writes it on Boat, and the Worker writes it on E2B at
each create and resume. The launcher then checks the workspace-ready
marker, workspace identity, and disk-retention setting.
It maps sandbox settings to the [runner configuration](../configuration.md).
It then runs `/opt/conductive/current/conductive runner` in the repository folder.

The Rust executable selects its private Node and SDK helper from its own
resolved release folder. Agent children cannot mix parts after `current` changes.
The state file stays at `~/.conductive/runner-state.json` across release changes.
The Rust reader accepts the Node state format.

The runner requests a background update check after each start.
The check timer also runs after boot and every 10 minutes.
A start never waits for the download of a newer release.
A start downloads only a missing part of the release that it starts, as the
[cnd-cli README](../../crates/cnd-cli/README.md) says.
The next start applies a complete newer release before the runner works.

While it runs, the runner also installs a complete newer release when its
workspace is idle, as
[Installs at idle](../../docs/protocol/sandbox-software.md#installs-at-idle) says.
It installs only when its own release is confirmed and the newer release is not rejected.
It closes its connection, then closes its helper processes and saves its state, as at SIGTERM.
It runs its executable's `update apply` through noninteractive sudo.
When `current` then names the newer release, it executes the new
`/opt/conductive/current/system/runner-start.sh` in the same process.
The service does not stop, so systemd stops no process of the service group.
When `current` did not change, the runner warns and connects again on its release.
[Release installation](../../image/install.md#release-installation) says when a
changed runner unit applies.

A new runner confirms its release only after its first valid `welcome`.
Its startup hook calls the resolved executable's `update started` through
noninteractive sudo. A process start alone clears no pending marker.
A later apply restores the previous executable and system files when a
new release remains unconfirmed. That previous release can still run Node.

The service restarts after failure, with a two-second delay.
So after an idle install, a new release that exits at its start restarts the service.
That restart stops each process of the service group, and its pre-start apply restores the previous release.
SIGTERM closes helper processes and ends running turns before the connection closes.
`KillMode=control-group` keeps its child processes in the service group.
`OOMPolicy=continue` keeps the service running when the kernel ends one of
those processes for lack of memory, as
[Out of memory](../../docs/protocol/agent-runner.md#out-of-memory) says.
The default policy, `stop`, would stop the service and end every running turn.

The [native manager](../../crates/cnd-services/README.md) runs each
[service](../../docs/protocol/services.md) in an independent system unit.
A stop, a restart, or a failed start of the runner ends no service.
Each service unit uses `User=user`, `Group=user`, `KillMode=control-group`,
`OOMPolicy=stop`, and `Restart=no`. Its user-side helper owns output pipes
and rotating logs. Standard output and error go to runtime files, not the journal.
A memory kill stops that service only, as
[Out of memory](../../docs/protocol/services.md#out-of-memory) says.
[Workspace startup](../../image/start.md) gives the build and retention gates.
