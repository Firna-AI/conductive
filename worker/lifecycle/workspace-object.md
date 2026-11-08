# Workspace Durable Object

This page belongs to the [workspace lifecycle README](README.md). It
describes the Durable Object of each workspace and of each image
coordinator. It gives their names, the lifecycle steps, the alarm, the
start logs, the event socket, the event publication, the turn recovery,
and the shown state.

`Workspace` in [`worker/workspace.ts`](../workspace.ts) is the Durable
Object class of the `WORKSPACES` binding. [`runtime.ts`](runtime.ts) gets
each object by name, with the Western Europe location hint. Each name has
one role:

- The workspace ID names the workspace object of one workspace.
- `org-image:<orgId>` names the image coordinator of one org.

Its public methods are internal RPC, not HTTP routes. This folder uses the
`WorkspaceLifecycleEndpoint` interface of
[`workspace-runtime.ts`](workspace-runtime.ts). Inside the object,
`createWorkspaceIntegration` in
[`workspace-integration.ts`](../chat/workspace-integration.ts) calls these
lifecycle steps from the chat hooks, as
[The workspace lifecycle](../chat/integration/README.md#the-workspace-lifecycle)
says:

- `registerLifecycleTurn` records a turn and its sender before the turn
  goes out, after a check of the org membership, and marks its session as
  running. `finishLifecycleTurn`, or a report that the turn ended, removes
  it. These records keep the running sessions. They give no GitHub access,
  as the [machine route](README.md#machine-route) says.
- `reportRunnerLifecycle` takes each runner event that ordered runner
  ingestion accepts. `runnerLifecycleDisconnected` takes a disconnect.
- `acknowledgeLifecycleFirstMessage` clears the pending first message of
  the create. The admission keeps its own copy for repeats.

The `alarm` of the class serves both roles. For an image coordinator, it
advances the running build or refresh by one step, or starts the daily
refresh. A transient Boat error keeps the job step for the next alarm,
within the [retry window](image-builds.md#provider-retries), except a source
command start. For a workspace object, it:

- runs the queued start of a create or a resume, one phase at a time
- repairs the running turns from the committed chat before its deadline
  and idle decisions, as [Turn recovery](#turn-recovery) says
- stops the sandbox after 30 minutes without activity or a running turn
- extends the Boat auto-stop deadline while a turn runs, and applies the
  state in that reply even when the saved runner flag says connected
- reads the sandbox state from Boat while the runner is not connected
- runs the disk retention restart 13 days after each confirmed stop
- retries the sandbox delete of a failed create

The deadline and stop actions use the sandbox state in each Boat reply.
When Boat refuses an action, they read the sandbox state once. The
[Boat update reference](https://docs.boat.dev/api/reference/sandboxes/update-sandbox)
does not promise a refusal for an archived sandbox, so the code handles a
reply and a refusal. A confirmed stop or a Boat `error` state clears all
running sessions and turn records. A Boat `error` state sets the workspace
error state, with no resume and no delete. A stop reply that still shows an
active sandbox keeps the workspace state and schedules another alarm.

The object encrypts the env values and output chunks of a start. To release
a log, it joins all stdout parts, then all stderr parts, and masks the
joined text with the saved env values. So a value that crosses the stdout
and stderr boundary stays hidden. Only `MaskedStartLog.mask` can create a
`MaskedStartLog`, because the constructor is private. Internal RPC carries
only encrypted log data, and the caller decrypts and masks it again.
Browser responses keep the plain string log of the shared contract.

The `fetch` of the class opens the workspace event socket at
`workspaceEventsPath` of `src/shared/events.ts`. Forward the browser's
upgrade request without changes, because the object runs the browser gate
itself. The socket sends the stored history first, then each new event.

After a failed create removes its records, `failedCreationEvents` in
[`failed-creation-events.ts`](failed-creation-events.ts) serves that path
only to the sender of the first message, after the browser gate. It sends
each page of the stored public history once, with the `message.accepted`
event of the first message, and then closes. All pages share one cutoff,
and they go out in one task of the chat queue. The browser does not
restore the composer from this replay. The tab that sent the create keeps
its first message in memory, as
[Creation recovery](../../src/app/creation-recovery.md) says.

`WorkspaceEventJournal` in [`durable-journal.ts`](durable-journal.ts) keeps
ordered lifecycle publication and suppresses unchanged updates. The
production `Workspace` sends each `workspace.updated` and `start.updated`
event to `WorkspaceChat`, through `commitWorkspaceEvent` or the `publish`
argument of a chat hook. Chat stores and numbers the only workspace event
history, with chat and lifecycle events.

## Turn recovery

The chat stores and confirms each runner event before its hook updates
the lifecycle, as the
[hooks](../chat/integration/README.md#hooks-and-events) say. A failed Boat
or D1 call, or a restart, can lose that update. The runner does not send a
confirmed event again. So the lifecycle repairs its turns from the
committed chat at two points:

- at each runner `hello`, through `DurableLifecycle.recoverTurns`, before
  `runnerReady`, also on a stream that is not ready
- in the lifecycle step of the alarm, through `advanceLifecycleAlarm` in
  [`durable-alarm.ts`](durable-alarm.ts), before the Boat state read, the
  deadline step, and the idle stop

`recoverLifecycleTurns` in [`durable-turns.ts`](durable-turns.ts) makes
the repair. It makes no Boat call, and it skips a stopped, error, or
archived workspace.

- The `recoverTurns` hook of `createWorkspaceLifecycle` reads the committed
  chat through `readChatRecovery` of `WorkspacePlatform`. It gets the
  running and stopping turns, and the stored time of the newest turn end.
  Both callers hold the chat queue, so this read does not enter it again.
- The hook replaces the turn records with those turns, by turn ID. So a
  late end of an old turn finds no record, and it cannot remove a newer
  turn of the same session.
- The running sessions come from the same turns. A `starting` workspace
  stays `starting`. Otherwise, a running session gives `working`. Without
  one, `input` and `unread` stay, and `working` becomes `ready`.
- `lastActivityAt` becomes the later of its stored value and the stored
  time of the newest turn end. So a repair, a hello, a heartbeat, or a
  restart never starts a new 30-minute idle period.
- On the normal path, a runner turn event also gives
  `DurableLifecycle.turn` its stored `occurredAt`, not the current time.
- Each repair starts device cleanup through the `chatRecovered` hook of
  `WorkspacePlatform`.
- The repaired state goes through the shared state writer, as
  [The shown state](#the-shown-state) says. So a repaired `ready` cannot
  hide a waiting Mac request.
- An error in the repair at a `hello` closes the runner connection, and
  the next `hello` repairs again. An error in the alarm sets the next
  alarm in 30 seconds.

The chat keeps these values in its summary record:

- `WorkspaceSummaryProjection` in
  [`workspace-summary.ts`](../chat/workspace-summary.ts) commits with each
  runner receipt, its event, and the cursor. It keeps the running and
  stopping turns, the latest agent title, and the time of the newest turn
  end.
- The turn end time is the stored `occurredAt` of the first end of a
  running turn, also of a refused end. A late or repeated end does not
  move it. A failed send that puts a running turn back in the queue counts
  as an end at that time.
- An older record without the title and the end time gets them once, from
  the turn records and every history page under one cutoff.
- `readChatRecovery` in
  [`workspace-integration.ts`](../chat/workspace-integration.ts) reads the
  record and the running turn records with `chat.store.read`, through
  `ChatTransaction.lifecycleRecovery`.

## The shown state

`WorkspaceStateProjection` in
[`workspace-state-projection.ts`](workspace-state-projection.ts) is the
one writer of the shown state of a workspace: the state in D1 and its
`workspace.updated` event. The `changed` hook of the lifecycle and each
change of a Mac request call it while they hold the chat queue. It adds no
queue of its own.

- It reads the raw lifecycle state with `lifecycle.read`, and the waiting
  Mac requests through the `deviceWaiting` hook of `WorkspacePlatform`. It
  reads the latest committed agent title through `readChatRecovery`. No
  read enters a queue again.
- A waiting request shows `input` over `starting`, `working`, `ready`, and
  `unread`. `stopped`, `error`, and `archived` show over a waiting request.
- When the name in D1 differs from the latest committed agent title, it
  writes that title to D1 before the state. So no `workspace.updated` of
  this writer carries an older title.
- When that title write fails, the writer writes no D1 state and publishes
  nothing. The raw lifecycle state, with its idle time, is already stored.
  The next run of the writer tries the title again, then publishes.
- A lifecycle change from a runner hook passes a publisher, and it does not
  fail on that error. So the title repair at a runner `hello` is best
  effort, and the hello, the readiness, and the live text stay available.
- Each other lifecycle change throws the title error to its caller. In the
  lifecycle step of the alarm, the existing catch sets the next alarm in 30
  seconds. The error also delays the chat stop and the device cleanup of a
  `stopped` or `error` state until the writer succeeds.
- A change of a Mac request throws that error too. So the device feature
  keeps its durable publication marker and tries again, as the
  [Mac device README](../devices/README.md#workspace-state) says.
- In `runnerEventStored`, a failed title write is a hook error, so it
  closes the runner connection.
- The read and Resume replies of a workspace also take the name from the
  latest committed title, with no D1 write. Until the repair succeeds, D1
  and the workspace list can still show the older name.
- The raw lifecycle state, and its idle and activity times, stay as they
  are. The `updatedAt` in D1 never moves behind a later stored update.
- A lifecycle change publishes through `WorkspaceEventJournal`. A change of
  a Mac request publishes one `workspace.updated`, also when the state
  stays `input`. The event has the model choice of the stored chat
  session.
- Without a lifecycle state, the device feature keeps its own fallback, as
  the [Mac device README](../devices/README.md#workspace-state) says.
