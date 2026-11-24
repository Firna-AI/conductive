# cnd-host

This crate runs the outbound machine host connection of Conductive.
The `host` command of `conductive` composes it as an unprivileged system
service. Depend on it for the host runtime or its replaceable native effects.
`cnd-runner-interface` owns the host wire contract.

## Responsibilities

- Authenticate the outbound TLS WebSocket with the saved machine token.
- Negotiate the host version and reconnect after each connection failure.
- Run commands, keep detached command records, and read bounded files.
- Relay streams to the terminal and preview relay with byte credit.
- Keep credentials out of the process environment, child environments, and replies.

## What This Crate Does

The host reads the machine origin and token from `/run/ascii-secrets/env.sh`
through an isolated shell before each connection attempt. It waits while
either value is missing. It connects to the host route with Rustls and
public WebPKI roots. The bearer header is sensitive.
Each connection attempt has a 60-second deadline, then takes the normal
retry path. The command-line program installs the `aws-lc-rs` Rustls
provider before it starts the host or runner.
Tracing reports settings availability changes, connection failures, numeric
HTTP or close codes, protocol errors, and each successful welcome.
Diagnostics contain no token, Authorization header, command, or peer error text.

A hello precedes every welcome and operation. Ping and inactivity timers
run independently of command execution and reply writes. A welcome resets
the retry delay. An unsupported-version close waits one minute.

Commands run in a new Bash session with a clean environment and the home
folder as their working folder. A timeout kills the process group.
`command.run` waits only for Bash. It snapshots private temporary output
files and removes them after the reply data is read. A background child
can keep its open output file without delaying the reply.
Detached output and atomic exit records live under
`/run/conductive-host/commands/`, with private folder and file permissions.
Detached commands keep running across a socket drop. A new host program
reads an unfinished record as lost. Systemd stops its children when the
host service ends.
One command registry keeps both running and exited states. A status read
cannot lose a completed command between the exit-file and registry observations.

File operations follow links. Reads open without blocking and accept only
regular files. Directory reads return their separate error. Content uses
base64. Complete reply budgets
include the JSON envelope and escaped output. Command status returns raw
byte offsets and cuts incomplete UTF-8 characters at chunk boundaries.
Operations other than `command.run` and `stream.open` have a 30-second
host deadline. Expiry returns `error internal` and releases the pending
request slot when the reply is written.

Each connection owns its stream tasks. They reach only loopback ports
7681 and 7682. The file server port is absent from the port type.
Credit bounds queued data in both directions. A half close preserves the
other direction. Independent tasks own local reads and writes. A blocked
write cannot stop local reads or peer credit. A socket drop cancels the
stream and joins both tasks.

## Quick Start

Run from the repository root:

```sh
cargo run -p cnd-cli -- host --help
cargo test -p cnd-host
```

The installed system service runs `conductive host` as `user`.
It needs no command-line credential or address option.

## Development

Run from the repository root:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Unit tests use `unimock` for settings, time, sockets, and native effects.
Runtime and session tests also mock the credential-free diagnostics port.
One production diagnostics test checks tracing text, levels, and codes.
Integration tests use local WebSockets, TCP sockets, temporary files, and
real commands. They use no external service. The production connector
requires TLS even though local transport fixtures use plain sockets.

### Key Code

- [Runtime](src/runtime.rs) implements `Host` with fresh settings and capped reconnect delays.
- [Session](src/session/host.rs) implements hello, welcome, ping, inactivity, and connection cleanup.
- [Session state](src/session/state.rs) admits requests and writes replies before stream activation.
- [Settings](src/config.rs) reads the saved machine credentials without exporting them.
- [Diagnostics](src/diagnostics.rs) defines credential-free events and their production tracing implementation.
- [TLS connector](src/socket/connect.rs) constructs sensitive authenticated upgrades.
- [Transport](src/socket/transport.rs) owns the independent native socket halves.
- [Wire codec](src/wire.rs) frames replies and assembles bounded request parts.
- [Reply budgets](src/replies.rs) counts complete JSON and bounds command output.
- [Dispatcher](src/dispatch.rs) validates arguments before native operations.
- [Commands](src/commands/native.rs) shares detached records across reconnects.
- [Command registry](src/commands/registry.rs) gives status one consistent running or exited state and recovers persisted exits.
- [Files](src/files.rs) reads metadata and bounded base64 contents.
- [Streams](src/streams/group.rs) owns stream capacity and task lifetime.
- [Stream relay](src/streams/relay.rs) applies credit and local half closes.
- [Effect boundaries](src/ports.rs) and [stream boundaries](src/streams/ports.rs) expose replaceable traits.

### Related Docs

- [Host connection](../../docs/protocol/host-connection.md)
- [Sandbox software](../../docs/architecture/sandbox-software.md)
- [Isolation and reply budgets](../../docs/protocol/isolation.md#orgs-and-workspaces)
- [Wire contracts](../cnd-runner-interface/README.md)
- [Command entry point](../cnd-cli/README.md)
- [Release installation](../../image/install.md#release-installation)
