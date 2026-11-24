# cnd-runner-interface

This crate owns Conductive's runner, SDK helper, agent chat event, and
workspace tool types. Depend on it when Rust code sends or reads these messages.
The Worker, web app, Mac app, and SDK helper import its generated TypeScript.

## Responsibilities

- Keep the current runner JSON wire format stable.
- Define protocol version 2 and workspace tool messages and their dependent types once.
- Generate TypeScript with serde names, optional fields, and read-only arrays.

## What This Crate Does

The crate provides handshake messages, commands, numbered events, confirmations,
resend requests, file results, and temporary turn credentials.
`runner_repository` holds the repository move, its refusal reply, and the
current repository of each turn and message.
`runner_tool_detail` holds the private `tool.detail.part` events of a
complete tool-detail source. Only the first part carries the turn and the
tool metadata.
The hello has an optional `fileServer` capability. A listening file server
sets it to true. Older runners omit it. The protocol version stays 2.
The hello and welcome also have optional `services` support fields.
Both must be true before a connection carries services. The runner advertises
support when its native effects are composed, and the Worker accepts it after negotiation.
Service contracts separate local definitions and raw log replies from
selected public report rows and filtered app log excerpts.
Reports carry the computer boot ID and revision. Controls carry a durable
request ID and the observed boot, service ID, and generation.
Private service messages belong to `RunnerToWorkspace` and
`WorkspaceToRunner`, outside `RunnerEvent` and the stored `RunnerCommand`
union. They never enter the numbered outbox or change its cursor.
Report, control-result, and log documents travel in private text parts.
Each complete outer message uses the existing 1 MiB runner budget.
Join each document, parse its typed JSON, and filter complete text fields
before storage or display cuts. Raw log assembly stays in memory.
The app catalogue distinguishes unsupported software, a stopped computer,
and a supported empty report. Feature APIs carry it without new browser
socket kinds. An optional `serviceId` extends existing listening ports.
The workspace tools provide workspace, session, message, repository, section,
model, preview, Mac command, and secret requests and replies. Their replies preserve
accepted message and turn pairs, resume errors, and transcript positions.
Workspace creation carries optional `startBranch` and `baseBranch` strings.
The Worker resolves their defaults and validates them after creation replay.
Workspace records and list entries give a required nullable parent ID.
Workspace details give the parent entry, stored depth, and direct children.
`Workspace.archivedComputer` is optional. It gives the `ArchivedComputerState`
of an archived workspace and its original Restore cutoff. Its deserializer
reads a null, malformed, or future value as absent, so older and newer
records still decode.
Create, list, and move requests accept an optional parent ID.
Move requests can instead name the top level. Their section ID is optional
when the request gives a target.
Create and workspace write replies can carry an optional notice.
Dependent types include workspace and session records, messages, attachments,
model choices, file reports, port reports, skill reports, startup reports, and commit authors.
Skill metadata has no private path. Only helper scan results and explicit
Codex input carry the absolute path of a skill file.
`SessionLogin` names a personal owner or org without a credential.
`Session.login` is optional for older clients and stored records.
`Session.anchor` is optional. It names the parent session and message, and keeps the selected rendered text with its surrounding text.
Sessions without an anchor omit the field.
`Session.defaultLogin` names the starter's current default owner before the first accepted message.
It is optional and absent when no login serves the starter or `Session.login` is fixed.
`DefaultAgentLogin` carries the server's default owner and model availability for an org and agent.
Its separate org model list also serves sessions that keep the org login with a personal default.
Browser-only events and local socket adapters remain in TypeScript.
Secret tool contracts keep the raw Worker response separate from printable results.
The value-bearing run response has no serializer and no debug output.

Optional fields omit `None`. Required nullable fields serialize `None` as null.
Literal booleans and the protocol version preserve their exact JSON values.
Wire integers use JSON numbers within JavaScript's safe integer range.
Dates use Unix milliseconds. Arrays have read-only TypeScript views.
Runtime validation remains the caller's responsibility.
The shared JSON text decoder replaces lone UTF-16 surrogate escapes with
U+FFFD. Valid pairs and literal escape text remain unchanged.
The runner and workspace tools keep their own number and domain validation.

## Quick Start

```rust
use cnd_runner_interface::runner_handshake::{RunnerHello, RunnerProtocolVersion};

let hello = RunnerHello::Hello {
    protocol_version: RunnerProtocolVersion,
    workspace_id: "workspace-1".into(),
    stream_id: "stream-1".into(),
    login_kinds: None,
    process_start_id: None,
    repository_folder: Some("/home/user/code/storefront".into()),
    complete_tool_details: Some(true),
    file_server: None,
    services: None,
};
```

## Development

Run these commands from the repository root:

```sh
cargo run -p cnd-runner-interface --example export_bindings
cargo test -p cnd-runner-interface
```

The export example needs the root npm dependencies and Node 24.
It writes the Worker types to `src/shared/generated/`.
It writes helper types and their dependencies to `runner/sdk-helper/src/generated/`.
It formats both folders with Prettier.
It removes old generated files before export. Commit the generated files.
The export command does not add a gate check for generated changes.
Wire tests cover message forms and optional or nullable fields.
Service tests use the public JSON decoder and typed serializers.
One test compares the TypeScript runtime limits with their Rust constants.

### Key Code

- [Handshake](src/runner_handshake.rs) defines the two message directions and event envelope.
- [File server](src/file_server.rs) defines the reserved loopback port and files-mark header.
- [Commands](src/runner_commands.rs) defines turn, message, control, and report requests.
- [Local services](src/services/local.rs) defines private Start input and printable CLI/MCP replies without environment values.
- [Service state](src/services/process.rs) defines run identities, process results, and selected metadata.
- [Service controls](src/services/control.rs) defines generation-bound requests and durable, output-free receipts.
- [Service reports](src/services/reports.rs) defines complete snapshots and definition provenance.
- [Service transport](src/services/transport.rs) defines independent private commands and multipart documents.
- [Service logs](src/services/logs.rs) defines raw runtime replies and the approved retained-log and app-excerpt bounds.
- [App services](src/services/app.rs) defines filtered catalogue and log API replies.
- [Credentials](src/runner_credentials.rs) defines supported logins and temporary credentials.
- [Chat events](src/chat_events.rs) defines agent events and tool output.
- [Tool details](src/runner_tool_detail.rs) defines the private parts of a complete tool-detail source.
- [File reports](src/file_tree.rs) defines report parts, deltas, and their identities.
- Defines changed rows and the separate totals for listed and omitted files. [file_changes.rs](src/file_changes.rs)
- [File results](src/runner_files.rs) defines read commands and their results.
- [Skill reports](src/skills.rs) defines public metadata and private discovery/input records.
- [Helper messages](src/sdk_helper.rs) defines JSON line requests and outputs.
- [Helper options](src/sdk_helper_options.rs) defines private start options, the optional `OrgSkills` value, and input.
- [Provider events](src/provider_events.rs) defines adapter results and background state.
- [Workspace tools](src/tools/mod.rs) defines tool payloads and the records that their replies use.
- [Session writes](src/tools/sessions.rs) defines the session create and send requests, the accepted message and turn, the resume states, and the write replies.
- [Session actions](src/tools/session_actions.rs) defines the session get, rename, close, and stop contracts, and the message lookup.
- [Session reads](src/tools/session_reads.rs) defines the session list and transcript read contracts, with the session states.
- [Session watches](src/tools/session_watches.rs) defines watch requests, replies, terminal states, and Worker wake notices with their hidden message identity.
- [Workspace calls](src/tools/workspaces.rs) defines parent-aware requests, list entries, details, and notices.
- [Secret contracts](src/tools/secrets.rs) defines the legacy Worker list, run input, grants, and non-printable values.
- [Secret results](src/tools/secret_results.rs) defines printable command output and tool outcomes.
- [Workspace records](src/tools/workspace_types.rs) defines the app's workspace record with its nullable parent ID and its optional archived computer.
- [Wire helpers](src/wire.rs) preserves literal booleans and read-only array views.
- [JSON decoder](src/json/decoder.rs) reads JavaScript JSON strings for the runner and workspace tools.
- [Export example](examples/export_bindings.rs) registers and formats every shared type.
- [Wire snapshots](tests/wire_1.rs) starts the message serialization cases.

### Related Docs

- [Agent runner protocol](../../docs/protocol/agent-runner.md)
- [File server protocol](../../docs/protocol/file-server.md)
- [File report protocol](../../docs/protocol/file-reports.md)
- [Runner warnings](../../docs/protocol/runner-warnings.md)
- [Agent tools](../../docs/protocol/agent-tools.md)
- [Services](../../docs/protocol/services.md) and
  [Service reports](../../docs/protocol/service-reports.md)
- [Secret requests](../../docs/protocol/secret-requests.md)
- [Secret variables](../../docs/protocol/secret-variables.md)
- [Sub-workspaces](../../docs/protocol/sub-workspaces.md)
- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Shared contracts](../../src/shared/README.md)
- [Architecture](../../docs/architecture.md)
