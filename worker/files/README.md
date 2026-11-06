# Workspace files backend

This module serves the Files and Changes API for Conducting.
It keeps the runner's last tree and branch changes in workspace Durable Object storage.
It also sends file and diff requests to the connected runner.
A disconnected file read uses the shared sandbox provider on the server.

The lifecycle milestone owns the workspace Durable Object and root routes.
This module exports the hooks for that later wiring.
It changes no root route or shared contract.

## Integration

Create one `WorkspaceFiles` instance for each workspace Durable Object.
Pass `durableFilesStorage(ctx.storage)` and a unique request ID function to its constructor.
The storage adapter commits a manifest and JSON chunks in one storage transaction.
Its interface provides `get`, `getMany`, and an atomic `write` of updates and removals.
Each chunk has at most 65,536 JavaScript string characters.
This bounds each stored value without limiting repository size.
Keep one instance active in an object to serialize file updates and reads.

After the owner accepts and authenticates a runner connection, call `files.connect(connectionId, send)`.
Use a fresh `connectionId` for each physical connection, including a reconnect of the same runner stream.
The `send` callback sends a `RunnerFileCommand` over the owner's runner socket.
Call `files.disconnect(connectionId)` when that socket closes.
Pending reads fail when their connection closes or when their request signal aborts.

The workspace owner keeps the shared handshake, stream cursor, event numbers, confirmations, and resend rules.
It passes each accepted file event to `await files.state.apply(connectionId, event)` in event order.
It confirms the event only after this write succeeds.
It sends the accepted event to browser tabs only when the hook returns `true`.
The hook rejects a malformed payload and ignores an old connection or stale tree revision.
It keeps the last tree until the current connection sends its new full snapshot.
Tree revisions can restart on a new connection.
The owner handles duplicate `changes.updated` envelopes because that payload has no revision.

Pass each file or diff result to `files.runner.receive(connectionId, payload)`.
These results use request IDs and bypass the numbered chat event history.
The broker checks the response type, connection, requested path, default branch, and file byte count.
The owner must handle socket health and detach a connection that has failed.

## HTTP handler

`createFilesHandler(options)` returns a standalone handler with the existing request gate.
It takes a `Request` and `AppEnv` and returns a private `Response`.
It checks sign-in, host, Origin, org membership, workspace ownership, and archive state before file resources.
Each org member can read its active workspaces.
The handler serves the shared tree, content, download, changes, and diff paths.
It returns the last stored lists while the sandbox sleeps.
Before the first report, it returns `file_unavailable`.

Required options:

- `maxFileBytes`: the backend's file size limit in bytes. No product default exists here.
- `workspaceFiles`: a resolver for the authorized workspace's `WorkspaceFilesPort`.
- `repositoryRoot`: the absolute checkout directory in the sandbox for that workspace.
- `fetch`: the server's provider transport.
- `now`: the clock for the existing request gate.

The port's methods are asynchronous, so a later Durable Object adapter can implement them.
Its `read` and `diff` methods return `null` when the runner is disconnected.
An adapter must preserve that result.
It must carry request cancellation to the object or detach pending requests when its connection ends.
The handler gets the default branch from the workspace's repository record in D1.
It does not use a browser-supplied base branch.

The repository root is required because lifecycle and runner code own the checkout folder.
The Boat read adapter accepts roots under `/home/user/`.
It appends only a repository-relative file path.
The runner must resolve and confine file paths to its own checkout, including symlinks.
The Boat API applies its own canonical path checks.

The fallback gets `SandboxProvider` through `orgSandboxProvider`, with the authorized user's ID.
The provider owns the fixed routes, headers, account pinning, and encrypted key handling.
Its `readFile` requests base64 so a binary file keeps its bytes.
The [sandbox response policy](../sandbox/README.md#response-byte-limits) defines the reply budgets and the metadata fallback.
The handler reports the file size with `file_too_large`.
The provider checks that both replies name the requested absolute path.
The Boat read adapter converts valid UTF-8 to text and preserves a leading byte order mark.
It checks the returned size and decoded byte length against the configured limit.
Provider error messages never reach the browser.
The [Boat read-file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file) defines that route.

A disconnected diff returns `file_unavailable` and makes no Boat call.
The Boat fallback does not resume a stopped sandbox.
Boat may therefore refuse a file read until the cloud computer is ready.

## Development

Run `npm run test -- worker/files` from the repository root with Node 24.
The storage tests use SQLite Durable Object storage in Miniflare and evict the object before reload.
The API tests use local D1, the existing fake runner, and FakeBoat.
No migration is required.

### Key Code

- [workspace.ts](workspace.ts) exposes the workspace integration object and RPC port.
- [handlers.ts](handlers.ts) exposes the gated HTTP handler and its required options.
- [state.ts](state.ts) applies snapshots and tree updates and keeps branch changes.
- [storage.ts](storage.ts) adapts Durable Object storage and writes the chunks atomically.
- [runner.ts](runner.ts) matches file and diff commands to their results.
- [boat.ts](boat.ts) converts the provider's file read result for the browser.
- [data.ts](data.ts) reads the workspace and repository relationship from D1.

See the [shared contracts](../../src/shared/README.md),
[backend fakes](../test-support/README.md), and
[file requirements](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
