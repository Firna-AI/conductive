# cnd-services

This crate runs the local services of a Conductive cloud computer.
The runner owns its manager and private Unix socket.
Depend on it for native service execution or its local request transport.
`cnd-runner-interface` owns the shared service contracts.

## Responsibilities

- Serialize Start, Stop, and Restart against private runtime records.
- Run each service and output writer as `user` in a separate system unit.
- Reconcile actual units after a runner restart without replaying a mutation.
- Keep definitions, receipts, process results, and rotating logs under `/run`.
- Read owned listeners through the runner's existing eligibility rules.

## What This Crate Does

One exact name identifies one service. A running Start keeps its saved
definition. A nonrunning Start replaces it. Restart uses the saved command,
folder, explicit values, and original turn context.
Controls name the observed boot, service, and generation.
Saved request receipts prevent repeated delivery from launching another run.
A failed or unfinished reply never causes an automatic retry.

`SystemUnits` starts the currently available `conductive service-exec`
helper through noninteractive sudo. Systemd changes its user and group to
`user` first. The helper reads argv, folder, and environment from a private
runtime record. Repository text is never privileged shell code.
Each unit has `OOMPolicy=stop`, `KillMode=control-group`, and no retry.
Its stdout and stderr go to the helper's rotating runtime log, not journald.
The helper and pipes survive a runner restart.

The environment comes from an isolated read of frozen startup settings,
basic user/project variables, and explicit values. It inherits no caller
environment. Fixed app credentials and turn context are removed.
Arbitrary org keys and installed repository paths stay available.
Explicit values are local inputs and never appear as a result map.

Start returns promptly unless it waits for the first or a named owned port.
The wait ends after 30 seconds and never stops a running service.
Local Logs returns the complete retained source, with no app excerpt cut.
The log spans runs of the same service and retains at most 10 MiB in total.
Reads join retained bytes before one UTF-8 decode.

The socket is `/run/conductive/services/control.sock`, with mode `0600` in
a `0700` directory. The runtime registry has an exclusive manager lock.
No call needs a workspace token or an active turn. No call records activity.
`RunnerServices` adapts this same manager to the runner-owned private transport.
An accepted connection gets a full snapshot with a higher persisted revision.
Log IO releases the registry lock and rechecks its observed run afterward.
Ordinary port enrichment skips a busy manager and keeps its numeric rows and labels.

## Quick Start

With the runner of this release running in the cloud computer:

```sh
conductive services start --name web -- npm run dev
conductive services list
conductive services logs --name web
conductive services stop --name web
conductive services restart --name web
```

The [tool guide](../../tools/services.md) gives CLI flags and MCP fields.

## Development

Run from the repository root:

```sh
cargo test -p cnd-services
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

Unit tests use `unimock` for units, files, time, environment, and listeners.
Native settings tests read temporary files and check the saved settings
with a present, missing, or unreadable repository folder record.
Real systemd and command behavior needs a native smoke check.

### Key Code

- [Manager](src/manager/state.rs) defines `ServiceManager`, its shared lock, and injected effects.
- [Start](src/manager/start.rs) saves definition identities before launch and keeps running names unchanged.
- [Controls](src/manager/control.rs) saves durable receipts before Stop and Restart effects.
- [Reconciliation](src/manager/reconcile.rs) combines actual units and helper results without replaying a launch.
- [Snapshots](src/manager/calls.rs) keeps ordinary observations stable and persists a higher revision for a newly accepted connection.
- [Log requests](src/manager/logs.rs) reads outside the registry lock and refuses a replaced run's output under an old target.
- [Runner adapter](src/runner.rs) implements the runner's private effects over the same local manager and current display root.
- [Readiness](src/manager/readiness.rs) waits for owned ports while releasing the registry lock between observations.
- [System units](src/systemd.rs) uses fixed system-manager arguments and the current helper executable.
- [Helper](src/helper.rs) owns process execution, output pipes, and completion records inside the service unit.
- [Runtime files](src/files.rs) stores private definitions, results, registry state, and the manager lock.
- [Logs](src/logs/rotating.rs) applies rotating retention through locked file effects.
- [Environment](src/environment.rs) keeps frozen org values and removes fixed app/turn context.
- [Native settings](src/settings.rs) reads saved settings with an empty inherited environment and adds the recorded repository folder variables.
- [Ownership](src/ownership.rs) matches eligible listeners to the exact cgroup and its descendants.
- [Port reports](src/port_reports.rs) adds ownership without suppressing ordinary ports when service lookup fails.
- [Socket server](src/socket/server.rs) exposes the single manager to local callers.
- [Socket client](src/socket/client.rs) sends each local request once without a retry.

### Related Docs

- [Services](../../docs/protocol/services.md)
- [Service calls](../../docs/protocol/service-calls.md)
- [Service reports](../../docs/protocol/service-reports.md)
- [Runner](../cnd-runner/README.md)
- [Command](../cnd-cli/README.md)
- [Workspace tools](../cnd-tools/README.md)
