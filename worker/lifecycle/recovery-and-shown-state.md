# Turn recovery and the shown state

This page belongs to the [workspace lifecycle README](README.md), beside
[Workspace Durable Object](workspace-object.md). It gives how the
lifecycle repairs its turns from the committed chat, and the one writer
of the shown state of a workspace.

## Turn recovery

The chat stores and confirms each runner event before its hook updates
the lifecycle, as the
[hooks](../chat/integration/workspace-lifecycle.md#hooks-and-events) say. A failed Boat
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
- On the normal path, `DurableLifecycle.turn` takes no time from its
  caller. The `lastTurnEndedAt` hook of `createWorkspaceLifecycle` reads
  the stored time of the newest turn end from the same committed chat
  summary. So a registration, a resend, or a failed send never starts a
  new idle period either.
- Each repair starts device cleanup through the `chatRecovered` hook of
  `WorkspacePlatform`.
- The repaired state goes through the shared state writer, as
  [The shown state](#the-shown-state) says. So a repaired `ready` cannot
  hide a waiting Mac request.
- An error in the repair at a `hello` closes the runner connection, and
  the next `hello` repairs again. An error in the alarm sets the next
  alarm in 30 seconds, or at the saved disk retention deadline when that
  comes sooner.

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
- Before the `changed` hook runs, the lifecycle stores a retry time for
  that hook: 30 seconds later, or a sooner saved disk retention deadline.
  A failed run keeps the retry, and a later failed write keeps the earlier
  time. A successful run clears it, and so does the removal of the
  lifecycle state. So a failed title write, D1 state write, or retention
  clear runs again, also after a failure outside an alarm run.
- A lifecycle change from a runner hook passes a publisher, and it does not
  fail on that error. So the title repair at a runner `hello` is best
  effort, and the hello, the readiness, and the live text stay available.
  The writer reports the failed title write, so the stored retry stays.
- Each other lifecycle change throws the title error to its caller. The
  error also delays the chat stop and the device cleanup of a `stopped` or
  `error` state until the writer succeeds.
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
