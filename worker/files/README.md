# Workspace files backend

This module serves the Files and Changes API for Conductive.
It keeps the runner's last tree and branch changes in workspace Durable Object storage.
It joins the numbered parts of each full runner report before it stores the complete report.
It also sends file and diff requests to the connected runner.
A disconnected file read uses the shared sandbox provider on the server.

The workspace Durable Object owns one `WorkspaceFiles` over the chat storage.
Production routes forward the original request to that object.
Its handler preserves cancellation and reads the captured checkout folder from D1.

## Integration

Create one `WorkspaceFiles` instance, called `files` here, for each workspace Durable Object.
Pass `durableFilesStorage(ctx.storage)` and a unique request ID function to its constructor.
The storage adapter commits a manifest and JSON chunks in one storage transaction.
Its interface provides `get`, `getMany`, and an atomic `write` of updates and removals.
Each chunk has at most 65,536 JavaScript string characters.
This bounds each stored value without limiting repository size.
The projection is the last complete tree and branch changes that the API serves.
The assembly state holds the stored report parts and the revision progress of the current runner stream.
Both use storage keys that start with `files:`.
Keep one instance active in an object.
An unavailable-tree event marks the stored tree and keeps its entries and revision.
Before any complete tree, the marked tree has revision zero and no cached entries.
Only a complete snapshot clears the mark.
A delta or an incomplete report keeps it.

Runner file events reach this module through one of two integrations.
The combined integration joins report parts in the runner transaction of the chat backend.
The standalone integration takes only complete reports.

### Combined integration with the chat backend

The [chat backend](../chat/integration/README.md#milestone-9-files) owns the runner stream, its cursor, and its confirmations.
It creates `RunnerFileReports` on `ChatTransaction.files`.
That adapter writes in the chat transaction of the runner message.
So the assembly state, the projection, the history event, and the cursor commit together before the confirm.

On each `hello`, the chat backend calls `beginStream(streamId)`.
A new stream discards the stored parts of the old stream and starts both revision sequences again.
The last complete tree and changes stay, and the projection then belongs to the new stream.
A reconnect of the same stream keeps its revisions and pending parts.

Each new file event that passes the event checks goes to `accept(event)`.
It checks each part against the stored parts of its report before it writes anything.
It stores each tree or changes part as a part manifest and JSON chunks, together with the assembly state.
Each chunk has at most 65,536 JavaScript string characters.
The chat backend applies the byte limits to the raw runner event.
Its filter can then add masked display labels, so a stored part can be larger than those limits.
A part stored as one value, without a manifest, stays readable.
A newer revision, a refusal, and a new stream remove each obsolete part with its chunks.
After the last part, `accept` joins the entries in part order.
A complete changes report must have a summary that counts its files and the sum of their added and removed lines.
`accept` then applies the complete report to the projection and returns it for the history and the browser tabs.
It returns `null` while parts are pending and for an identical repeated part.
It applies a tree delta only when the delta has the next tree revision and no tree report is incomplete.
It throws `InvalidRunnerReport` for a part or a delta that breaks the shared contract.
Other errors are not refusals. The chat backend then closes the runner connection without a confirm.

For each refused file event, the chat backend stores a refusal marker and calls `refuse(type)`.
That call discards the incomplete report of the refused kind. A tree delta has the tree kind.
`storedReportGenerations` gives the newest applied or incomplete revision of a kind, and the revision of its incomplete report.
The chat backend reads it and the refused report identity before that call.
The [report repairs](../chat/report-repairs.md) compare its stream, revision, and part number with the stored revisions.
The last complete tree and changes stay in the projection while parts are pending or refused.
The chat backend's `runnerEventStored` hook is a notification after the commit and the confirm.
It must not apply a file report again.

On this path, `files` serves the API from the same Durable Object storage.
Its `tree` and `changes` methods read the complete projection.
For each accepted runner socket, call `files.runner.attach(physicalConnectionId, send)` with a fresh ID.
Call `files.runner.detach(physicalConnectionId)` when that socket closes.
Do not call `WorkspaceFiles.connect` on this path.
It moves the projection from the runner stream to the physical connection.
The next complete report then fails, and the runner stream stops at that event.

### Standalone complete reports

`WorkspaceFiles.connect` starts the standalone integration.
After the owner accepts and authenticates a runner connection, call `files.connect(connectionId, send)`.
Use a fresh `connectionId` for each physical connection, including a reconnect of the same runner stream.
Call `files.disconnect(connectionId)` when that socket closes.
The instance serializes the file updates and reads of this integration.

The workspace owner keeps the shared handshake, stream cursor, event numbers, confirmations, and resend rules.
It passes each accepted file event to `await files.state.apply(connectionId, event)` in event order.
This hook takes complete reports and joins no parts.
The default runner recording uses part 1 of 1 for each full report.
Use the combined integration for multipart reports.
The owner confirms the event only after this write succeeds.
It sends the accepted event to browser tabs only when the hook returns `true`.
The hook rejects a malformed payload and ignores an old connection or stale tree revision.
It keeps the last tree until the current connection sends its new full snapshot.
Tree revisions can restart on a new connection.
The owner handles duplicate `changes.updated` envelopes because the complete browser payload has no revision.

### File and diff results

In both integrations, the `send` callback sends a `RunnerFileCommand` over the owner's runner socket.
Pass each file or diff result to `files.runner.receive(connectionId, payload)` with the ID of its socket.
In the combined integration, these results reach the owner through the chat backend's `receiveFileResult` hook.
These results use request IDs and bypass the numbered chat event history.
Real file paths and base branches stay unchanged for every operation.
Separate masked display labels come from the shared output field policy.
The gated handler fills those labels from the actual start capture for
runner results, direct opens, cached reports, and provider fallback.
The browser receives no secret list. Raw operational paths can therefore
contain marked values; the access protocol states this exposure.
The broker checks the response type, connection, requested path, default branch, and file byte count.
Pending reads fail when their connection closes or when their request signal aborts.
The owner must handle socket health and detach a connection that has failed.

## HTTP handler

`createFilesHandler(options)` returns a standalone handler with the existing request gate.
It takes a `Request` and `AppEnv` and returns a private `Response`.
It checks sign-in, host, Origin, org membership, workspace ownership, and archive state before file resources.
Each org member can read its active workspaces.
The handler serves the shared tree, content, download, changes, and diff paths.
It returns the last stored lists while the sandbox sleeps.
Before the first tree report or unavailable-tree mark, it returns `file_unavailable` for the tree.

Required options:

- `maxFileBytes`: the backend file size limit in bytes. Production uses `FILE_READ_MAX_BYTES`, which is 5,242,880 bytes. It applies to each file version and each patch field.
- `workspaceFiles`: a resolver for the authorized workspace's `WorkspaceFilesPort`.
- `repositoryRoot`: the absolute checkout directory in the sandbox for that workspace.
- `fetch`: the server's provider transport.
- `now`: the clock for the existing request gate.

The production handler calls the local port inside the workspace object.
The outer Worker forwards its request through `fetch`, with its cancellation signal.
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
The provider owns the fixed routes, headers, organization pin, and the app's Boat key.
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

Org suspension refuses file resources with 403 `org_suspended` before any runner or provider call.
Chat history remains readable through its separate access path.

## Development

Run `npm run test -- worker/files` from the repository root with Node 24.
The tests that use `createFilesStorage` in `test-support/storage.ts` run SQLite Durable Object storage in Miniflare.
Its `evict` evicts the object, so that a test can check a reload.
`report-storage.test.ts` uses the native SQLite storage of the production workspace object.
It checks that a part stored as one value stays readable, and that each removal also removes the chunks.
The API tests use local D1, the existing fake runner, and FakeBoat.
The part joining and report repair tests run through the chat backend:
`npm run test -- worker/chat/runner-file-parts.test.ts worker/chat/runner-files-durable.test.ts worker/chat/runner-repair-parts.test.ts worker/chat/runner-receipt-crash.test.ts worker/chat/runner-grown-reports.test.ts`.
`runner-grown-reports.test.ts` checks tree and changes parts that masking makes larger than one storage value.
It runs on the production workspace object with the native SQLite value limit.
No migration is required.

### Key Code

- [Production composition](../features/workspace.ts) mounts the gated handler and resolves the captured checkout folder.
- [workspace.ts](workspace.ts) exposes the workspace integration object and RPC port.
- [handlers.ts](handlers.ts) exposes the gated HTTP handler and its required options.
- [state.ts](state.ts) applies snapshots and tree updates and keeps branch changes.
- [runner-reports.ts](runner-reports.ts) joins runner report parts and applies each complete report in the caller's transaction.
- [report-storage.ts](report-storage.ts) keeps the assembly state and the stored parts of each report kind, as part manifests and chunks. Its `storedReportKeys` lists each part key and chunk key that a removal needs.
- [report-generation.ts](report-generation.ts) reads the newest stored revision and the incomplete revision of a report kind for repair checks.
- [runner-input.ts](runner-input.ts) parses a runner file event with its revision and part fields.
- [storage.ts](storage.ts) adapts Durable Object storage and writes the chunks atomically.
- [runner.ts](runner.ts) matches file and diff commands to their results.
- [boat.ts](boat.ts) converts the provider's file read result for the browser.
- [data.ts](data.ts) reads the workspace and repository relationship from D1.

See the [shared contracts](../../src/shared/README.md),
[backend fakes](../test-support/README.md),
[runner event rules](../../docs/protocol/agent-runner.md#the-agent-runner),
[lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates), and
[file requirements](../../docs/protocol/workspace-tools.md#files-and-changes).
