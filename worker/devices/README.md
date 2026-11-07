# Mac device commands

This feature routes a sandbox command to its active turn sender's connected Mac.
It uses the existing `WORKSPACES` Durable Object binding.
It adds no D1 migration or separate deployment binding.

## Public contract

[device.ts](../../src/shared/device.ts) defines the paths, records, limits, and socket messages.
It has no imports and works in the Mac app's NodeNext build.
[device-read.ts](../../src/shared/device-read.ts) validates unknown wire values.
`DeviceSender` contains the stored sender's ID and display labels.
The Worker never reads these fields from a sandbox request.

- Machine POST `/tools/mac-command` creates a command request.
- Machine GET `/tools/mac-command/:requestKey` reads that request.
- Both require the workspace bearer token and `X-Conducting-Turn-Id`.
- App GET of `deviceCommandsPath` lists a workspace's durable requests.
- App GET of `deviceCommandPath` reads one request.
- App POST of `deviceApprovalPath` relays one approval choice.
- GET `/api/devices/connect?deviceId=...` opens the main-process socket.
- GET `/api/devices/current` identifies the paired desktop connection.
- GET and POST `/api/devices/current/settings` relay local settings operations.

App reads use the existing host, Origin, session, and membership checks.
New app writes run those same checks with a body-free request first.
The application entry bounds their bodies before dispatch.
Each request handler calls [readJsonObject](../http/README.md#json-request-objects).
The body-free gate keeps the forwarded request unread until its owning handler reads it.
The private Durable Object device entry also uses the [shared entry policy](../http/README.md#request-body-limit).
Both entries keep the existing 1,000,000-byte limit.
Public requests use the application's entry budget without a second device limit.
The entry returns HTTP 413 for overflow.
The JSON reader preserves HTTP 415 for an unsupported media type.
Internal JSON replies use `readBoundedJson` with a 3,000,000-byte budget.
That budget leaves room for the accepted request and a full device failure message.

## Main process and renderer

The main-process socket requires `Origin: conducting-app://desktop`.
It requires the desktop session cookie in `Cookie`.
It also requires `Authorization: Bearer <the same cookie value>`.
Only the main process can read that HttpOnly cookie and fill this header.
No socket message, URL, or renderer script receives a session credential.

The connection belongs to its current D1 session and user.
The main process can supply its OS device name in the upgrade query.
Missing display metadata remains null and does not reject the connection.
Request records copy that authenticated connection name and ignore agent-supplied names.
Only that desktop renderer session can approve commands or change settings.
Both public pairing IDs must match the request's selected connection.
Other org members and ordinary browsers can read the pending request.
They cannot approve it.

One authenticated Mac connection is current for each user.
A replacement closes the old socket with `DEVICE_REPLACED_CLOSE_CODE`, 4001.
That client must stop automatic retry until a deliberate local reconnect.
Ordinary transport loss remains retryable.
Replacement fails old work instead of sending it to the new Mac.

The Mac sends `device.ping` every 10 seconds.
Its lease lasts 30 seconds.
A durable alarm checks the lease and the execution watchdog.
Sleep, close, sign-out, or an expired session settles affected work as unavailable.
A restored broker without its old socket also settles its durable pending work.

## Command authorization and lifecycle

The machine token selects the exact workspace object.
That object reads the selected turn and its session from `ChatStore`.
The turn must run, remain active, and belong to an open chat session.
The stored turn selects the sender.
The Worker checks current sender membership, token revocation, and workspace/org state.
It repeats these checks before device decisions and results.

Command records remain outside the `chat:v1:` storage keys.
They retain their sender, exact command/folder, selected connection, reasons, and outcome.
Each record returns `requestKey`, the existing base64url SHA-256 hash of its exact request ID.
Command read and approval URLs use that key.
Retries and device frames keep the raw request ID, including dot and dot-dot IDs.
Large allowed values use chunks below durable KV value limits.
Retries with the same ID and command return the existing request.
A different command needs another ID.

A durable publication marker retries an interrupted state/event update.
The feature publishes numbered `workspace.updated` events through `WorkspaceChat`.
The UI then reads the separate device records.
It needs no new member of the shared workspace event union.
The existing stored chat session supplies the workspace's real agent choice.

Each waiting request contributes to the workspace's `input` state.
An answer clears this request's wait.
The feature restores the prior state only when no request still waits.
Metadata changes do not prevent restoration.
Restoration changes only a current `input` state.
It preserves newer stopped, archived, or error states.
The durable marker also repairs a restart before the D1 input transition.
An accepted request also sets input while the workspace still shows starting.

Stopping or ending the active turn cancels its pending/running local commands.
The durable record becomes `failed` with error code `turn_ended`.
A late decision or result cannot revive a terminal request.
Chat writes and terminal runner events schedule this cleanup with `waitUntil`.
Device cleanup therefore does not delay or fail an otherwise successful chat response.
Command socket references include both workspace ID and request ID.
A result from another connection or workspace cannot complete that request.

## Permission policy and limits

The Worker relays Deny, Allow, Always allow, and the 15-minute workspace choice.
The Mac sends `command.approved` or `command.denied` after its local decision.
Each record starts with a null `startedAt`.
The waiting-to-running transition sets that timestamp once.
Later outcomes retain it, so the UI excludes approval wait from execution time.
The Worker never grants permission from a saved command rule or window.
It never persists local permission settings.
Settings reads and changes wait for a matching main-process operation result.
A failed send or disconnected socket removes and rejects the matching waiter.
Each result relays `done`, `done-not-saved`, or `failed` with the current settings.
An oversized settings result uses a small `settings.failed` frame.
It rejects only the matching waiter with `settings_result_too_large`.
The socket, running commands, and other settings operations remain active.

Commands default to 60 seconds.
Limits above 120 through 1800 seconds require a visible non-empty longer-limit reason.
The combined UTF-8 stdout/stderr cap is 65,536 bytes.
The Worker preserves timeout and truncation outcomes.
It also clips excessive output as a defensive bound.
Each encoded socket frame has a 1,000,000-byte cap.
The Worker watchdog allows the command time limit plus one heartbeat for result delivery.

## Composition and checks

`worker/application.ts` dispatches this feature inside its request budget, before the machine stub or app JSON gate.
`worker/workspace.ts` composes gated device handling with the existing chat class.
Broker object names use the owned `devices:v1:user:` prefix.
Internal calls carry a short-lived signature over their exact target and body hash.
The device proof uses its own HMAC domain and cannot serve as a sign-in session.
Each receiving object checks its own binding identity.
These internal routes have no public app dispatch.

General app mounting, image-build installation, and runner MCP registration remain integration work.
The existing installer embeds the new CLI/MCP modules and shared contract.
The Mac tool itself uses the real Worker dispatch.

Run `npm run test -- worker/devices worker/tools` from the root.
The device tests use the real application, SQLite Durable Objects, D1, and authenticated sockets.
Only the fixture mounts the pre-existing chat and runner paths for setup.
Its Vite bundle uses `write: false`.
Sender selection comes from messages stored through that real chat path.
`DeviceRuntime` takes one clock for lease, watchdog, and command times.
The fixture moves that clock and invokes the real Durable Object alarm through test-only routes.
The publication recovery test interrupts real D1 with a temporary trigger and replays through a browser route.

## Key code

- `runtime.ts`, `router.ts`: feature dispatch and Durable Object composition.
- `access.ts`: stored-turn sender lookup and current access checks.
- `workspace-commands.ts`, `workspace-browser.ts`: machine commands and scoped app records/approvals.
- `broker.ts`, `broker-routes.ts`, `broker-messages.ts`: the authenticated device socket and relays.
- `records.ts`, `state.ts`, `storage.ts`: durable requests, state publication, and chunked values.
- `body.ts`: browser gates that preserve the unread request body.
- `internal.ts`, `proof.ts`, `socket.ts`: bounded internal replies, signatures, and wire bounds.

See [Agent tools](../../docs/protocol/agent-tools.md) and [Mac app](../../docs/protocol/desktop-app.md).
