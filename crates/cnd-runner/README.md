# cnd-runner

This crate provides the durable runner connection for Conductive. Depend on
it to compose a workspace runner with file reporters and a turn engine.
The [interface crate](../cnd-runner-interface/README.md) owns its wire types.
The production service still uses the Node runner. The `conductive runner`
command remains unavailable until the file and turn owners are connected.

## Responsibilities

- Open an authenticated outbound TLS WebSocket and send the version 2 hello.
- Save numbered events before sending them. Keep unconfirmed events across restarts.
- Process welcome, confirmations, gaps, resends, and connection retries.
- Keep conversation references, instructions, file revisions, turn records, and report receipts.
- Read and write the existing Node state file format without a migration.

## What This Crate Does

A store has pending state and committed state. A failed save rejects its
call and keeps its pending changes. Later saves write the complete pending
state. Sends and resends read only committed events. A confirmation removes
an accepted turn record only when it covers the turn's end.

Recovery appends one stopped end for each unfinished saved turn. A recovered
started turn marks its files as unavailable. A saved end keeps its original
number and payload. Recovery starts no agent.

The event emitter retries pending agent output and terminal events once.
A failed output retry permits the turn to continue. A failed start still
reaches its caller. The caller supplies events after its credential filter.
This crate bounds tool details, whole turn-file prefixes, file payloads,
and complete envelopes. It does not implement the credential filter.

The socket accepts HTTPS or WSS endpoints and uses rustls with public roots.
It repairs lone UTF-16 surrogate escapes to U+FFFD before typed decoding.
It preserves valid pairs and literal escaped backslashes. Integer dates,
counts, and event numbers must fit JavaScript's safe integer range.

The runtime retries a dropped or failed connection after one second.
Its command handler owns full reports, readiness, commands, and live-turn
shutdown. These operations can run while the socket handles confirmations.
The handler queues commands in wire order. It must stop its work when shutdown starts.

## Quick Start

Run the connection and state tests from the repository root:

```sh
cargo test -p cnd-runner
```

Compose `Arc<dyn Disk>`, `Arc<dyn EventStore>`, `Arc<dyn Clock>`,
`Arc<dyn Connector>`, and `Arc<dyn RunnerLink>`. Give `DurableStore` a fresh
random stream ID for a missing file. Call `EventStore::load` once before
sharing the store. An existing file supplies its saved stream ID.
Give `RunnerCore` the loaded store, link, clock, and a `CommandHandler`.
Drive `Runner::run` with a Tokio watch channel for shutdown.

## Development

Run these commands from the repository root:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --release --target x86_64-unknown-linux-musl -p cnd-runner
```

Unit tests use unimock at the disk, clock, and link boundaries. Integration
tests use a controlled disk, an in-memory workspace endpoint, and a real
private state file. No test needs an agent login or a cloud computer.
The fake endpoint models cursors, gaps, duplicates, refusal confirmations,
and connection drops. It does not run the Worker or assemble file reports.

### Key Code

- [config.rs](src/config.rs): `Configuration::parse` reads supplied service settings.
- [store.rs](src/state/store.rs): `EventStore` defines serialized state operations.
- [records.rs](src/state/records.rs): `RunnerState` reads the existing JSON format.
- [disk.rs](src/disk.rs): `AtomicDisk` replaces the private state file atomically.
- [connection.rs](src/link/connection.rs): `SavedRunnerLink` sends hello and saved events.
- [socket.rs](src/socket.rs): `WebSocketConnector` supplies the production TLS socket.
- [emitter.rs](src/emitter.rs): `SavingEmitter` applies the failed-save retry policy.
- [runtime.rs](src/runtime.rs): `RunnerCore` recovers turns and owns reconnection and shutdown.
- [limits.rs](src/limits.rs): `bound_event` applies serialized chat excerpts.
- [commands.rs](src/json/commands.rs): `workspace_message` repairs and validates command JSON.

### Related Docs

- [Agent runner protocol](../../docs/protocol/agent-runner.md)
- [Lost workspace updates](../../docs/protocol/lost-workspace-updates.md)
- [Version pins](../../docs/protocol/version-pins.md)
- [Sandbox architecture](../../docs/architecture/components.md#sandbox-software)
- [Node runner](../../runner/README.md)
- [Event limits](../../runner/event-limits.md)
- [Runner configuration](../../runner/configuration.md)
