# Workspace CLI and MCP server

These tools create and list Conducting workspaces from a running workspace.
They can also ask to run a command on the active turn sender's connected Mac.
They use the machine route in the [shared contract](../src/shared/agent-tools.ts).
The [Worker handler](../worker/tools/README.md) verifies the workspace token and the calling turn.

The tools require Node 24.
They use its native TypeScript support and need no runtime npm packages.

## Use

```sh
conducting workspaces list
conducting workspaces create --repository repo-id --message 'Build this feature.'
conducting workspaces create --repository repo-id --message 'Review the change.' \
  --agent codex --model model-name --effort high --section section-id
conducting mcp
conducting mac run --command 'pwd' --folder '/Users/me/project' --reason 'Check the local folder'
```

Create inherits the calling workspace's org and owner.
An omitted model or effort uses the owner's default.
An omitted section uses the org's default section.
The first message runs as the sender of the calling turn.
List returns every workspace in the org, including archived workspaces.

The CLI writes one JSON response to stdout.
It writes a failure message to stderr and returns exit status 1.
`conducting --help` works without runtime credentials.

The runner supplies these values in the process environment:

| Name | Value |
| --- | --- |
| `CONDUCTING_MACHINE_ORIGIN` | The configured machine origin |
| `CONDUCTING_WORKSPACE_TOKEN` | The calling workspace's runtime token |
| `CONDUCTING_TURN_ID` | The `turnId` of the active runner command |

The tools send the token as a bearer credential.
They send the turn ID in `X-Conducting-Turn-Id`.
The turn ID selects context.
It grants no access by itself.
Create requires valid active turn context.
List needs only the workspace token.

## MCP

The stdio server exposes `create_workspace`, `list_workspaces`, and `run_mac_command`.
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

The Mac command route is mounted in the real Worker.
General image installation and runner tool registration remain composition work.

## Image assets

The [Worker asset module](../worker/tools/image-assets.ts) exports `WORKSPACE_TOOL_SOURCES`.
Vite embeds the allowed sources as text through static `?raw` imports.
The asset module uses the source contract in [image-manifest.ts](image-manifest.ts).
It needs no filesystem at runtime and reads no environment values or secret files.
The image builder passes these assets to `installWorkspaceTools` from [the installer](../worker/tools/image.ts).

The installer places the sources under `/opt/conducting/agent-tools`.
It installs `/usr/local/bin/conducting` as an executable launcher.
The launcher reads `/run/ascii-secrets/env.sh` at runtime when that file exists.
It then removes `NODE_OPTIONS` from the environment.
It selects the first executable Node file in `/usr/local/bin`, `/usr/bin`, and `/bin`, in that order.
It ignores the caller's `PATH` when it selects Node.
It reports an error when those folders contain no executable Node file.
The installation root prefixes these Node paths, the program path, and the secrets path.
The image must already have Node 24 in one of these system folders.
The installer adds no Node runtime.
No workspace token, agent login, or org environment value enters the image assets.

The image builder and the runner do not exist yet.
The [Worker README](../worker/tools/README.md#production-composition) lists the required composition work.

## Development

Run `npm run test -- worker/tools` from the repository root.
The tests import every module under `tools/`.
The existing Worker TypeScript project therefore checks these modules with strict settings.
No root test or TypeScript configuration change is needed.

## Key code

- [main.ts](main.ts) runs the process entry point for both tools.
- [cli.ts](cli.ts) parses the CLI and writes its result.
- [mcp.ts](mcp.ts) serves the stdio protocol.
- [client.ts](client.ts) sends authenticated requests and parses responses.
- [device-client.ts](device-client.ts) creates Mac commands and polls their returned URL keys.
- [input.ts](input.ts) parses the shared create request without changing message text.
- [runtime.ts](runtime.ts) reads runtime configuration without storing credentials.

The MCP implementation follows the official [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle),
[stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
and [tool](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) requirements.
