# Workspace CLI and MCP server

These tools create and list Conducting workspaces from a running workspace.
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

The stdio server exposes `create_workspace` and `list_workspaces`.
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
- [input.ts](input.ts) parses the shared create request without changing message text.
- [runtime.ts](runtime.ts) reads runtime configuration without storing credentials.

The MCP implementation follows the official [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle),
[stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
and [tool](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) requirements.
