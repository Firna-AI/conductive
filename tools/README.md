# Workspace CLI and MCP server

These tools let an agent in a running Conductive workspace manage the work of its org.
They create, list, get, rename, move, and archive workspaces.
They create, list, read, get, rename, close, and stop sessions, and send and get messages.
They list repositories and models, list, create, and delete sections, and list, open, and close port previews.
They can also ask to run a command on the active turn sender's connected Mac.
[Workspace tool calls](calls.md) gives each of the 24 calls with its options, rules, and replies.

The tools call fixed machine routes under `/v1/tools/`.
The routes and replies come from the shared contracts [agent-tools.ts](../src/shared/agent-tools.ts), [agent-workspaces.ts](../src/shared/agent-workspaces.ts), [agent-sessions.ts](../src/shared/agent-sessions.ts), [agent-session-paths.ts](../src/shared/agent-session-paths.ts), [agent-sections.ts](../src/shared/agent-sections.ts), and [agent-previews.ts](../src/shared/agent-previews.ts).
Mac commands use `/v1/tools/mac-command` from [the device contract](../src/shared/device.ts).
The [Worker handler](../worker/tools/README.md) verifies the workspace token and the calling turn.

The tools require Node 24.
They use its native TypeScript support and need no runtime npm packages.

## Use

```sh
conductive --help
conductive workspaces list --owner member-id --archived false --limit 20
conductive repositories list
conductive sections list
conductive models list
conductive workspaces create --repository repo-id --message 'Build this feature.'
conductive workspaces create --repository repo-id --message-file task.md \
  --agent codex --model model-name --effort high --section section-id \
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
```

The CLI writes one JSON response to stdout.
It writes a failure message to stderr and returns exit status 1.
Both tools preserve the Worker's error code and message, such as `session_closed: Reopen the session to send a message.`
They give a generic failure for malformed replies and network failures.
Error text never includes the known workspace credential.
A successful reply can report no change, such as `deleted: false` or `closed: false`.
The CLI returns status 0 for it, and MCP returns `isError: false`.
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
Every write requires valid active turn context and acts for the member whose message started that turn.
Every read needs only the workspace token.
[Reach, turns, and rights](calls.md#reach-turns-and-rights) gives the rules of each call.

## MCP

The stdio server exposes the 24 calls of [the call table](calls.md#the-calls).
Their fields take the values of the CLI options.
Their optional `workspaceId` defaults to the caller.
The ID fields name the calls or links that supply their values.
The descriptions say which calls need only the token and which need an active turn.
They also give the reach and the links of the replies.
The workspace name and session title fields give the same guidance as the `--name` help.
Reads have `readOnlyHint: true`.
`archive_workspace`, `delete_section`, and `run_mac_command` have `destructiveHint: true`.
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
The manifest lists 41 sources: 32 modules of this folder and 9 shared modules from `src/shared/`.
The installer writes only the listed sources.
It throws before any command runs when a listed source has no asset.
A listed module can import types from any module, because Node removes type imports.
Its runtime imports must name only listed modules.
[The summary reader](../src/shared/github-read.ts) has no runtime import, so the tools can embed it.
It needs no filesystem at runtime and reads no environment values or secret files.
The image builder passes these assets to `installWorkspaceTools` from [the installer](../worker/tools/image.ts).

The installer places the sources under `/opt/conductive/agent-tools`.
It writes each source with `printf %s` and a shell-quoted copy of its text.
So each installed file keeps the exact bytes of its source, and the command needs no decoder.
The installer splits the writes into several commands, so that each stays under the Linux limit for one argument.
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

A cloud computer keeps the tools of the org image that it starts from.
A full build of the org image installs the current sources.
A refresh of the image and a resume of the computer keep the old tools.
Tools from an older image keep working with the Worker, and they offer only their own calls.

[Production composition](../worker/tools/README.md#production-composition) gives the image build step that installs these tools.
[Workspace tools](../runner/agent-tools.md#workspace-tools) gives their registration for each agent.

## Development

Run `npm run test -- worker/tools` from the repository root.
The tests import every module under `tools/`.
The existing Worker TypeScript project therefore checks these modules with strict settings.
No root test or TypeScript configuration change is needed.

`worker/tools/adapters.test.ts` runs both adapters through `runToolProcess` against the real handler.
It covers the 14 management calls, the list and create options, MCP discovery of the 24 calls, and reads without a turn.
`worker/tools/message-file.test.ts` runs an installed CLI with message files and raw stdin, through an HTTP bridge to the handler.

The Mac command tests of the CLI and MCP adapters live in `worker/devices/tools.test.ts`.
They run against a local Worker runtime and cover Stop.
Run them with `npm run test -- worker/devices/tools.test.ts`.

## Key code

- [main.ts](main.ts) runs the process entry point for both tools. It reads stdin lines only for `conductive mcp`.
- [cli.ts](cli.ts) sends each CLI command to its group and writes the result.
- [cli-options.ts](cli-options.ts) parses the options of each command and finds a help request.
- [cli-help.ts](cli-help.ts) holds the `--help` text.
- [workspace-cli.ts](workspace-cli.ts), [session-cli.ts](session-cli.ts), and [resource-cli.ts](resource-cli.ts) run the workspace, session, and other commands.
- [device-cli.ts](device-cli.ts) runs `mac run`.
- [message-input.ts](message-input.ts) reads `--message-file` from a file or stdin, through a boundary that tests can replace.
- [client.ts](client.ts) joins the typed domain clients into one client.
- [transport.ts](transport.ts) sends authenticated requests, maps errors, and holds the configuration type.
- [workspace-client.ts](workspace-client.ts), [session-client.ts](session-client.ts), and [resource-client.ts](resource-client.ts) make the calls.
- [device-client.ts](device-client.ts) creates Mac commands and polls their returned URL keys.
- [query.ts](query.ts) writes list and read options as query parameters, also `false` and `0`.
- [list-input.ts](list-input.ts) checks the list filters and paging.
- [input.ts](input.ts) parses workspace and session requests without changing message text.
- [responses.ts](responses.ts) checks the workspace, repository, section, and model replies, and the details of one workspace.
- [session-responses.ts](session-responses.ts) checks session lists, transcript windows, session entries, stops, and messages.
- [session-write-responses.ts](session-write-responses.ts) checks the paired admission replies of session create and send.
- [resource-responses.ts](resource-responses.ts) checks section and preview replies.
- [mcp.ts](mcp.ts) serves the stdio protocol and its lifecycle.
- [mcp-dispatch.ts](mcp-dispatch.ts) sends each MCP call to its client method.
- [mcp-tools.ts](mcp-tools.ts) joins the tool descriptors into the list that `tools/list` returns.
- [workspace-mcp-tools.ts](workspace-mcp-tools.ts), [session-mcp-tools.ts](session-mcp-tools.ts), and [resource-mcp-tools.ts](resource-mcp-tools.ts) describe each group of calls and its inputs.
- [metadata-mcp-tools.ts](metadata-mcp-tools.ts) describes `run_mac_command` and the repository, section, and model lists.
- [mcp-schema.ts](mcp-schema.ts) holds the shared description text and schema parts.
- [runtime.ts](runtime.ts) reads runtime configuration without storing credentials.
- [context.ts](context.ts) names the environment values and the turn header.
- [image-manifest.ts](image-manifest.ts) lists the installed sources.

The MCP implementation follows the official [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle),
[stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
and [tool](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) requirements.
