# Workspace files backend

This module serves the Files and Changes API for Conductive.
It keeps the runner's last tree and branch changes in workspace Durable Object storage.
It checks the numbered parts on arrival and joins each full runner report at its last part.
It also sends file and diff requests to the connected runner.
Each diff request names the base branch of the workspace's last complete changes report.
Without that report, it names the stored workspace base branch, with the repository default as a fallback.
The runner compares from the merge base with the current workspace branch.
A disconnected file read uses the shared sandbox provider on the server.

The workspace Durable Object owns one `WorkspaceFiles` over the chat storage.
Production routes forward the original request to that object.
Its handler gives each pending read the signal of the request that reaches the object.
It reads the captured checkout folder from D1.

## Integration

Create one `WorkspaceFiles` instance, called `files` here, for each workspace Durable Object.
Pass `durableFilesStorage(ctx.storage)` and a unique request ID function to its constructor.
The adapter provides `get` and `getMany` for reads.
Its `transaction` callback provides `get`, `getMany`, `put`, and `delete` in one storage transaction.
The `delete` call reports whether it removed a key.
Each chunk has at most 65,536 JavaScript string characters.
This bounds each stored value without limiting repository size.
The projection is the last complete tree and branch changes that the API serves.
The assembly state holds the stored report parts and the revision progress of the current runner stream.
Both use storage keys that start with `files:`.
Keep one instance active in an object.
An unavailable-tree event marks the stored tree and keeps its entries, revision, and omitted entry count.
`markFilesMoved` in [storage.ts](storage.ts) gives the same mark after a [repository change](../lifecycle/repository-change.md#publication), in its publication transaction, and drops the stored changes of the old folder.
So the Changes API returns `file_unavailable` until the runner reports the new folder, and the next complete tree clears the mark.
Before any complete tree, the marked tree has revision zero and no cached entries.
Only a complete snapshot clears the mark.
A delta or an incomplete report keeps it.

The stored projection has one of two layouts.
The old layout stores each list as one JSON text in chunks.
The bucket layout splits each list into 64 buckets by a hash of the item path, with an order text for the list order.
This module reads both layouts and writes list data in the bucket layout.
The manifest keeps each list's omission metadata with its other fields.
The tree manifest records the tree revision beside a known omitted entry count.
Tree reads use that count only when the two revisions match. A previous Worker can advance the tree during rollback while keeping the earlier count and its revision.
A full report replaces its list and that metadata together. A list without the field keeps it absent.
A full report writes buckets with changed digests.
It writes the order text when it changes or when it cannot read the stored order text.
A tree delta reads buckets one at a time. A delta with one or more removes visits each tree bucket at most once because a folder's entries can be in any bucket.
A delta of absent-path removes leaves the row and order chunks alone.
An empty delta reads no row bucket. It can set the omitted entry count in the manifest.
A delta without a count keeps a valid saved count and advances its revision with the tree.
A changes manifest keeps the revision of its list when the revision is known.
A changes delta reads the touched buckets and the order text.
It checks the digests of the buckets that it reads.
It checks the new summary from the previous summary and the affected rows.
It writes changed buckets, changed order text, and the new manifest.
A delta with only a header reads and writes no list chunks.
A connection reset updates the manifest. An unavailable-tree mark and a repository move update the manifest of a bucket projection without reading list items.
The first list write or tree mark of an old projection converts retained lists one entry at a time.
It reads the old chunks in bounded batches.
A repository move converts the old tree and deletes the old Changes chunks.
The same transaction writes the bucket data and manifest and removes the old keys.
The reader release can read this layout and converts it back to the old layout on its next write after a rollback.
An older Worker that writes a full report without omission metadata stores that list without it.
A damaged projection gives HTTP 502 `file_unavailable` when read.
A write that only discards damaged chunks finishes and logs a warning.
Cleanup stops at the first missing key in each chunk sequence.

Runner file events reach this module through one of two integrations.
The combined integration joins report parts in the runner transaction of the chat backend.
The standalone integration takes only complete reports.

### Combined integration with the chat backend

The [chat backend](../chat/integration/README.md#files) owns the runner stream, its cursor, and its confirmations.
It creates `RunnerFileReports` on `ChatTransaction.files`.
That adapter runs the files transaction callback in the chat transaction of the runner message.
So the assembly state, the projection, the history event, and the cursor commit together before the confirm.

On each `hello`, the chat backend calls `beginStream(streamId)`.
A new stream discards the stored parts of the old stream and starts both revision sequences again.
The last complete tree and changes stay, and the projection then belongs to the new stream.
A reconnect of the same stream keeps its revisions and pending parts.
The runner welcome accepts the changes delta offer when `CHANGES_DELTAS` is `"on"`.
Both settings allow a valid delta from the runner's outbox. [The agreement](../../docs/protocol/changes-deltas.md#the-agreement)

Each new file event that passes the event checks goes to `accept(event)`.
It checks each part's revision, part number, and part count on arrival.
It reads the stored copy of a repeated part to check that the copies are identical.
The assembly state keeps the omission metadata of part 1 for either kind of report.
For a changes report, it also keeps the base branch, the status counts, and the listed summary of part 1.
`accept` compares those fields with each later part on arrival.
A later part with other fields is invalid.
An older assembly state can lack these fields.
If the saved fields are absent or malformed, `accept` reads part 1 once when the next new part arrives.
It saves the recovered fields with the new part.
The counts are the current branch's `unpushedCommits` and the runner's raw status count, `uncommittedFileCount`.
Older runners can omit either count.
The stored report and API keep an omitted count absent.
`accept` stores each tree or changes part with the assembly state.
It stores each part as a manifest and JSON chunks.
Each chunk has at most 65,536 JavaScript string characters.
The chat backend applies the byte limits to the raw runner event.
Its filter can then add masked display labels, so a stored part can be larger than those limits.
A part stored as one value, without a manifest, stays readable.
A newer full report, a refused full report, and a new stream remove each obsolete part with its chunks.
When the last part arrives, `accept` loads the stored parts once.
It joins all entries in part order.
It checks the saved parts for matching omission metadata because a previous Worker can have stored parts during a rollback.
It refuses the last part if a path occurs more than once.
It also refuses the last part if the report is empty and has more than one part.
For a changes report, it checks that the summary counts the listed files and their added and removed lines.
`accept` then applies the complete report to the projection and returns it for the history and the browser tabs.
It returns `null` while parts are pending and for an identical repeated part.
It applies a delta only when the delta has the next revision of its kind and no full report of that kind is incomplete.
A changes delta needs the stored changes list of its stream.
The stream sequence gives the previous revision when an older list omits it.
The delta checks cover the paths, upsert indexes, and new summary. [Changes deltas](../../docs/protocol/changes-deltas.md#checks-and-repairs)
When the delta reads a damaged saved list, its transaction rolls back.
This also applies when a live conversion for an older tab reads the damage.
The refusal transaction drops that list and records the repair and cursor together.
The next complete changes report writes its buckets from an empty projection.
It throws `InvalidRunnerReport` for a part or a delta that breaks the shared contract.
A storage failure closes the runner connection without a confirm, so the runner can resend the event.

For each refused file event, the chat backend stores a refusal marker and calls `refuse(type)`.
That call discards the incomplete report of the same kind after a refused `files.snapshot` or `changes.updated` event.
A refused `files.changed` or `changes.changed` keeps the parts of an incomplete report.
`storedReportGenerations` gives the newest applied or incomplete revision of a kind, and the revision of its incomplete report.
The chat backend reads it and the refused report identity before that call.
The [report repairs](../chat/report-repairs.md) compare its stream, revision, and part number with the stored revisions.
The projection keeps the last complete lists while replacement parts are pending.
The chat backend's `runnerEventStored` hook is a notification after the commit and the confirm.
It must not apply a file report again.

On this path, the tree and changes routes read the projection in the chat queue.
The `WorkspaceFiles` port serves file and diff requests and reads the cached changes report for the diff base.
For each accepted runner socket, call `files.runner.attach(physicalConnectionId, send)` with a fresh ID.
A ready runner socket that the workspace object restores after a wake attaches again with the same ID.
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
Its `tree` and `changes` methods each read their own list of the projection.

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
The owner handles duplicate `changes.updated` envelopes through the runner stream cursor.

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
The broker checks the response type, connection, requested path, requested base branch, and file byte count.
Pending reads fail when their connection closes or when their request signal aborts.
A pending read is a live request, so it keeps the workspace object active until it ends.
The owner must handle socket health and detach a connection that has failed.

## HTTP handler

`createFilesHandler(options)` returns a standalone handler with the existing request gate.
It takes a `Request` and `AppEnv` and returns a private `Response`.
It checks sign-in, host, Origin, org membership, workspace ownership, and archive state before file resources.
Each org member can read its active workspaces.
The handler serves the shared tree, content, download, changes, and diff paths.
It returns the last stored lists while the sandbox sleeps.

The list routes load the output filter after the request gates.
They wait for the shared read-state recovery when it must run.
One chat-queued view gives the list and its `stateRead`.
This field gives the event number, the first open repair failure of that list, and the repository ID at that event number.
Omission metadata is part of the list payload.
The changes payload also gives the list revision when it is known.
The handler filters the list after the queued read.
A missing list gives HTTP 503 `file_unavailable` with `stateRead`.
For the tree, this can occur before the first tree report or unavailable-tree mark.
See [The state of a new tab](../../docs/protocol/workspace-events.md#the-state-of-a-new-tab).

Required options:

- `maxFileBytes`: the backend file size limit in bytes. Production uses `FILE_READ_MAX_BYTES`, which is 5,242,880 bytes. It applies to each file version and each patch field.
- `fileLists`: the tree and changes readers that supply the list and `stateRead`.
- `workspaceFiles`: a resolver for the authorized workspace's `WorkspaceFilesPort` for content, downloads, and diffs.
- `repositoryRoot`: the absolute checkout directory in the sandbox for that workspace.
- `fetch`: the server's provider transport.
- `now`: the clock for the existing request gate.

The outer Worker forwards the original request with `stub.fetch`.
The runtime does not pass the signal of the outer request to the object, because `wrangler.jsonc` does not turn on `request_signal_passthrough`.
No test or run shows that a browser disconnect ends a pending read.
The production handler calls the local port inside the workspace object.
Its `read` and `diff` methods return `null` when the runner is disconnected.
An adapter must preserve that result.
It must carry request cancellation to the object or detach pending requests when its connection ends.
For each diff, the handler names the `baseBranch` of the workspace's last complete changes report.
That report names the base that the runner of this workspace selected.
So the diff compares with the same base as the Changes list.
The workspaces of one repository in an org share one repository default branch in D1.
Continue in one of them can change it.
So that update does not change the diff base of a workspace that has a changes report.
Without a complete changes report, the handler uses the stored workspace base from D1.
A null base uses the repository default branch.
It does not use a browser-supplied base branch.
The runner uses the requested name only when the current branch has no `gh-merge-base` Git setting, as [The comparison base](../../runner/file-reports.md#the-comparison-base) says.
A local base change, such as the move of Continue, can come before the next changes report.
Until that report arrives, a runner that reads the `gh-merge-base` setting replies with its new base.
The broker then refuses the reply.
The diff fails with HTTP 502 `file_unavailable`.

The repository root is required because lifecycle and runner code own the checkout folder.
The provider fallback accepts roots under `/home/user/`.
It appends only a repository-relative file path.
The runner must resolve and confine file paths to its own checkout, including symlinks.
The Boat API applies its own canonical path checks.

The fallback gets `SandboxProvider` through `orgProviderForAccount`, with the authorized user's ID and the provider account of the workspace.
The provider owns the fixed routes, the headers, and the key of that account, such as the app's Boat key or E2B key. On Boat, it also owns the organization pin.
Its `readFile` returns base64 so a binary file keeps its bytes.
Boat requests base64 from its API. E2B reads raw bytes through envd and encodes them on the server.
The [sandbox response policy](../sandbox/response-limits.md) defines the reply budgets and the metadata fallback.
The handler reports the file size with `file_too_large`.
The provider validates the requested absolute path in its file metadata.
Boat also validates the content reply path. E2B raw replies have no path field.
The fallback in `boat.ts` converts valid UTF-8 to text and preserves a leading byte order mark.
It checks the returned size and decoded byte length against the configured limit.
Provider error messages never reach the browser.
The [Boat read-file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file) defines that route.

A disconnected diff returns `file_unavailable` and makes no provider call.
Neither provider fallback resumes a stopped sandbox.
A disconnected read can therefore fail until the cloud computer is ready.

Org suspension refuses file resources with 403 `org_suspended` before any runner or provider call.
Chat history remains readable through its separate access path.

## Development

Run `npm run test -- worker/files` from the repository root with Node 24.
`createFilesStorage` in `test-support/storage.ts` runs the transaction callback on a staged copy in Node.
The adapter sends the staged writes to SQLite Durable Object storage in Miniflare.
Its `evict` evicts the object, so that a test can check a reload.
The bucket reader tests use `writeBucketProjection` in `test-support/bucket-builder.ts` and a fixed record with literal keys, symbols, and manifest values.
The writer tests check which buckets each operation reads and writes.
They check conversion from old records to buckets and inject a failure during a standalone write to check rollback.
[files-projection-commit.test.ts](../chat/files-projection-commit.test.ts) checks connection resets and repository moves at both native chat commit boundaries.
`report-storage.test.ts` uses the native SQLite storage of the production workspace object.
It checks that a part stored as one value stays readable, and that each removal also removes the chunks.
The API tests use local D1, the existing fake runner, and FakeBoat.
`runner-part-checks.test.ts` checks the storage reads, changes fields, and older assembly state.
The part joining and report repair tests run through the chat backend.
Run `npm run test -- worker/chat/runner-file worker/chat/runner-repair-parts.test.ts worker/chat/runner-receipt-crash.test.ts worker/chat/runner-grown-reports.test.ts`.
`runner-grown-reports.test.ts` checks tree and changes parts that masking makes larger than one storage value.
It runs on the production workspace object with the native SQLite value limit.
File reports remain in Durable Object storage.
The D1 workspace schema holds the base branch.

### Key Code

- [Production composition](../features/workspace.ts) mounts the gated handler and resolves the captured checkout folder.
- [workspace.ts](workspace.ts) exposes the workspace integration object and RPC port.
- [handlers.ts](handlers.ts) exposes the gated HTTP handler and its required options.
- [list-reads.ts](list-reads.ts) reads each list and its cutoff from the same chat view.
- [state.ts](state.ts) applies snapshots and tree updates and keeps branch changes.
- [runner-reports.ts](runner-reports.ts) checks runner report parts on arrival and applies each complete report in the caller's transaction.
- [report-storage.ts](report-storage.ts) keeps the assembly state with the comparison fields of part 1.
  It stores each part as a manifest and chunks.
  Its `storedReportKeys` lists each part key and chunk key that a removal needs.
- [report-generation.ts](report-generation.ts) reads the newest stored revision and the incomplete revision of a report kind for repair checks.
- [runner-input.ts](runner-input.ts) parses a runner file event with its revision and part fields.
- `readFilesManifest` and `readFileList` read the manifest and one list in either layout. `markFilesMoved` marks the projection after a repository move. `dropSavedChanges` removes a damaged changes list during a refusal. [storage.ts](storage.ts)
- [bucket-layout.ts](bucket-layout.ts) defines the bucket layout in its doc comment and parses the bucket manifest.
- [bucket-read.ts](bucket-read.ts) reads one list of the bucket layout from its buckets and its order text.
- `writeBucketList` writes changed buckets and list order. [bucket-write.ts](bucket-write.ts)
- `writeTreeDelta` applies an ordered tree delta. [bucket-delta.ts](bucket-delta.ts)
- `applyChangesDelta` checks and applies an ordered changes delta. [bucket-changes-delta.ts](bucket-changes-delta.ts)
- `convertFilesProjection` converts old lists during the transaction that changes the projection. [bucket-convert.ts](bucket-convert.ts)
- [runner.ts](runner.ts) matches file and diff commands to their results.
- [boat.ts](boat.ts) converts the provider's file read result for the browser.
- [data.ts](data.ts) reads the workspace and repository relationship from D1, with the sandbox ID and its provider account.

See the [shared contracts](../../src/shared/README.md),
[backend fakes](../test-support/README.md),
[runner event rules](../../docs/protocol/agent-runner.md#the-agent-runner),
[lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates),
[file requirements](../../docs/protocol/workspace-tools.md#files-and-changes), and
[file report requirements](../../docs/protocol/file-reports.md).
