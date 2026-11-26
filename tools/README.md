# Workspace CLI and MCP server

The Rust program `conductive` provides 27 Worker tools and five local service
tools as CLI commands and as a stdio MCP server. It manages workspaces,
sessions, messages, sections, and private port previews. It lists repositories and models.
It can ask to run a command on the active turn sender's connected Mac.
It lists org secrets and runs a command with approved values in its environment.
[Workspace tool calls](calls.md) gives each call with its options and replies.

The Worker calls use fixed machine routes under `/v1/tools/`.
The [local service calls](services.md) use the runner's private Unix socket.
They need no workspace token or active turn.
The [Worker handler](../worker/tools/README.md) verifies the workspace token
and the calling turn. Rust owns the shared runner request and reply types in
[cnd-runner-interface](../crates/cnd-runner-interface/README.md).
The Worker imports their generated TypeScript directly.
The shared interface also owns the secret route contracts and printable tool results.

The sandbox release ships the tools in its Rust executable.
The system installer links `/usr/local/bin/conductive` to
`/opt/conductive/current/conductive`. There is no separate tools install
and the commands need no Node runtime.

## Use

```sh
conductive --help
conductive workspaces list --owner member-id --archived false --limit 20
conductive repositories list
conductive sections list
conductive models list
conductive workspaces create --repository repo-id --message 'Build this feature.'
conductive workspaces create --repository repo-id --parent workspace-id --message 'Build the subtask.'
conductive workspaces list --parent workspace-id
conductive workspaces move --workspace workspace-id --parent parent-id
conductive workspaces move --workspace workspace-id --top-level
conductive workspaces create --repository repo-id --message-file task.md \
  --agent codex --model model-name --effort high --fast true --section section-id \
  --name 'Review the change' --first-session-title 'First review' --request-id review-1
conductive workspaces archive --workspace workspace-id
conductive sections create --name 'Reviews'
conductive sessions list --workspace workspace-id --limit 10 --offset 10
conductive sessions create --workspace workspace-id --title 'Review the change'
printf 'Check this change.\n' | conductive sessions send --workspace workspace-id \
  --session session-id --message-file - --request-id review-2
conductive sessions read --workspace workspace-id --session session-id --detail full
conductive sessions close --workspace workspace-id --session session-id --stop-running-turn
conductive messages get --workspace workspace-id --session session-id --message-id message-id
conductive previews open --port 3000
conductive mcp
conductive mac run --command 'pwd' --folder '/Users/me/project' --reason 'Check the local folder'
conductive secrets list
conductive secrets run --secret API_TOKEN --reason 'Deploy the service' -- ./deploy
```

The CLI writes one JSON response to stdout, except for `secrets run`.
Local and HTTP failures print a message on stderr and return exit status 1.
Workspace create, list, and move accept `--parent ID`, or `parentId` through MCP.
Move also accepts `--top-level`, or MCP `topLevel: true`, to take a tree out of its parent.
Move needs a section, a target, or both. A section-only move keeps its existing rules.
The create help gives the depth limit, the section rule, and sibling advice.
Both adapters keep parent IDs, parent entries, depth, direct children, and notices in their JSON replies.
The [workspace calls](calls.md#workspaces) describe these fields.
Both tools preserve the Worker's error code and message, such as `session_closed: Reopen the session to send a message.`
They give a generic failure for malformed replies and network failures.
Error text never includes the known workspace credential.
The shared JSON decoder replaces lone UTF-16 surrogate escapes with U+FFFD
in Worker replies and MCP tool text. Valid Unicode text stays unchanged.
Every MCP reply preserves its request ID exactly, including error replies.
A successful reply can report no change, such as `deleted: false` or `closed: false`.
The CLI returns status 0 for it, and MCP returns `isError: false`.
`conductive --help` works without runtime credentials.
A session option's string value can start with a dash.
For example, `--message '--help'` sends that exact text.

Each command that takes a model also takes `--fast true` or `--fast false`, and MCP takes the boolean `fast`.
A create runs at standard speed without `--fast true`.
A send without `--fast` keeps the fast mode of the session.
[Fast mode](../docs/protocol/fast-mode.md#agent-tools) gives the rules.

The runner supplies these values in the process environment:

| Name | Value |
| --- | --- |
| `CONDUCTIVE_MACHINE_ORIGIN` | The machine origin with no path, `https://api.conductive.build` in production |
| `CONDUCTIVE_WORKSPACE_TOKEN` | The calling workspace's runtime token |
| `CONDUCTIVE_TURN_ID` | The `turnId` of the active runner command |

An explicitly supplied runtime value takes precedence over the saved
`/run/ascii-secrets/env.sh` value. Only an absent value uses that file.
The executable shares its saved-settings reader with the Git credential helper.
The saved token name is `WORKSPACE_TOKEN`.
The tools send the token as a bearer credential.
They send the turn ID in `X-Conductive-Turn-Id`.
The turn ID selects context.
It grants no access by itself.
Every write requires valid active turn context and acts for the member whose message started that turn.
Every read needs only the workspace token.
[Reach, turns, and rights](calls.md#reach-turns-and-rights) gives the rules of each call.

## MCP

The stdio server exposes the 27 Worker calls of [the call table](calls.md#the-calls).
Their fields take the values of the CLI options.
Their optional `workspaceId` defaults to the caller.
The ID fields name the calls or links that supply their values.
The descriptions say which calls need only the token and which need an active turn.
They also give the reach and the links of the replies.
The workspace name and session title fields give the same guidance as the `--name` help.
Reads have `readOnlyHint: true`.
`archive_workspace`, `delete_section`, `run_mac_command`, and `run_with_secrets` have `destructiveHint: true`.
The server supports the `2025-11-25` MCP revision.
It returns this supported revision during initialization.
It never copies an unknown offered revision into its reply.
The client must finish initialization before it calls a tool.
Each stdout line contains one JSON-RPC message.
Notifications produce no replies.
Tool failures return `isError: true`.
Malformed protocol requests return JSON-RPC errors.
The MCP server reads no message file. Its message fields take the text.

The runner must launch a new MCP process for each active turn.
It must pass that turn's environment to the process.
It must stop the process when the turn ends.
A process with an old turn ID cannot serve another turn or a concurrent session.
The Worker rejects stale turn context.

## Session watches

```sh
conductive sessions watch --workspace workspace-id --session session-id --turn-id turn-id
```

`sessions watch` and `watch_session` ask for one wake when one turn finishes, fails, or stops.
Use the actual session and exact `turnId` returned with the work, when available.
The call returns at once. Set the watch, then end the reply when only that watched work remains.
After a wake, use `read_session` for the result.
An idle or ended reply sets no watch, so read it at once.
A turn end does not mean the whole delegated task is complete.
Explicit Stop drops older pending wakes of the calling session.
Automatic idle computer stops keep watches.
[Session watches](calls.md#session-watches) gives the options and typed replies.

## Secrets

Call `secrets list` or `list_secrets` before you ask a member for an API key,
a token, or another credential. Use `secrets run` or `run_with_secrets` for
each command that needs a secret. Read each value through its
`environmentVariable`.

`secrets list` and `list_secrets` return each org secret's name, description,
availability, and `environmentVariable`. They never return values. A running
turn adds session approvals to availability. Without one, only org and
workspace grants count. The tools derive each variable name from the secret
name. The Worker's list reply has no variable names.

`secrets run` and `run_with_secrets` need an active turn. They first refuse
two requested names that need one environment key. That refusal is a local
failure before any Worker call. It names both secrets and the shared
variable, and never a value. Otherwise the tools send the names, command
text, and optional reason to the Worker. Grants that cover each name allow
the command with no request. A missing grant makes a request
that waits up to 90 seconds. A pending result starts no command. After a
notice of a late answer, the agent calls run again.

An allowed result puts values only in the child environment. Each value
gets its variable name, and its exact secret name unless that name is
empty or holds `=` or NUL. These entries replace inherited variables of the
same name in the child only. The Worker keeps the values under the exact
requested names, so older tools still accept its reply. The tools never put
returned values in arguments, files, logs, or replies. Both output streams
hide exact copies with `[redacted]`, including copies split between reads.
Keep each value out of output, files, and answers. The filter hides only
exact copies.

The CLI executes the arguments after `--` directly. It keeps stdin and
streams filtered stdout and stderr. It returns the child's exit status.
After the child ends, it writes `environmentVariables: ` and the JSON map of
secret names to variable names on stderr. Stdout holds only the child's output.
For shell syntax, pass `sh -c 'command'` after `--`.
MCP runs its `command` text through `/bin/sh -c`, with closed stdin.
It returns filtered `stdout`, `stderr`, `exitCode`, and the
`environmentVariables` map with `status: "completed"`.
A nonzero exit code sets `isError: true`. A Unix signal gives 128 plus its number.

`pending`, `denied`, and `not-answered` keep the Worker's message and start
no command. The CLI prints that message on stderr and exits 1.
MCP preserves the status, `requestId`, and message, with `isError: true`.
No command output or exit status goes back to the Worker.
See [Secret variables](../docs/protocol/secret-variables.md) and
[Secret requests](../docs/protocol/secret-requests.md).

## Mac commands

Use `mac run` or `run_mac_command` when the task needs the member's Mac.
The call needs an active calling turn.
The request goes to the Mac of the member whose message started the turn.
The Mac app asks before each command, unless a permission that its user chose there covers it.

Mac commands use the same runtime token and active turn context.
The Worker selects the stored sender, not the workspace owner or a caller-supplied user.
The tool waits for the scoped request to finish.
The exact command and folder reach the Mac without trimming.
The normal reason is required.
The time limit defaults to 60 seconds.
`--timeout-seconds` accepts up to 120 seconds without an extra reason.
Limits through 1800 seconds require `--longer-timeout-reason`.
`--request-id` supplies an optional stable retry ID.
Without it, the tool creates an opaque ID.
The Worker returns a hashed `requestKey` for polling URLs.
The client uses that key and preserves the exact retry ID, including dot and dot-dot IDs.

Approval and saved permission rules stay on the Mac.
An offline Mac returns an unavailable result.
A stopped turn cancels its command with `turn_ended`.
The response preserves the exit code, timeout, and output truncation.
Combined stdout and stderr have a 65,536-byte UTF-8 cap.
A Mac command succeeds only when its state is `completed` and its exit code is 0.
The CLI returns status 1 and MCP returns `isError: true` for every other result.
Both adapters keep the complete command result, including its output, timeout, and truncation fields.

Each call to create or read a Mac command needs the active turn.
So the tool cannot read a `turn_ended` result after Stop.
The Worker answers its next call with HTTP 403 `calling_turn_required`.
The tool then stops polling and reports the Worker code and message, followed by `The agent turn ended. The tool cannot read the Mac command result.`
The CLI writes that message to stderr and returns status 1.
MCP returns it in a tool result with `isError: true`.

The Mac command route is mounted in the real Worker.

## Development

Run these commands from the repository root:

```sh
cargo test -p cnd-tools
cargo run -p cnd-cli -- --help
cargo run -p cnd-cli -- sessions send --help
npm run test -- worker/tools
```

Rust tests cover both adapters through mocked HTTP, process, message input,
polling, and stdio boundaries. Integration tests run native child processes.
Worker tests call the real routes directly. They need
no Rust toolchain. The Mac route tests live in
[worker/devices/tools.test.ts](../worker/devices/tools.test.ts).

## Key code

- [cnd-tools](../crates/cnd-tools/README.md) owns CLI parsing, typed HTTP calls, and the MCP server.
- [tool_command.rs](../crates/cnd-cli/src/tool_command.rs) composes the installed command's runtime dependencies.
- [tools](../crates/cnd-runner-interface/src/tools/mod.rs) owns the Rust wire contracts.
- [agent-tools.ts](../src/shared/agent-tools.ts) keeps the machine paths, MCP registration, and runtime environment names.

The MCP implementation follows the official [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle),
[stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
and [tool](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) requirements.
