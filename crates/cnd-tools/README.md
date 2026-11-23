# cnd-tools

This crate implements the workspace CLI and stdio MCP server of Conductive.
Use it from `conductive` for Worker calls and local service operations.
Use `cnd-runner-interface` for the shared wire types.

## Responsibilities

Parse tool options. Preserve valid Unicode message text. Authenticate fixed-route HTTP
requests. Validate replies. Serve 27 Worker calls and five local service calls through CLI and MCP.
Run commands with approved secrets under their variable names, and filter their output.

## What This Crate Does

The CLI returns one JSON reply on stdout, except for `secrets run`. Local and HTTP failures return
safe text on stderr and exit status 1. Mac command results remain JSON;
only a completed command with exit code 0 returns success. MCP returns the
same result as text and structured content, with the matching `isError`.

Workspace create, list, and move accept `--parent ID`, or `parentId` through MCP.
Create nests a workspace under that parent and uses the parent's section.
List selects only the direct sub-workspaces of that parent.
Move nests the whole tree under that parent. `--top-level`, or MCP
`topLevel: true`, takes the tree out of its parent. Move needs a section,
a target, or both. A section-only move keeps its existing rules.
The Worker checks cycles and the depth of the whole tree before it writes.
The create text gives the cases of when to nest, the depth limit, and sibling advice.
Both adapters preserve `parentId` in workspace records and list entries.
Workspace details also keep `parent`, `depth`, and `children`.
Create and move replies keep their optional `notice`.

The secret list returns names, descriptions, availability, and the variable
name of each secret. It never returns values.
One rule maps each secret name to its variable name, for the CLI and MCP alike.
A run refuses two names that need one environment key before any HTTP call.
The refusal names both secrets and the shared variable, and no value.
An allowed secret run puts values only in the child's environment: under each
variable name, and under each exact name except an empty name or one with `=` or NUL.
The Worker reply keeps its values under the exact requested names.
The CLI runs the exact arguments after `--`, keeps stdin, streams filtered
stdout and stderr, and returns the child's exit status.
After the child ends, it writes `environmentVariables: ` and the JSON map of names to variable names on stderr.
MCP runs its command text through `/bin/sh -c` with closed stdin.
It returns `status: "completed"`, filtered `stdout` and `stderr`, `exitCode`,
and `environmentVariables`.
Both streams replace exact copies with `[redacted]`, also across read boundaries.
Keep each value out of output, files, and answers.
The values never enter serializable replies or diagnostics.
The value-bearing Worker reply stays separate from the printable list and run replies.
Pending, denied, and not-answered results start no child and keep the Worker's message.
The CLI prints that message and exits 1. MCP returns the status with `isError: true`.

The [service calls](../../docs/protocol/service-calls.md) start, list,
stop, and restart the services of the same cloud computer, and read their
logs. They reach the local runner, not the Worker, and they need no
workspace token or active turn. Their descriptors, help, and adapters live
in a separate services section. Start keeps literal argv and the caller's
folder. Restart uses its saved definition. Printable results contain no
environment map. [Local service tools](../../tools/services.md) gives the flags and fields.

The server negotiates MCP `2025-11-25`. It requires initialization before
tool calls, ignores notifications, answers ping while HTTP calls wait,
and finishes outstanding replies before it exits at EOF.

The runtime uses `CONDUCTIVE_MACHINE_ORIGIN`,
`CONDUCTIVE_WORKSPACE_TOKEN`, and optional `CONDUCTIVE_TURN_ID`.
Explicit values take precedence over saved settings supplied through `Environment`.
The executable's shared reader loads `/run/ascii-secrets/env.sh` and maps
saved `WORKSPACE_TOKEN` to the runtime token field.
Help needs no credential. HTTP never follows redirects.
Worker refusal codes and messages keep their meaning, with the known
credential removed. Malformed replies and network errors use fixed text.
The shared JSON decoder replaces lone UTF-16 surrogate escapes with U+FFFD
in Worker replies and MCP tool text. Valid surrogate pairs remain unchanged.
Every MCP reply preserves its request ID exactly, including error replies.

Workspace create accepts `--start-branch` and `--base-branch` in the CLI,
or `startBranch` and `baseBranch` in MCP. The first supplies the starting
commit. The second sets the pull request target and Changes comparison.
With neither field, both use the repository default branch.
With one field, both use that branch. The adapters preserve each branch
string, including blank strings. The Worker validates branch names after
creation replay, so a retry keeps the first create's branches.

### Session watches

`sessions watch` and `watch_session` ask the Worker for one wake of the
calling session when one turn of a session ends. They take the session, an
optional workspace, and an optional turn ID. The reply comes at once, with
`watching`, `idle`, or the end of a turn that already ended.
[Session watches](../../docs/protocol/session-watches.md) states the rules.
Use the reply's actual session and exact `turnId` after sending or creating work, when available.
The typed reply keeps the workspace, linked session, and flattened state.
Repeats for the same valid watch return the same `watchId`.
An idle or ended reply sets no watch, so read the session at once.

```sh
cargo run -p cnd-cli -- sessions watch --session session-id --workspace workspace-id --turn-id turn-id
```

### Messages

`messages get` and `get_message` read one message by its ID. The ID can
name a member message or a finished message of the agent, such as the
`Message:` ID of an Explain prompt. The typed reply names the `author`,
`member` or `agent`. Each request sends `agentMessages=true`, so the
Worker knows that this runner reads agent messages. An older runner sends
no flag and gets HTTP 404 for an agent message. A reply with no `author`,
from a Worker before agent messages, reads as a member message.
[Get a message](../../docs/protocol/session-management.md#get-a-message)
states the rules.

```sh
cargo run -p cnd-cli -- messages get --session session-id --message-id message-id
```

Set the watch, then end the reply when only that watched work remains.
After a wake, use `read_session` for the result.
A turn end does not mean the whole delegated task is complete.
Explicit Stop drops older pending wakes of the calling session.
Automatic idle computer stops keep watches.

## Quick Start

Run from the repository root:

```sh
cargo run -p cnd-cli -- workspaces list --limit 20
cargo run -p cnd-cli -- workspaces create --repository repo-id --parent workspace-id --message 'Build the subtask.'
cargo run -p cnd-cli -- workspaces move --workspace workspace-id --parent parent-id
cargo run -p cnd-cli -- workspaces move --workspace workspace-id --top-level
cargo run -p cnd-cli -- sessions send --session session-id --message-file task.md
cargo run -p cnd-cli -- secrets list
cargo run -p cnd-cli -- services start --name web -- npm run dev
cargo run -p cnd-cli -- secrets run --secret API_TOKEN --reason 'Deploy the service' -- ./deploy
cargo run -p cnd-cli -- mcp
```

The runner supplies runtime context for each turn. See
[workspace tool calls](../../tools/calls.md) for options and access rules.

## Development

```sh
cargo test -p cnd-tools
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

Unit tests replace HTTP, child processes, file/stdin reads, UUIDs, polling,
and output with `unimock`. Integration tests check native process environment
isolation and filtered output. Worker route tests need no Rust build.

### Key Code

- [cli.rs](src/cli.rs) exposes the `Program` boundary and composes both adapters.
- [client.rs](src/client.rs) authenticates requests and validates typed replies.
- [lazy_client.rs](src/lazy_client.rs) resolves remote credentials only for a remote MCP call.
- [Local services](src/services/tools.rs) supplies the CLI/MCP boundary and caller context.
- [Service dispatch](src/services/dispatch.rs) targets the observed generation and keeps lost replies Unconfirmed.
- [mcp-services.json](src/mcp-services.json) holds only local service descriptors and schemas.
- [input](src/input/mod.rs) validates untrusted fields without changing text.
- [request.rs](src/request.rs) maps typed calls to fixed HTTP routes.
- [watches.rs](src/input/watches.rs) parses optional exact-turn selection for session watches.
- [mcp](src/mcp/mod.rs) runs concurrent protocol requests and drains them at EOF.
- [mcp-tools.json](src/mcp-tools.json) holds the MCP descriptors and input schemas.
- [ports.rs](src/ports.rs) defines replaceable runtime and transport effects.
- [environment.rs](src/environment.rs) keeps runtime values ahead of injected saved settings.
- [runtime.rs](src/runtime.rs) implements native HTTP, input, polling, and stdio.
- [process.rs](src/process.rs) owns the child boundary, native execution, and filtered streams.
- [secrets](src/secrets/mod.rs) reads the Rust-owned Worker contracts and filters split byte matches.
- [Secret environment](src/secrets/environment.rs) derives variable names and checks ownership of every child entry before HTTP.

### Related Docs

- [Architecture](../../docs/architecture.md)
- [Agent tools](../../docs/protocol/agent-tools.md)
- [Service calls](../../docs/protocol/service-calls.md)
- [Session watches](../../docs/protocol/session-watches.md)
- [Secret requests](../../docs/protocol/secret-requests.md)
- [Secret variables](../../docs/protocol/secret-variables.md)
- [Workspace commands](../../tools/README.md)
- [Runner registration](../../runner/agent-tools.md)
- [Sub-workspaces](../../docs/protocol/sub-workspaces.md)
- [Parent changes](../../docs/protocol/parent-changes.md)
