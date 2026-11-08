# Workspace Durable Object

This page belongs to the [workspace lifecycle README](README.md). It
describes the Durable Object of each workspace and of each image
coordinator. It gives their names, the lifecycle steps, the alarm, the
start logs, the event socket, and the event publication. It also gives the
creates and resumes, the git credential sender, the turn recovery, and the
shown state.

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
  as [The git credential sender](#the-git-credential-sender) says.
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
- recovers and deletes an unresolved allocation after a start reaches its limit
- keeps failed or cancelled resume stop cleanup after the start result ends

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
workspace update includes its saved public error code and message, or null
to clear an error. The event carries no error log. The
production `Workspace` sends each `workspace.updated` and `start.updated`
event to `WorkspaceChat`, through `commitWorkspaceEvent` or the `publish`
argument of a chat hook. Chat stores and numbers the only workspace event
history, with chat and lifecycle events.

## Creates and resumes

The [browser routes](README.md#browser-routes) queue the start of each
create and resume. The workspace object runs that start:

- A create or a resume queues its start with `queueLifecycleStart`. The
  workspace object runs the start, so a closed browser does not cancel it.
- A create waits only for its admission, with `waitCreationAdmission`.
  Admission makes the workspace, its token, and the first message durable.
  The sandbox can still be starting. `waitCreationLifecycle` waits for the
  end of a create, and `waitLifecycleStart` for the end of a resume.
- Resume answers when the start is queued, with the workspace in
  `starting`. No browser route waits for the end of a start. The events of
  the workspace carry the start steps and the result. A failed resume
  keeps the workspace and its chat, with an error and a valid Try again.
- A test that needs the end of a resume uses `resumeCompletedWorkspace` in
  [`completed-resume-test-support.ts`](completed-resume-test-support.ts).
  It waits for the job that its call queued, and reads the real result.
- The write that ends the `records` phase stores the admission in the start
  job. The end of the create moves it to the completed creation record. A
  repeat with other content still gets the admitted first message.
- Resume restarts only a stopped or failed workspace. A resumed
  sandbox gets fresh env vars and runs the startup script again, but it
  fetches no code. A start older than the last stop cannot restart it.
- Each start gives the sandbox the default branch of its repository. It
  gives no setting for the computer tools, because Boat writes the entry
  of the `computer` server into the sandbox, as
  [What it does](../../runner/README.md#what-it-does) says.
- After the startup script succeeds at create and each resume, the start
  calls the start hook of the [terminal backend](../terminal/README.md).
  The hook starts the terminal and caches its encrypted password before
  the workspace becomes ready. Builds and disk retention restarts skip it.
- The start then saves its runner phase. Its success waits for the runner
  readiness report within the original start deadline. The readiness wait
  runs no startup command again and schedules its alarm at that deadline.
  Each alarm and readiness report still checks the owner and requester.
  The shared success path prepares the lifecycle only after its final
  access, cancellation, and deadline checks. That lifecycle write restores
  the alarm before the job saves success, also after a runner-phase restart.
- A failed or cancelled resume records its result separately from its
  stop cleanup. Native lifecycle state keeps the pending stop across
  restarts. The lifecycle retries the existing stop operation every 30
  seconds, and a later resume waits for confirmation. Cleanup keeps the
  saved failure message. Late runner reports cannot revive that failed
  start.

## The git credential sender

`Workspace.credentialSender` maps the turn ID of a git credential request
to a sender, in the chat queue. The [machine route](README.md#machine-route)
gives the handler, which reads that turn ID from a request header.

- A create that prepares its repository has its own grant. The start job
  is a create in the `fetch` or `branch` phase, not cancelled or failed,
  and its `turnId` matches. The grant gives the sender of the admitted
  first message.
- Otherwise the turn must be the running stored chat turn: the active
  turn of an open session. `activeStoredTurn` in
  [`access.ts`](../devices/access.ts) reads it. So access ends with the
  turn, also after a queued Stop, a session close, or a login failure.
- A stopped or archived workspace gives no sender. The lifecycle admission
  keeps no turn record for the queued first message.

`machine.test.ts` runs the route with `machineCredentialFixture` in
[`machine-test-support.ts`](machine-test-support.ts), over the production
chat and runner boundaries.

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
- A lifecycle change from a runner hook passes a publisher, and it does not
  fail on that error. So the title repair at a runner `hello` is best
  effort, and the hello, the readiness, and the live text stay available.
- Each other lifecycle change throws the title error to its caller. In the
  lifecycle step of the alarm, the existing catch sets the next alarm in 30
  seconds, or at a sooner saved disk retention deadline. The error also
  delays the chat stop and the device cleanup of a `stopped` or `error`
  state until the writer succeeds.
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
