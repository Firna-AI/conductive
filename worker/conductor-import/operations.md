# Import operations

This page belongs to the [import area](README.md).
It describes how the Worker relays an import operation between the desktop page and its paired Mac.
[Device operations](../../docs/protocol/desktop-import.md#device-operations) states the requirements.

## The route

- The desktop page posts one `ImportOperationRequest` to `conductorImportOperationsPath(orgId)`. The body holds the exact `DevicePairing` and one `ImportAction`.
- The actions are `status`, `dismiss`, `scan`, `upload` with `localWorkspaceId`, and `retry` with `localWorkspaceId` and `reservationId`.
- The page starts one `upload` operation for each selected workspace. Several operations can run at the same time.
- The device broker serves the route, because it needs the paired Mac connection. `importBrokerRoute` in [`broker-route.ts`](broker-route.ts) checks the pairing with `requireDevicePairing`, as [Mac device commands](../devices/README.md#import-operations) says. The connection must have the user and the sign-in session of the page, and both pairing IDs must match.
- `ImportBroker.start` in [`broker.ts`](broker.ts) checks import access: a current sign-in session, app access, membership, and an org and a user that are not deleted or suspended. It sends `import.operation` to that connection, and it answers at once.
- The answer is an `application/x-ndjson` stream with `Cache-Control: no-store`. Each line is one `ImportPublicEvent`. The page reads each complete line with `readImportPublicEvent`.
- The stream ends after `done` or `failed`, or after an `error` event. When the page cancels the request or the stream, the operation closes.
- The page never supplies a source path, a manifest, a GitHub address, an upload link, or a Mac event.

## Mac frames

- The Mac main process gets `import.operation` with the operation ID, the org ID, and the action.
- It answers with `import.frame` messages. Each frame holds the operation ID, a sequence that starts at 0, and one `ImportDeviceEvent`.
- The broker applies one frame at a time for each operation. It ignores a frame with another sequence, from another connection, or for an operation that it did not start on that connection.
- `applyImportEvent` in [`broker-events.ts`](broker-events.ts) accepts only the events of the action. Every action takes `status`, `done`, and `failed`. A scan also takes `scan` rows. An upload or a retry also takes `reserve`, the controls of its own reservations, `progress`, and the results of its own local workspace.
- After the broker applies a frame, it sends `import.ack` with the same sequence and the private `ImportControlResult`. Only then does the operation accept the next sequence.
- A failed frame gets `import.error` with a safe code and message. The broker sends the same failure to the page as an `error` event, then it closes the operation.
- When an operation closes before its end, the broker sends `import.cancel`, so that the Mac stops its local work.
- An operation closes when its connection drops, when the device lease expires, when import access ends, when the page cancels, or when a frame does not parse. A drop includes a replacement, a close, and a sleep of the Mac.
- No operation and no result moves to another connection or another Mac. An explicit retry is a new operation. Only its durable reservation carries over.

## Backpressure and bounds

- Import frames skip the serial queue of the device broker. So a slow page or a long import never delays a command, a settings relay, or a heartbeat.
- An import uses no settings waiter and no settings timer.
- The broker writes each public event to the page stream and awaits the writer. A slow reader therefore holds back the `import.ack`, and so the next Mac frame.
- Before and after each slow step, the broker checks again that the operation is open, that its connection is current and within its lease, and that import access holds.
- Each encoded frame and each public event line stays below 1,000,000 UTF-8 bytes. `importWire` refuses a larger one.
- `importPage` splits a list after it counts the complete encoded envelope, with its JSON escaping. The broker splits the scan rows into as many `scan` events as they need.
- A large `repository.prerequisites` result goes as numbered `import.part` frames, by `sendImportControl` of [`broker-socket.ts`](broker-socket.ts). The Mac answers each with `import.part.ack`, and the broker waits for it before it sends the next part. The final `import.ack` then has the same receipt ID and empty lists.
- Each other result goes in one `import.ack`. `importLfsPage` sizes each `repository.lfs` request page, so that the request and its largest possible `import.ack` both fit one frame.
- No limit applies to the length of a list or a result, or to the number of parts.

## What the page gets

- A `scan` event holds only the local ID, the name, the repository, the branch, the session count, and the upload size of each row, with the row state that the Worker adds.
- `importScanState` in [`scan-state.ts`](scan-state.ts) gives the state: `available`, `unavailable`, `imported` with its workspace ID, or `unfinished` with its stored bytes and its expiry.
- An `unfinished` row gives its reservation ID only to its importer. Another member gets `null`, and so cannot retry that source.
- A `progress` event holds the public reservation, without the source fingerprint, and the in-flight bytes that the Mac reports. Only verified parts count in `storedBytes`.
- `status`, `result.files`, `result.sessions`, `done`, and `failed` pass through. A `complete` event names the local ID and the new workspace ID.
- The page never gets an upload link, a manifest, a native session recipe, a repository proof, an LFS availability result, a source path, or a byte of the upload.
- The Worker keeps no copy of a scan list or of an import result.
