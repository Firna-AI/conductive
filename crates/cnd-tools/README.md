# cnd-tools

This crate implements the workspace CLI and stdio MCP server of Conductive.
Use it from the `conductive` executable to call the Worker's machine routes.
Use `cnd-runner-interface` for the shared wire types.

## Responsibilities

Parse tool options. Preserve valid Unicode message text. Authenticate fixed-route HTTP
requests. Validate replies. Serve the same 27 calls through CLI and MCP.
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

### Session watches

`sessions watch` and `watch_session` ask the Worker for one wake of the
calling session when one turn of a session ends. They take the session, an
optional workspace, and an optional turn ID. The reply comes at once, with
`watching`, `idle`, or the end of a turn that already ended.
[Session watches](../../docs/protocol/session-watches.md) states the rules.
The CLI and the MCP server do not offer this call yet.

## Quick Start

Run from the repository root:

```sh
cargo run -p cnd-cli -- workspaces list --limit 20
cargo run -p cnd-cli -- workspaces create --repository repo-id --parent workspace-id --message 'Build the subtask.'
cargo run -p cnd-cli -- workspaces move --workspace workspace-id --parent parent-id
cargo run -p cnd-cli -- workspaces move --workspace workspace-id --top-level
cargo run -p cnd-cli -- sessions send --session session-id --message-file task.md
cargo run -p cnd-cli -- secrets list
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
- [input](src/input/mod.rs) validates untrusted fields without changing text.
- [request.rs](src/request.rs) maps typed calls to fixed HTTP routes.
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
- [Session watches](../../docs/protocol/session-watches.md)
- [Secret requests](../../docs/protocol/secret-requests.md)
- [Secret variables](../../docs/protocol/secret-variables.md)
- [Workspace commands](../../tools/README.md)
- [Runner registration](../../runner/agent-tools.md)
- [Sub-workspaces](../../docs/protocol/sub-workspaces.md)
- [Parent changes](../../docs/protocol/parent-changes.md)
