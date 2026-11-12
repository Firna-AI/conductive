# Workspace object connections

This page belongs to the [Worker backend](README.md#workspace-object-connections).
It gives the socket roles of the `Workspace` class, the alarms of the
object, the Mac heartbeat, the work that keeps the object active, and
the wake tests.

One `Workspace` class serves each workspace object and each Mac broker object.
It accepts server sockets in three roles through the platform's [hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/): the events socket of a browser tab, the runner socket, and the Mac device socket.
These sockets keep their wire formats and protocol versions, so installed Mac apps and runners from older images need no change.

`WorkspaceSockets` in [native-sockets.ts](native-sockets.ts) is the only caller of `acceptWebSocket`.
It gives each socket a trusted role, and it sends each message, close, and error event to the owner of that role.
The constructor of `WorkspaceLifecycle` restores the open sockets inside `blockConcurrencyWhile`.
So no request, RPC call, alarm, or socket event runs before the restore ends.
A restore registers saved state only. It starts no model work, and it sends no second `welcome`, `device.connected`, or history.
A socket that its owner cannot restore closes.

Each attachment holds a format version, the role, a connection ID of at most 128 code units, and a generation.
A browser attachment also holds the app origin and the workspace number of its tab.
State that can grow and public metadata live in durable records: raw records under the `native:` key prefix, and the pending command and repair records of chat.
No attachment or native record holds a cookie, a workspace token, an agent login, a turn token, an env value, a transcript, or a growing ID list.

A wake keeps the original sockets and their state.
A real disconnect, a replacement, and a restart that closes the sockets still run their cleanup, such as the runner disconnect hook, the Mac drop, and the tab removal.
The runner and the Mac keep a durable generation and a retirement tombstone. So a closing older socket cannot take back the authority of a newer connection.
A close or an error can be the first event after a wake. Its owner then reads the saved state, and the cleanup runs once.
Production upgrades always pass a physical socket. Only a physical socket, accepted or restored, saves, arms, and retires native state.
A feature test can give a tab or runner owner an abstract peer inside the real object. That peer uses the same access logic.
Its access checks use the scheduler that the test injects. Production has no default timer for them.
[Open connections](chat/access.md#open-connections) and [Sleep and restore](devices/README.md#sleep-and-restore) give the state of each role.

## Alarms

`WorkspaceAlarms` in [features/alarms.ts](features/alarms.ts) keeps the due time of each source in its `alarm:<source>` marker, and it sets the one platform alarm.
The security sources are `browser`, `runner`, and `devices`. They use raw storage, so a member fence cannot refuse their writes.
The regular sources are the lifecycle tasks, `github`, `previews`, and `continue`. They use the guarded receiver storage, as [Lifecycle ownership](members/README.md#lifecycle-ownership) says.
[The object alarm scheduler](lifecycle/alarm-scheduler.md) gives the shared rules, such as the lifecycle run lease and the steps at the end of each run.

`Workspace.alarm` calls `WorkspaceAlarmRunner.alarm` in [features/workspace-alarm.ts](features/workspace-alarm.ts).
It takes the due security sources before any member fence or lifecycle check.
It runs the tab expiry at once. Runner, Mac, and regular work run as tracked tasks of `WorkspaceAlarmTasks`.
So the handler returns before a slow access read or provider call ends.
A due security source keeps a retry deadline until its owner replaces or clears it.
The regular task then checks the member fence and the org lifecycle generation. Then it calls `runWorkspaceAlarms` in [workspace-alarms.ts](workspace-alarms.ts).
While a fence pauses that work, a numeric deferral moves the platform alarm time of the regular sources. Each regular due time stays in its marker.
A member suspension clears the regular sources in two guarded stages, and both stages keep each security deadline, as [Lifecycle ownership](members/README.md#lifecycle-ownership) says.
Its final stage also cancels the lifecycle run lease and the deferral. So a suspended object keeps no regular retry. A Restore clears the deferral in its guarded transaction.
Provider and lifecycle writes stay fenced.

Tab and runner access checks run every 15 seconds. Tab grants last at most 30 seconds. Mac session checks run at least every 10 seconds.
The tab and runner owners save their next check before they read access.
Each owner closes a connection at its stored deadline, by the current clock.
A late alarm or a failed access read never extends a grant.

## The Mac heartbeat

The platform answers the exact Mac ping `{"type":"device.ping"}` with `{"type":"device.pong"}`, and the object does not wake.
That automatic response applies to every hibernation socket of one object.
So only a verified Mac broker object sets it, when it accepts or restores a Mac socket. The shared constructor never sets it.
So no browser or runner socket gets a Mac pong. The runner checks the token of each frame, also a Mac ping, before it reads the frame.
An automatic pong grants no command permission, and the session check still runs, as [Sleep and restore](devices/README.md#sleep-and-restore) says.

## Work that keeps the object active

An object whose open sockets all use these three roles can hibernate between its alarms and requests.
This work keeps the object active:

- An open terminal or preview socket. Its bridge holds an outbound socket to the sandbox, which cannot hibernate, as the [terminal](terminal/README.md) and [preview](previews/README.md) READMEs say.
- A request that waits, such as a Mac settings reply, a file read or diff, an attachment copy, an input activity write, a title model call, or a preview HTTP stream.
- A tracked alarm task, until it ends.

The code closes no terminal, drops no pending promise, and weakens no limit to make the object sleep.
So a workspace object stays active while a terminal socket is open, also while that socket is idle.
The Mac broker is a separate object, so it can sleep while a workspace object stays active.
No measurement of production sleep time, wake time, or cost saving exists.

## Wake tests

A wake test calls `unsafeEvictDurableObject(scriptName, 'Workspace', { name, webSockets: 'hibernate' })` of the pinned Miniflare.
The client sockets stay open while a new object instance restores.
Each fixture entry returns a random instance marker from a test-only route, and the test checks that the marker changed.
The marker never enters a product route or a wire frame.
An eviction without `webSockets` closes the sockets, so it tests the restart path, not a wake.
The native alarm handler returns before its tracked work ends. So a fixture that calls `alarm()` also awaits the protected `settledAlarms()`.
The native test harness and the lifecycle fixtures run only the stored alarms that are due, through `advanceScheduledAlarms`. They await `settledAlarms()` after each one.
An automatic pong does not show that queued socket work ended. So the device fixture reads its readiness route after each socket message.
A native fixture starts its client socket closes and `runtime.dispose()` together, and it awaits both.
[Chat backend tests](chat/tests.md) and the [device checks](devices/README.md#composition-and-checks) name the fixtures.
