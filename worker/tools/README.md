# Agent workspace tools

This area handles create and list calls from agents inside a Conductive workspace.
It implements the [agent-tool requirements](../../docs/protocol/agent-tools.md).
It uses the existing [shared contracts](../../src/shared/README.md) and D1 tables.
It adds no migration.

The [Mac command feature](../devices/README.md) also uses this area's machine entry point.
`mac-command.ts` forwards only its fixed paths to the token's exact workspace object.
The real application dispatches those paths before the machine stub.
The object resolves the stored active sender and selects that sender's connected Mac.
Command reads use the returned `requestKey` in the URL.
The raw request ID stays in retry input and device messages.
The create handler and Mac command handler use `readJsonObject` from the [shared request reader](../http/README.md#json-request-objects).
The entry owns the 1,000,000-byte cap, and the reader owns the media type policy.
The entry preserves HTTP 413, and the handler preserves HTTP 415.
Direct handler tests also use the shared entry policy before dispatch.

## Handler

`createAgentToolsHandler` takes the database, the machine origin, the app origin, and `AgentToolServices`.
It accepts GET and POST at `MACHINE_PATHS.workspaces`, which is `/v1/tools/workspaces`, on that origin only.
It uses workspace bearer authentication instead of browser sessions.
It returns private responses with caching disabled.

The token must name a workspace that is not archived.
Its org must not be deleted.
Its current owner must still belong to that org.
The token must not be revoked.
The handler grants no access to other routes, methods, hosts, or sockets.

GET returns the number, web link, name, branch, and state of every workspace in the calling org.
The link uses the configured app origin, not the machine request origin.
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

POST also requires `X-Conductive-Turn-Id`.
The `callingTurn` service must read the active turn from the calling workspace's turn store.
It must return the matching workspace ID, turn ID, and sender user ID.
The handler checks these IDs and the sender's current org membership.
It never uses the workspace owner as a substitute sender.

`createWorkspace` receives one `ToolWorkspaceCreation` value.
The value keeps the inherited owner separate from the first message sender.
The lifecycle service must keep the first message durably and start it at once.
It must use the latest good org image.
It must use the sender's agent login.
A failed first start keeps the accepted workspace and its number.
The create call reports that failure.

An org suspension refuses the shared workspace token rule before agent tool calls.
The same rule prevents Mac commands and their later approvals and results.

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
The launcher's program, secrets, and Node paths also start with the root folder.
A test can pass a temporary folder.
Image builds must use the default root.
The default root gives the production paths in [Image assets](../../tools/README.md#image-assets).

The installer writes only program source and the launcher.
It writes no credentials into the image.
The launcher starts Node only by the full path from [`imageNodeExecutable`](../lifecycle/image-runtime.ts).
That path names the private Node that each image build installs, as [The private Node runtime](../../image/runtime.md) says.
The launcher reports an error when no executable file is at that path.
It never uses `PATH` or a system Node folder.
It removes `NODE_OPTIONS` after it reads the rooted secrets file and before it starts Node.
The installer adds no Node runtime.
`WORKSPACE_TOOLS_MCP` supplies the executable and arguments for agent registration.
The runner supplies credentials and active turn context at runtime.
The installed launcher preserves explicitly supplied origin, workspace token, and turn ID while it loads the saved env file.
Only an absent runtime value falls back to that file.

## Production composition

The production machine route calls `productionAgentTools` in [composition.ts](composition.ts).
It resolves the calling turn through `Workspace.callingToolTurn` and the real chat store.
It reads the configured account default model when the owner has no saved preference.
Creation calls the normal workspace lifecycle with a separate owner and sender.
It waits for creation to finish before it returns the workspace and session.

Each image build calls `installWorkspaceTools` with `WORKSPACE_TOOL_SOURCES`
before it installs the rest of the image software.
The two runner providers register [`WORKSPACE_TOOLS_MCP`](../../src/shared/agent-tools.ts) beside `computer`.
The [runner](../../runner/README.md) supplies the machine origin, workspace token,
and active turn ID at runtime. The image stores no such credential.

No git credential endpoint is implemented here.
[GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens) states its rule.

## Checks

Run `npm run test -- worker/tools` from the repository root.
The handler tests use the existing real local D1 harness.
The CLI and MCP tests call `runToolProcess` and reach this handler.
The tests inject the lifecycle and active-turn services.
The production services live in [composition.ts](composition.ts).
The real-object route tests live in [worker/features](../features/).

## Key code

- [handler.ts](handler.ts) owns the public machine handler and token gate.
- [create.ts](create.ts) resolves the owner, sender, section, and model choice.
- [store.ts](store.ts) queries scoped D1 records and builds list links from the app origin.
- [services.ts](services.ts) defines the lifecycle and active-turn integration boundary.
- [image.ts](image.ts) installs the CLI and MCP source into the image.
- [image-assets.ts](image-assets.ts) embeds the allowed sources as Worker-safe text assets.
- [Sandbox tools](../../tools/README.md) describe the commands and runtime environment.
