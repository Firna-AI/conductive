# cnd-runner-interface

This crate owns Conductive's runner protocol and agent chat event types.
Depend on it when Rust code sends or reads runner messages.
The Worker, web app, Mac app, and Node runner import its generated TypeScript.

## Responsibilities

- Keep the current runner JSON wire format stable.
- Define protocol version 2 messages and their dependent types once.
- Generate TypeScript with serde names, optional fields, and read-only arrays.

## What This Crate Does

The crate provides handshake messages, commands, numbered events, confirmations,
resend requests, file results, and temporary turn credentials.
Its dependent types include messages, attachments, model choices, file reports,
port reports, startup reports, and commit authors.
Browser-only events and local socket adapters remain in TypeScript.

Optional fields omit `None`. Required nullable fields serialize `None` as null.
Literal booleans and the protocol version preserve their exact JSON values.
Wire integers use JSON numbers within JavaScript's safe integer range.
Dates use Unix milliseconds. Arrays have read-only TypeScript views.
Runtime validation remains the caller's responsibility.

## Quick Start

```rust
use cnd_runner_interface::runner_handshake::{RunnerHello, RunnerProtocolVersion};

let hello = RunnerHello::Hello {
    protocol_version: RunnerProtocolVersion,
    workspace_id: "workspace-1".into(),
    stream_id: "stream-1".into(),
    login_kinds: None,
};
```

## Development

Run these commands from the repository root:

```sh
cargo run -p cnd-runner-interface --example export_bindings
cargo test -p cnd-runner-interface
```

The export example needs the root npm dependencies and Node 24.
It writes every generated file to `src/shared/generated/` and runs Prettier.
It removes old generated files before export. Commit the generated files.
The export command does not add a gate check for generated changes.
JSON file snapshots cover every message form and optional or nullable fields.
One test compares the TypeScript runtime limits with their Rust constants.

### Key Code

- [Handshake](src/runner_handshake.rs) defines the two message directions and event envelope.
- [Commands](src/runner_commands.rs) defines turn, message, control, and report requests.
- [Credentials](src/runner_credentials.rs) defines supported logins and temporary credentials.
- [Chat events](src/chat_events.rs) defines agent events and tool output.
- [File reports](src/file_tree.rs) defines report parts, deltas, and their identities.
- [File results](src/runner_files.rs) defines read commands and their results.
- [Wire helpers](src/wire.rs) preserves literal booleans and read-only array views.
- [Export example](examples/export_bindings.rs) registers and formats every shared type.
- [Wire snapshots](tests/wire_1.rs) starts the message serialization cases.

### Related Docs

- [Agent runner protocol](../../docs/protocol/agent-runner.md)
- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Shared contracts](../../src/shared/README.md)
- [Architecture](../../docs/architecture.md)
