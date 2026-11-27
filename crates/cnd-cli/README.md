# cnd-cli

This crate builds `conductive`, the command line program for Conductive
cloud computers. Use the executable to access its commands. This crate
also exposes the update engine through a library API.

## Responsibilities

Provide one command entry point for the agent runner, preview relay, MCP
server, Git credential helper, software updates, disk hold, and workspace tools.

## What This Crate Does

The program parses command names with `clap`. `--help` and `--version`
work without runtime credentials.

`--version` prints the version embedded at build time. A deploy sets
`CONDUCTIVE_RELEASE_VERSION` to `0.0.<commit count>` and
`CONDUCTIVE_PARTS_FILE` to an absolute path to its parts JSON. Set both
variables together. The build validates the version and the parts with
`cnd-release`, then embeds both in the program. A build without the
variables uses `0.0.0-dev` and an empty parts list. This development version
sorts below every release.

The commands are `runner`, `relay`, `mcp`, `git-credential`, `update`, `disk`,
`workspaces`, `sessions`, `messages`, `sections`, `repositories`, `models`,
`previews`, `mac`, `secrets`, and `services`. The workspace commands and
`mcp` run 27 Worker calls and five local service calls in
[cnd-tools](../cnd-tools/README.md). They preserve the Worker replies and
refusal codes. `relay` serves previews through [cnd-relay](../cnd-relay/README.md).
`secrets list` returns metadata only. `secrets run --secret NAME -- <command>`
puts approved values only in that command's environment. It keeps stdin,
filters exact copies from stdout and stderr, and returns the child's exit status.
`git-credential` supplies fresh GitHub tokens through
[cnd-credential](../cnd-credential/README.md). The installed
`conductive-git-credential` executable name selects that subcommand.
Workspace tools and Git credentials use one native saved-settings reader. It reads the saved
`WORKSPACE_TOKEN` and supplies each crate's `Environment` boundary.
Workspace tools keep explicit runtime values ahead of saved values.
The credential helper keeps the caller's turn ID even when the file has another turn.
`runner` starts the full [Rust runner](../cnd-runner/README.md). It uses the
[runner configuration](../../runner/configuration.md), plus optional
`CONDUCTIVE_NODE` and `CONDUCTIVE_SDK_HELPER` path overrides. Installed builds
resolve Node and the helper beside the running release executable. Local
builds use `node` and `dist/sdk-helper/sdk-helper.mjs` in the working folder.
SIGTERM and SIGINT end live turns, save pending events, and close the connection.
They end no service unit. One native service manager and its private socket
stay shared across runner rounds. A new runner reconciles saved runtime
records with actual units. The hidden `service-exec` entry owns each unit's
child and rotating output writer as `user`.
The installed service runs this Rust runner. Its first valid welcome confirms
the release through the pinned executable. It keeps the Node-format state file.

The runner checks downloaded releases through the updater's `DiskStore`.
After an idle swap result, it runs its own pinned executable as
`sudo -n -- <executable> update apply` with no standard input.
It then checks `current` again. A newer release replaces the runner through
`current/system/runner-start.sh` with the same process ID.
An unchanged release starts a fresh connection and fresh handlers on the
running version. A failed activation also reconnects when `current` still names
the running release and no pending marker exists.
`runner` makes one process-start ID when the program starts, as
[Process starts](../../docs/protocol/runner-warnings.md#process-starts) says.
Each fresh connection and each set of fresh handlers of that program keep it.
A newer release that replaces the runner makes a new ID, although the process
ID stays the same. Each process attempts only
one idle update. A reconnect after that attempt disables further idle updates
until the next service start. Failed activation after a state change, or failed
execution, exits for the service's existing restart and rollback path.

A relocation result points the configuration at the folder and branches of
the `repository.move` command. The runner then starts fresh handlers in the
same process, with no update attempt. Each round gives its helper the
`CONDUCTIVE_REPOSITORY`, `CONDUCTIVE_REPOSITORY_DIR`,
`CONDUCTIVE_DEFAULT_BRANCH`, and `CONDUCTIVE_WORKSPACE_BRANCH` values of
its configuration, so agent commands get the new folder. A later process
start reads the start variables again.
A shutdown received during activation prevents execution of the new release.
Development builds disable idle swaps.

`update check` uses `cli-updater` to read and compare the newest release.
It downloads into a private version folder. It checks the program digest
through `cli-updater` and checks every part digest before extraction.
It reuses present parts with the same digest. A failed check logs a
warning and returns failure. The independent background unit cannot block a start.
It leaves no complete version on failure. A concurrent background check returns a busy error.
An installation check with `--bootstrap` waits for the download lock.
Downloads have a one-hour total timeout and a ten-second connect timeout.

`update apply` switches to the newest complete version and installs its
system files. First it checks that each part of the version that starts
is present. In a fallback, that version is the previous release. A part
is present when its folder has the complete marker and the entry files of
its role, such as `bin/node` or `runner-start.sh`. When a part is missing,
apply downloads that part again with the digest check of `update check`.
The repair takes no download lock. Each unpack, by a check or by apply,
writes into a private folder. `part-publish.lock` covers only the last
presence check and the rename, so a part that is present stays, and a
background check delays a repair only for one rename. Each missing part
gets an equal share of what is left of 60 seconds. A failed download, or
a download that uses up its share, logs a warning with the part name.
The next part still gets its attempt, and apply goes on. The next apply
tries again. When no part is missing, apply uses no network. When the
installer of a fallback fails, apply sets `current` back to the failed
release and keeps its pending marker, so the next start runs the same
updater again. It leaves a pending marker until
`update started` confirms the runner start. Confirmation checks this executable's
version against current and pending. A different version changes nothing.
A later apply with that marker restores the previous version and its system files. A persistent rejection
record prevents that version from downloading or applying again after collection.
Collection runs after confirmation and retains current, previous, and the release that the next apply selects.
It reads that set under the download lock. It waits for no download.
Collection defers when a check holds the download lock.

All update operations accept `--root PATH` and `--server URL`.
The defaults are `/opt/conductive` and `https://runner.conductive.build`.
Checks, apply, and confirmation run as root in an installed sandbox.
`update parts` prints this program's embedded parts as JSON.
`update parts` fails for a release build whose list lacks Node, the SDK helper, or system files.
Development builds keep their empty list. Older updaters use the new program's
check and accept added JSON fields.
`update check --bootstrap` stages the first release when the bootstrap
program already has the newest version. An existing active release still
prevents a downgrade. See [the install guide](../../image/install.md#release-installation)
for the image-build sequence and the folder layout.

### Workspace disk hold

`conductive disk hold` runs as root. It reads
`CONDUCTIVE_DISK_LINE_BYTES` from its environment or from the saved
exports in `/run/ascii-secrets/env.sh`. The line sets where root writes
stop, in bytes used on the root filesystem. The command skips the hold if the
line is absent or the root filesystem uses a type other than ext4.

On ext4 it uses the default hold of 4,096 clusters until the
`/run/conductive-terminal/restore-ended` marker exists. It then sets
`reserved_clusters` from the line and the free space on `/`. When disk
usage is above the configured line, the command can save a higher line in
`/var/lib/conductive/disk-line`. The saved line can fall as space returns.
When usage is at or below the configured line, the command removes the
saved line.

`conductive disk release` runs as root and restores 4,096 reserved
clusters on every ext4 device. Both commands report a failure in one
line on standard error and return a non-zero exit status.

### Session watches

`conductive sessions watch --session ID [--workspace ID] [--turn-id ID]`
and MCP `watch_session` ask for one wake when one turn finishes, fails, or stops.
Use the actual session and exact `turnId` returned with the work, when available.
The call returns at once. Set the watch, then end the reply when only that work remains.
After a wake, use `read_session` for the result.
An idle or ended reply means read it at once.
A turn end does not mean the whole delegated task is complete.
[Session watches](../../tools/calls.md#session-watches) gives targeting, replies, and Stop behavior.

## Quick Start

Run these commands from the repository root:

```sh
cargo run -p cnd-cli -- --help
cargo run -p cnd-cli -- --version
cargo run -p cnd-cli -- update --help
cargo run -p cnd-cli -- update parts
cargo run -p cnd-cli -- disk --help
```

`update parts` prints the embedded parts without a network request.

To create a workspace from a branch and target another branch:

```sh
cargo run -p cnd-cli -- workspaces create --repository repo-id --message 'Build the next change.' \
  --start-branch feature/review --base-branch main
```

[Workspace tool calls](../../tools/calls.md#workspaces) gives the branch defaults and replay rules.

## Development

Run these commands from the repository root:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli
```

The musl build needs a C compiler for musl. On Ubuntu, install the
`musl-tools` package. The release program is
`target/x86_64-unknown-linux-musl/release/conductive`.

### Key Code

- [main.rs](src/main.rs) connects command parsing, error output, and exit status.
- [cli.rs](src/cli.rs) owns `Cli` and the command execution boundary.
- [command.rs](src/command.rs) defines the command families and reserved arguments.
- [disk_command.rs](src/disk_command.rs) connects the disk commands to the root filesystem.
- [error.rs](src/error.rs) defines typed command errors and the internal error fallback.
- [build.rs](build.rs) validates and embeds the release inputs.
- [release.rs](src/release.rs) reads the embedded version and parts.
- [update/engine.rs](src/update/engine.rs) owns download, activation, and fallback policy.
- [update/repair.rs](src/update/repair.rs) downloads the missing parts of the release that apply starts.
- [update/presence.rs](src/update/presence.rs) says when an unpacked part counts as present.
- [update/ports.rs](src/update/ports.rs) defines disk, process, and updater boundaries.
- [update/disk.rs](src/update/disk.rs) stores complete versions and locks.
- [update_tests.rs](tests/update_tests.rs) checks real files and local HTTP downloads.
- [runner_command.rs](src/runner_command.rs) makes one `RunnerStart` before its reconstruction loop, and composes the full runner and graceful shutdown.
- [runner_round.rs](src/runner_round.rs) composes each runner round, negotiates its private service transport, and updates display context without blocking a move on native work.
- [runner_services.rs](src/runner_services.rs) composes the one native manager and private socket.
- [service_command.rs](src/service_command.rs) runs the unit-owned execution and output helper.
- [runner_start.rs](src/runner_start.rs) owns `RunnerStart`, which makes the process-start ID and gives it to each `SavedRunnerLink`.
- [runner_update/idle.rs](src/runner_update/idle.rs) shares one idle update attempt across fresh runner instances and disables readiness afterward.
- [runner_update/releases.rs](src/runner_update/releases.rs) checks complete releases and running-release confirmation through `DiskStore`.
- [runner_update/swap.rs](src/runner_update/swap.rs) applies a release and checks whether to reconnect or exec the current launcher.
- [runner_update/process.rs](src/runner_update/process.rs) runs noninteractive sudo and replaces the process without changing its ID.
- [sandbox_command.rs](src/sandbox_command.rs) composes the relay and credential runtimes.
- [tool_command.rs](src/tool_command.rs) composes the workspace CLI and MCP runtime.
- [environment.rs](src/environment.rs) reads saved shell settings for tools and credentials.
- [relay_start_tests.rs](tests/relay_start_tests.rs) executes the relay start script with a fake program.
- [system_install_tests.rs](tests/system_install_tests.rs) executes the system installer with stub commands and checks the relay restart.
- [cli_tests.rs](src/_tests_/cli_tests.rs) checks relay argument parsing.
- [secret_command_tests.rs](tests/secret_command_tests.rs) checks the native secret routes, turn header, and filtered CLI streams.

### Related Docs

- [Architecture](../../docs/architecture.md) describes the system components.
- [Agent runner](../../docs/protocol/agent-runner.md) defines the runner contract.
- [Runner warnings](../../docs/protocol/runner-warnings.md) defines the process-start ID.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md) defines cloud computer behaviour.
- [Workspace tools](../../tools/README.md) describes the workspace command interface.
