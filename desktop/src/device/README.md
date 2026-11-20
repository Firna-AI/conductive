# Mac device commands

The main process connects the signed-in, awake Mac to the Worker.
It reads the desktop cookie from the Chromium session.
Its authenticated session read checks app access before opening the device socket.
While the user waits, it repeats that read with the existing backoff:
1, 2, 4, 8, 16, then at most 30 seconds between attempts.
It connects after access arrives with the same cookie and no new launch.
Sleep, sign-out, cookie expiry, and app exit cancel the pending attempt.
Unauthorized and replaced sockets keep their existing stop behavior.
The renderer sends approval and settings choices through the Worker relay.
It receives no cookie or local command bridge.

Local permissions belong to the signed-in account on this Mac.
The app keeps exact allowed commands and workspace deadlines under its private user-data directory.
A workspace grant until Stop stays only in memory.
A quit, a sign-out, an expired or rejected sign-in, or another account ends it.
Keep turns the running 15 minutes of a workspace into a grant until Stop.
The settings action `start-workspace-until-stop` starts a grant until Stop of one workspace, with the workspace name that the Worker adds.
It reports done or failed, never done but not saved, and it runs each waiting request of that workspace.
Start, Keep, and Extend prepare their effective settings before changing permission.
A reply above the device message budget fails without increasing permission.
Start and Keep apply only after the transport accepts their reply.
Extend saves and applies after the size check, before sending its reply, because its outcome depends on the save.
The app reads saved 15-minute grants and exact allowed commands from existing permission files.
The Mac applies these local permissions to each request, regardless of the stored workspace Mac access field.
[Mac access](../../../docs/protocol/capabilities.md#mac-access) states the grant requirements.
The settings name comes from the OS hostname.
The connection sends that hostname as display metadata for command requests.
Remove and Stop revoke permissions in memory even when saving fails.
The revocation stays in force for the rest of the app run, including reconnects.
A failed save can restore the old permission after a full app restart.
Extend sets a running 15-minute grant's end to the Mac's current time plus 15 minutes.
It leaves a grant until Stop unchanged.
It keeps the workspace name and never starts a grant that ended or does not exist.
The Mac saves the new end before replacing the grant and its timer.
A failed save keeps the old end and timer and reports failed.
Extend reports done only after a successful save.
Settings replies report whether the change was saved.
Each reply includes the current effective settings.
A settings reply that is too large fails its own operation and keeps commands connected.

Always allow has a budget of 900,000 UTF-8 bytes for the JSON-encoded list of always-allowed commands.
A save above the budget fails.
The saved list stays unchanged in memory and on disk.
A new request for the same command can then use Allow.
Allow runs the command once and saves no rule.
Permission files that already hold a larger list still load.

Commands run in the user's shell with bounded output and time.
Folders `~` and `~/...` use the local OS account's home directory.
Other folder values stay exact. The app does not expand shell variables in them.
Sleep, sign-out, cookie replacement, connection loss, and app exit cancel the command process groups.
A replacement connection stops automatic retries on the old Mac.
Wake or a cookie change can connect it again.

Background requests show a native notification.
A click restores the window and opens the request's workspace.
It does not approve the request.
See the [Mac app protocol](../../../docs/protocol/desktop-commands.md) for the device requirements.

Focused device checks use these commands:

```sh
npm --prefix desktop run test:logic -- src/device
npm --prefix desktop run test:electron -- tests/device-command.spec.ts
npm --prefix desktop run test:electron -- tests/approval-region.spec.ts
```

Build the desktop app before the Electron check.
That check uses an isolated relay and the real main process, cookie store, shell, and power-event hooks.
It checks command results and process-group cancellation on sleep and sign-out.
The existing shell check continues to check renderer isolation and session persistence.
The [Mac notification test](../../tests/device-notification.spec.ts) reopens a closed window and keeps its request after Dock activation.
Native notification display and click behavior also need a Mac smoke check.

The main-process socket uses `ws` because the native WebSocket API cannot set authenticated upgrade headers.
`@types/ws` supplies its TypeScript types.

### Key Code

- [Device composition](main.ts) connects cookie, power, notification, and app-exit hooks.
- [Device session factory](session-factory.ts) keeps each account's permission store across connections and disposes all stores at app exit.
- [Device connection](connection.ts) owns authentication, pairing, heartbeat, and reconnect state.
- [Device session](session.ts) owns pending requests, scoped approvals, settings operations, and cancellation.
- [Device settings](settings.ts) reports change outcomes and checks settings replies against the device message budget.
- [Local permissions](permissions.ts) owns exact command rules, the Always allow budget, workspace deadlines, and grants until Stop.
- [Permission preparation](permission-extend.ts) builds uncommitted workspace changes and preserves their failure outcomes.
- [Permission file](permission-file.ts) reads and writes the saved permissions, without the grants until Stop.
- [Command runner](runner.ts) owns time and output limits through injected process and clock boundaries.
- [Device contract](../../../src/shared/device.ts) supplies shared message types, routes, and wire limits.
