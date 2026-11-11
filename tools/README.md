# Workspace CLI and MCP server

These tools create and list Conductive workspaces from a running workspace.
They also create sessions, list sessions, send messages, and read chats across the org.
They can also ask to run a command on the active turn sender's connected Mac.
They call the machine route `/v1/tools/workspaces` from the [shared contract](../src/shared/agent-tools.ts).
They also list repositories, sections, and models through that contract's machine routes.
Mac commands use `/v1/tools/mac-command` from [the device contract](../src/shared/device.ts).
The [Worker handler](../worker/tools/README.md) verifies the workspace token and the calling turn.

The tools require Node 24.
They use its native TypeScript support and need no runtime npm packages.

## Use

```sh
conductive workspaces list
conductive repositories list
conductive sections list
conductive models list
conductive workspaces create --repository repo-id --message 'Build this feature.'
conductive workspaces create --repository repo-id --message 'Review the change.' \
  --agent codex --model model-name --effort high --section section-id --name 'Review the change'
conductive sessions list
conductive sessions create --workspace workspace-id --title 'Review the change'
conductive sessions send --workspace workspace-id --session session-id --message 'Check this change.' --request-id review-1
conductive sessions read --workspace workspace-id --session session-id --detail full
conductive mcp
conductive mac run --command 'pwd' --folder '/Users/me/project' --reason 'Check the local folder'
```

Create inherits the calling workspace's org and owner.
An omitted model or effort uses the owner's default.
An omitted section uses the org's default section.
The first message runs as the sender of the calling turn.
`--name` gives an optional workspace name.
Its help says: "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them."
The Worker keeps its first line with text, makes white space single, removes a final full stop, and cuts at 60 Unicode code points.
It keeps whole words when possible and keeps an ellipsis.
It keeps each underscore, as [Create and list calls](../docs/protocol/agent-tools.md#create-and-list-calls) says.
A blank result counts as no name, and the app shows "Untitled".
The name does not change the branch.
The create answer holds the stored name, the first session ID, and its absolute `sessionLink`.
`workspaces list` returns every workspace in the org, including archived workspaces.
Each list item gives its number and canonical web link.
Create gives both fields in the complete workspace record.
That record also gives `github`, the GitHub summary of the workspace, or null.
A workspace link in a message names that workspace.
A workspace link in an answer shows as a chip.
The number is a display label. Links keep the workspace ID.
`repositories list` returns the repositories that a create accepts, with IDs and the current repository mark.
`sections list` returns the org's sections in sidebar order, with IDs and the default section mark.
`models list` returns the app's models, their agents and efforts, and the owner's default choice.
The default choice falls back to the app default, then to `null`.
The [agent-tool protocol](../docs/protocol/agent-tools.md#repository-section-and-model-lists) gives the list rules and errors.

The CLI writes one JSON response to stdout.
It writes a failure message to stderr and returns exit status 1.
Both tools preserve the Worker's error code and message, such as `session_closed: Reopen the session to send a message.`
They give a generic failure for malformed replies and network failures.
Error text never includes the known workspace credential.
`conductive --help` works without runtime credentials.
A session option's string value can start with a dash.
For example, `--message '--help'` sends that exact text.

The runner supplies these values in the process environment:

| Name | Value |
| --- | --- |
| `CONDUCTIVE_MACHINE_ORIGIN` | The machine origin with no path, `https://api.conductive.build` in production |
| `CONDUCTIVE_WORKSPACE_TOKEN` | The calling workspace's runtime token |
| `CONDUCTIVE_TURN_ID` | The `turnId` of the active runner command |

The tools send the token as a bearer credential.
They send the turn ID in `X-Conductive-Turn-Id`.
The turn ID selects context.
It grants no access by itself.
Workspace creation and session writes require valid active turn context.
All lists and session transcript reads need only the workspace token.

## Sessions

The [session call contract](../docs/protocol/session-calls.md) gives the reach and message rules.
Each session command accepts `--workspace ID`.
Its omission names the calling workspace.
Read and send require `--session ID`.
A session link holds both IDs.
A session link in an answer shows as a session chip.

`sessions create` accepts an optional `--title`, `--message`, choice, and `--request-id`.
The title follows the same Worker rule and underscore guidance as `--name`.
Omitted model or effort uses the calling turn sender's saved default, then the app default.
Without a message, creation returns an empty session with null `message` and `turnId`.
`sessions send` requires nonblank `--message` text and keeps its exact spacing.
An omitted choice keeps the session's model and effort.
The reply gives the actual receiving session with its link, the accepted message, and its turn ID.
A message can join a running turn or open a linked session on its sender's login.
Each tool message ends with `---` and `Sent by:` followed by the sending session link.
Do not answer such a message only to confirm it.

Each write accepts `--request-id` for a stable retry. An omitted ID generates a new opaque ID.
An accepted write also gives `resume`, with state `not_needed`, `queued`, `waiting`, or `failed`.
A failed resume keeps the accepted message and gives its existing error code and message.
Retry the same request ID to check current resume state or retry a refused start without another message.

`sessions list` includes closed sessions and the workspace state.
`sessions read` defaults to concise and the newest transcript text. `--detail full` reads the full kind.
The JSON reply gives `markdown`, `startLine`, `endLine`, `totalLines`, `startOffset`, `endOffset`, and `next`.
Use `--start-line` and `--start-offset` to read from an earlier position.
Lines start at one. Offsets count UTF-16 code units within a line.
Use `next.line` and `next.offset` for the following read until `next` is null.
A long line can span several replies. Keep each fragment to recover all its text.

## MCP

The stdio server exposes `create_workspace`, `list_workspaces`, `list_repositories`, `list_sections`, `list_models`, and `run_mac_command`.
It also exposes `create_session`, `list_sessions`, `send_message`, and `read_session`.
Their optional `workspaceId` defaults to the caller. Read and send require `sessionId`.
Create accepts `firstMessage`, and send requires `text`.
Transcript fields are `detail`, `startLine`, and `startOffset`.
The ID fields of `create_workspace` name the list tools that supply their values.
Its optional `name` uses the same Worker rule as CLI `--name`.
Its description gives the same guidance as the `--name` help.
It supports the `2025-11-25` MCP revision.
It returns this supported revision during initialization.
It never copies an unknown offered revision into its reply.
The client must finish initialization before it calls a tool.
Each stdout line contains one JSON-RPC message.
Notifications produce no replies.
Tool failures return `isError: true`.
Malformed protocol requests return JSON-RPC errors.

The runner must launch a new MCP process for each active turn.
It must pass that turn's environment to the process.
It must stop the process when the turn ends.
A process with an old turn ID cannot serve another turn or a concurrent session.
The Worker rejects stale turn context.

## Mac commands

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

## Image assets

The [Worker asset module](../worker/tools/image-assets.ts) exports `WORKSPACE_TOOL_SOURCES`.
Vite embeds the allowed sources as text through static `?raw` imports.
The asset module uses the source contract in [image-manifest.ts](image-manifest.ts).
A listed module can import types from any module, because Node removes type imports.
Its runtime imports must name only listed modules.
[The summary reader](../src/shared/github-read.ts) has no runtime import, so the tools can embed it.
It needs no filesystem at runtime and reads no environment values or secret files.
The image builder passes these assets to `installWorkspaceTools` from [the installer](../worker/tools/image.ts).

The installer places the sources under `/opt/conductive/agent-tools`.
It installs `/usr/local/bin/conductive` as an executable launcher.
The launcher reads `/run/ascii-secrets/env.sh` at runtime when that file exists.
It then removes `NODE_OPTIONS` from the environment.
It starts the image's private Node 24 by its full path.
[The private Node runtime](../image/runtime.md) gives that path and its update steps.
It never uses the caller's `PATH` or a system Node.
It reports an error when the private Node is not an executable file.
The installation root prefixes the Node path, the program path, and the secrets path.
The software step of each image build installs the private Node.
The tools installer adds no Node runtime.
No workspace token, agent login, or org environment value enters the image assets.

[Production composition](../worker/tools/README.md#production-composition) gives the image build step that installs these tools.
[Workspace tools](../runner/agent-tools.md#workspace-tools) gives their registration for each agent.

## Development

Run `npm run test -- worker/tools` from the repository root.
The tests import every module under `tools/`.
The existing Worker TypeScript project therefore checks these modules with strict settings.
No root test or TypeScript configuration change is needed.

The Mac command tests of the CLI and MCP adapters live in `worker/devices/tools.test.ts`.
They run against a local Worker runtime and cover Stop.
Run them with `npm run test -- worker/devices/tools.test.ts`.

## Key code

- [main.ts](main.ts) runs the process entry point for both tools.
- [cli.ts](cli.ts) parses the CLI and writes its result.
- [mcp.ts](mcp.ts) serves the stdio protocol.
- [client.ts](client.ts) sends authenticated requests and parses responses.
- [session-cli.ts](session-cli.ts) parses session commands and gives their help.
- [session-mcp-tools.ts](session-mcp-tools.ts) describes session tools and their inputs.
- [session-responses.ts](session-responses.ts) checks transcript windows and paired write replies.
- [device-client.ts](device-client.ts) creates Mac commands and polls their returned URL keys.
- [input.ts](input.ts) parses workspace and session requests without changing message text.
- [runtime.ts](runtime.ts) reads runtime configuration without storing credentials.

The MCP implementation follows the official [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle),
[stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
and [tool](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) requirements.
