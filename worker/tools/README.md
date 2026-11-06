# Agent workspace tools

This area handles create and list calls from agents inside a Conducting workspace.
It implements the [agent-tool requirements](../../docs/protocol/agent-tools.md).
It uses the existing [shared contracts](../../src/shared/README.md) and D1 tables.
It adds no migration.

## Handler

`createAgentToolsHandler` takes the database, the machine origin, and `AgentToolServices`.
It accepts GET and POST at `MACHINE_PATHS.workspaces` on that origin only.
It uses workspace bearer authentication instead of browser sessions.
It returns private responses with caching disabled.

The token must name a workspace that is not archived.
Its org must not be deleted.
Its current owner must still belong to that org.
The token must not be revoked.
The handler grants no access to other routes, methods, hosts, or sockets.

GET returns the name, branch, and state of every workspace in the calling org.
It includes other owners' workspaces and archived workspaces.

POST binds the repository and section to the calling org.
It inherits the calling workspace's current owner.
It preserves the first message text.
It reads saved owner preferences when the request omits model or effort.
The injected account policy supplies defaults when no preference exists.
An unresolved required default returns `owner_defaults_unavailable` with status 503.
This response exposes a missing integration dependency.
It does not set a new product default.
A fully specified model and effort need no default lookup.

POST also requires `X-Conducting-Turn-Id`.
The `callingTurn` service must read the active turn from the calling workspace's turn store.
It must return the matching workspace ID, turn ID, and sender user ID.
The handler checks these IDs and the sender's current org membership.
It never uses the workspace owner as a substitute sender.

`createWorkspace` receives one `ToolWorkspaceCreation` value.
The value keeps the inherited owner separate from the first message sender.
The lifecycle service must keep the first message durably and start it at once.
It must use the latest good org image.
It must use the sender's agent login.
It must not leave a new workspace when the sandbox cannot start.

## Image installer

`installWorkspaceTools` takes source assets and an authorized image command callback.
The [asset module](image-assets.ts) exports `WORKSPACE_TOOL_SOURCES`.
Static Vite `?raw` imports embed the allowed sources in the Worker bundle.
The asset module has no runtime filesystem dependency.
The callback can bind `SandboxProvider.runCommand` to the image-build sandbox.
The installer returns only after the command succeeds.
A failed or timed-out command throws a fixed error.
The builder must stop the build before it saves a snapshot when installation fails.

The installer also accepts an optional root folder.
The root folder defaults to `/`.
Each path that the installer writes starts with the root folder.
The launcher's program and secrets paths also start with the root folder.
A test can pass a temporary folder.
Image builds must use the default root.
The default root gives the production paths in [Image assets](../../tools/README.md#image-assets).

The installer writes only program source and the launcher.
It writes no credentials into the image.
The image must already have Node 24 in `/usr/local/bin`, `/usr/bin`, or `/bin`.
The launcher checks these folders in that order, under the installation root.
It chooses executable files and never uses `PATH` to choose Node.
It removes `NODE_OPTIONS` after it reads the rooted secrets file and before it starts Node.
The installer adds no Node runtime.
`WORKSPACE_TOOLS_MCP` supplies the executable and arguments for agent registration.
The runner supplies credentials and active turn context at runtime.

## Production composition

Production code does not use the handler, the installer, or `WORKSPACE_TOOLS_MCP` yet.
Production use requires this composition work:

1. In `worker/application.ts`, route the machine workspace path to this handler before the machine surface stub.
2. Supply `MACHINE_ORIGIN` and `DB` from `AppEnv`.
3. Add the lifecycle and active-turn service dependencies to the composition root.
4. Implement `callingTurn` through the calling workspace Durable Object.
5. Implement `createWorkspace` through the normal workspace lifecycle and chat queue.
6. Supply the account service's default model policy when saved preferences are absent.
7. Pass `WORKSPACE_TOOL_SOURCES` to the installer during each image build, before the image snapshot is saved.
8. Add `WORKSPACE_TOOLS_MCP` to both agents' MCP configuration.
9. Launch a new workspace MCP process for each active turn with that turn's `turnId`.
10. Stop that MCP process when its turn ends.

The runner passes `CONDUCTING_MACHINE_ORIGIN`, `CONDUCTING_WORKSPACE_TOKEN`, and `CONDUCTING_TURN_ID`.
The CLI inherits the same environment from the active agent process.
The MCP process cannot keep one fixed turn ID across turns or concurrent sessions.
The active-turn resolver must reject stale IDs.

No git credential endpoint is implemented here.
[GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens) states its rule.

## Checks

Run `npm run test -- worker/tools` from the repository root.
The handler tests use the existing real local D1 harness.
The CLI and MCP tests call `runToolProcess` and reach this handler.
The tests inject the lifecycle and active-turn services.
These services have no production implementation yet.

## Key code

- [handler.ts](handler.ts) owns the public machine handler and token gate.
- [create.ts](create.ts) resolves the owner, sender, section, and model choice.
- [store.ts](store.ts) queries scoped D1 records.
- [services.ts](services.ts) defines the lifecycle and active-turn integration boundary.
- [image.ts](image.ts) installs the CLI and MCP source into the image.
- [image-assets.ts](image-assets.ts) embeds the allowed sources as Worker-safe text assets.
- [Sandbox tools](../../tools/README.md) describe the commands and runtime environment.
