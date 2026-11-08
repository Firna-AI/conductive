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

- Machine POST `/v1/tools/mac-command` creates a command request.
- Machine GET `/v1/tools/mac-command/:requestKey` reads that request.
- Both require the workspace bearer token and `X-Conductive-Turn-Id`.
- App GET of `deviceCommandsPath` lists a workspace's durable requests.
- App GET of `deviceCommandPath` reads one request.
- App POST of `deviceApprovalPath` relays one approval choice.
- GET `/api/devices/connect?deviceId=...` opens the main-process socket.
- GET `/api/devices/current` identifies the paired desktop connection.
- GET and POST `/api/devices/current/settings` relay local settings operations.

App reads use the existing host, Origin, session, and membership checks.
New app writes run those same checks with a body-free request first.
The application entry bounds their bodies with the [shared entry policy](../http/README.md#request-body-limit) before dispatch.
Each request handler calls [readJsonObject](../http/README.md#json-request-objects).
The body-free gate keeps the forwarded request unread until its owning handler reads it.
Public request bodies keep the existing 1,000,000-byte limit, with no second device limit.
The entry returns HTTP 413 for overflow.
The JSON reader preserves HTTP 415 for an unsupported media type.
Calls between the workspace object and the device broker use Durable Object RPC, as [Composition and checks](#composition-and-checks) says.
They add no HTTP body or reply budget.
Cloudflare [limits](https://developers.cloudflare.com/workers/runtime-apis/rpc/#limitations) one serialized RPC message to 32 MiB, far above one device frame.

Org suspension revokes org workspace tokens and the shared token rule checks the stored org state.
The command checks repeat before approvals and results.
The body-free browser gate also checks the original write method.
Account-level Mac connections remain available for the member's other orgs.

## Main process and renderer

The main-process socket requires `Origin: conductive-app://desktop`.
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
Storing pending work schedules that alarm for the earliest execution deadline or lease end.
Sleep, close, sign-out, or an expired session settles affected work as unavailable.
A restored broker without its old socket also settles its durable pending work.

## Command authorization and lifecycle

The machine token selects the exact workspace object.
That object reads the selected turn and its session from `ChatStore`.
The turn must run, remain active, and belong to an open chat session.
The stored turn selects the sender.
`activeStoredTurn` in `access.ts` is that read, and it does not enter the chat queue.
So only a caller that already holds the queue uses it, such as the git credential route.
`activeDeviceSender` enters the queue, calls it, and keeps the token and membership checks.
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

Stopping or ending the active turn cancels its pending/running local commands.
The durable record becomes `failed` with error code `turn_ended`.
A late decision or result cannot revive a terminal request.
Chat writes and terminal runner events schedule this cleanup with `waitUntil`.
Device cleanup therefore does not delay or fail an otherwise successful chat response.
Command socket references include both workspace ID and request ID.
A result from another connection or workspace cannot complete that request.

## Workspace state

A durable publication marker retries an interrupted state/event update.
Each request change publishes one numbered `workspace.updated` event through `WorkspaceChat`, also when the shown state stays `input`.
The UI then reads the separate device records.
It needs no new member of the shared workspace event union.
The existing stored chat session supplies the workspace's real agent choice.

Each waiting request contributes to the workspace's `input` state.
An answer clears this request's wait.
`input` shows over starting, working, ready, and unread.
Newer stopped, archived, or error states show over a waiting request.
The durable marker also repairs a restart before the D1 input transition.

`publishDeviceState` in `state.ts` enters `authorizedWorkspaceOperation` of the chat once.
Inside it, the injected `DeviceStateProjection` calls the shared writer of the workspace object, as [The shown state](../lifecycle/workspace-object.md#the-shown-state) says.
That writer reads the current lifecycle state and the current waiting requests.
So lifecycle activity, a heartbeat, or a start-step update cannot hide a waiting request.
When the last wait ends, the current lifecycle state supplies the shown state, and the feature keeps no previous-state baseline.
`DeviceRuntime.waiting` reads the durable records directly, so the writer never waits for the record queue.
The record queue still owns the request changes.

`DeviceRuntime`, `WorkspaceDevices`, and `DeviceRecords` take the projection as an optional last constructor argument.
`createWorkspaceIntegration` in `worker/chat/workspace-integration.ts` supplies it.
Without it, or without a lifecycle state, the device-only fallback runs in the same queue-owned operation:

- The feature restores the prior state only when no request still waits.
- Metadata changes do not prevent restoration.
- Restoration changes only a current `input` state, and it preserves newer stopped, archived, or error states.

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
`worker/workspace.ts` serves gated device handling before chat.
`createWorkspaceIntegration` builds the `DeviceRuntime` with the existing chat class and the shared state writer.
Broker object names use the owned `devices:v1:user:` prefix.

The workspace object and the device broker call each other through one RPC method, `Workspace.deviceOperation`.
The `WORKSPACES` binding is the capability for these calls.
Only trusted Worker code may hold that binding or its stubs.
The receiving object first checks that the target name maps to its own Durable Object ID.
A mismatch fails with 403 `device_forbidden` before any record is read.
The object then runs only its fixed broker or workspace operations, with the existing access checks.

Each call returns a plain typed value.
A failure returns its HTTP status, code, and message as data.
`deviceCall` turns that failure into a local `HttpError`.
Invalid operation values fail with 400 `invalid_input`.
An unexpected error fails with 500 `internal_error` and a generic message.
No HTTP route dispatches an internal operation directly.

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
`worker/chat/integration/workspace-device-projection.test.ts` runs the composed workspace object with a real waiting request.
D1, the list, and a reopen keep `input` through lifecycle activity, a start-step update, and a heartbeat.
When the turn ends, the request fails with `turn_ended`, and D1 shows `ready`.

## Key code

- `runtime.ts`, `router.ts`: feature dispatch, the RPC operation entry, and Durable Object composition.
- `access.ts`: `activeStoredTurn`, the shared read of the running stored turn, and `activeDeviceSender` with the current access checks.
- `workspace-commands.ts`, `workspace-browser.ts`: machine commands and scoped app records/approvals.
- `broker.ts`, `broker-routes.ts`, `broker-messages.ts`: the authenticated device socket and relays.
- `records.ts`, `storage.ts`: durable requests and chunked values.
- `state.ts`: `publishDeviceState`, the queue-owned call of the shared state writer, and the device-only fallback.
- `body.ts`: browser gates that preserve the unread request body.
- `internal.ts`, `socket.ts`: the RPC client with its plain reply types, and wire bounds.

See [Agent tools](../../docs/protocol/agent-tools.md) and [Mac app](../../docs/protocol/desktop-app.md).
