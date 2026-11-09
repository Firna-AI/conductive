# Workspace Durable Object

This page belongs to the [workspace lifecycle README](README.md). It
describes the Durable Object of each workspace and of each image
coordinator. It gives their names, the lifecycle steps, the alarm, the
start logs, the event socket, and the event publication. It also gives the
creates and resumes and the git credential sender.
[Turn recovery and the shown state](recovery-and-shown-state.md) gives the
turn repair from the committed chat and the one writer of the shown state.

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
[The workspace lifecycle](../chat/integration/workspace-lifecycle.md)
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
  and idle decisions, as
  [Turn recovery](recovery-and-shown-state.md#turn-recovery) says
- stops the sandbox after 30 minutes without activity or a running turn
- extends the Boat auto-stop deadline while a turn runs, unless the owner
  is suspended
- applies the state in each deadline reply, even when the saved runner
  flag says connected
- reads the sandbox state from Boat while the runner is not connected
- watches the restore after each create and resume until Boat reports its
  end, or until a stop, an error, an archive, or a new start, as
  [Creates and resumes](#creates-and-resumes) says
- runs the disk retention restart 13 days after each confirmed stop
- retries the sandbox delete of a failed create
- retries a failed `changed` hook, as
  [The shown state](recovery-and-shown-state.md#the-shown-state) says
- recovers and deletes an unresolved allocation after a start reaches its limit
- keeps failed or cancelled resume stop cleanup after the start result ends

`WorkspaceAlarms` in [`alarms.ts`](../features/alarms.ts) is the one
scheduler of the object alarm. Each owner of a timed task stores its own
due time there. The lifecycle owners are the lifecycle state, the start,
and the publication of a create result. The `changed` retry, the delete of
a failed create, the access stop, and the image coordinator are lifecycle
owners too. The Mac devices, the previews, and GitHub store their due
times there too.

- Each write that changes a due time sets the object alarm to the earliest
  stored due time.
- A due time stays stored until its owner clears it. So a run that fails
  or ends early still leaves the next alarm, also after a restart of the
  object.
- The scheduler clears a due time of the Mac devices after their run
  succeeds, unless that run stored a new one.
- `runWorkspaceAlarms` in [`workspace-alarms.ts`](../workspace-alarms.ts)
  is the outer run of the object alarm. It runs the Mac devices, the
  previews, and GitHub. It also starts the lifecycle run,
  `runWorkspaceAlarm` in [`workspace-alarm.ts`](workspace-alarm.ts). The
  lifecycle run runs the lifecycle owners.
- Each run reads the due times that have come, and it runs their owners.
- At the end of each run, also when the run fails or ends early, the run
  does these steps:
  1. It finds each of its due times that had come when the run started
     and that did not change during the run. The lifecycle run looks only
     at due times of the lifecycle owners. The outer run looks only at due
     times of the Mac devices, the previews, and GitHub.
  2. It moves each due time that it found to the earliest stored due time
     in the future. When no stored due time is in the future, it moves the
     due time 30 seconds into the future.
  3. It sets the object alarm to the earliest stored due time again.
- A due time that a run cleared, replaced, or added stays as that run
  left it.
- The steps prevent an immediate new alarm for a task that a run skipped.
  For example, the lifecycle run skips some tasks while the access stop or
  a start is pending.

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
  runs the terminal setup of the [terminal backend](../terminal/README.md)
  in two saved phases. Builds and disk retention restarts skip both.
- The `terminal` phase runs the setup command detached. Each alarm reads
  its saved process and checks the start time limit, as for the startup
  script. So a setup command that hangs ends the start at its limit.
- After that command exits with code 0, the `terminal-password` phase
  reads the password and caches it encrypted. A read that ends after the
  limit fails the start. The startup step shows as running until this
  phase ends, before the workspace becomes ready.
- The start then saves its runner phase. Its success waits for the runner
  readiness report within the original start deadline. The readiness wait
  runs no startup command again and keeps its due time at that deadline.
  Each alarm and readiness report still checks the owner and requester.
  The shared success path prepares the lifecycle only after its final
  access, cancellation, and deadline checks.
- While a start job exists, the start keeps its own due time, and the
  lifecycle state keeps none. After the start ends, the alarm run sets the
  lifecycle due time from the saved state.
- The first lifecycle prepare of each create and resume also starts the
  restore watch. After a start from a saved snapshot, Boat downloads the
  file content in the background. The
  [terminal backend](../terminal/README.md) moves an early shell only after
  that restore ends. The alarm reads the sandbox with
  `checkWorkspaceRestore` 5 seconds after the prepare, and then every
  5 seconds. `restoreWatchAt` in the lifecycle state keeps the time of the
  next read. When the watch is due, its read takes the place of the Boat
  state read of that alarm.
  - A reply with `hydrated: false` keeps the watch.
  - A reply with `hydrated: true`, or without `hydrated`, ends the watch.
    The watch then writes the restore marker of the terminal with
    `markTerminalRestoreEnded`. Boat's schema makes the field optional,
    and Boat says that a sandbox that restored nothing is hydrated from
    the start.
  - A stopped or error state ends the watch, and the alarm applies that
    state as the Boat state read does. A stopping state, such as
    `archiving`, also ends the watch. Neither writes the marker.
  - A Boat error or a failed marker command keeps the watch. The alarm
    error handling tries again in 30 seconds.
  - A stop, an error, an archive, or a new start ends the watch. An access
    stop, such as at an org suspension, also ends it when Boat still runs
    the sandbox and the stop waits for a retry. The watch has no deadline
    of its own, so it can last until a stop, such as the idle stop after 30
    minutes without activity.
  - A disk retention restart starts no watch, because it starts no
    terminal.
- The end of a create stores its result in the object, with the first
  retry time of its D1 publication. The create then writes that result to
  D1. A failed write retries at the publication's own due time, also while
  a later resume waits for runner readiness.
- Start work means only an actual start job. So a pending publication does
  not hold back the idle stop or the access stop of a suspended owner or
  org.
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

[Turn recovery](recovery-and-shown-state.md#turn-recovery) gives how the
lifecycle repairs its turns and its idle time from the committed chat.

## The shown state

[The shown state](recovery-and-shown-state.md#the-shown-state) gives the
one writer of the shown state: the state in D1 and its `workspace.updated`
event.
