# Workspace Durable Object

This page belongs to the [workspace lifecycle README](README.md). It
describes the Durable Object of each workspace and of each image
coordinator. It gives their names, the lifecycle steps, the alarm, the
start logs, the event socket, and the event publication. It also gives the
creates and resumes. [The git credential sender](git-credentials.md)
gives the sender of a git credential request.
[Turn recovery and the shown state](recovery-and-shown-state.md) gives the
turn repair from the committed chat and the one writer of the shown state.

`Workspace` in [`worker/workspace.ts`](../workspace.ts) is the Durable
Object class of the `WORKSPACES` binding. [`runtime.ts`](runtime.ts) gets
each object by name, with the Western Europe location hint. Each name has
one role:

- The workspace ID names the workspace object of one workspace.
- `org-image:<orgId>` names the image coordinator of one org.
- `org-computer-stops:<orgId>` names the detached Stop task of one org.

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
  running. `finishLifecycleTurn` removes it. Each turn end reaches it only
  through the `turnEnded` hook. `turnDispatchFailed` also calls it for a
  turn that did not go out. These records keep the running sessions. They
  give no GitHub access, as
  [The git credential sender](git-credentials.md) says.
- `reportRunnerLifecycle` takes only the runner events `runner.ready`,
  `turn.started`, and `start.updated`. `runnerLifecycleDisconnected` takes
  a disconnect.
- `acknowledgeLifecycleFirstMessage` clears the pending first message of
  the create. The admission keeps its own copy for repeats.

The `alarm` of the class serves these roles. The detached Stop task keeps
concrete computer IDs and retries every 30 seconds until each Stop is confirmed.
A successful reply that still runs keeps its retry.
The task checks its org's live ledger before each dispatch.
An owner change or suspension lift keeps its queued work.
An absent or deleted ledger entry ends that work.
A retained archived computer is still the computer of its workspace. That
workspace's lifecycle handles its suspension, so the Stop task has no case of its own for Archive.
For an image coordinator, the alarm
advances the running build or refresh by one step, or starts the daily
refresh. A transient Boat error keeps the job step for the next alarm,
within the [retry window](image-builds.md#provider-retries), except a source
command start. For a workspace object, it:

- runs the queued start of a create or a resume. One run can advance the
  start by more than one phase, as
  [The start loop](start-loop.md) says
- finishes Archive initialization and uncertain allocation recovery before normal start work,
  also after the Restore window, until the workspace row holds the recovered ID
- stops and retains archived sandboxes, bridges an old disk without secrets, and deletes at the archive deadline.
  A failed Archive step tries again after 30 seconds, and each further failure doubles the wait, up to 1 hour.
  The wait is at least the `Retry-After` of a Boat error, up to the same hour. The D1 repair time moves
  with it, so the repair Cron Trigger does not wake the step early. A step that succeeds ends the wait.
- clears Restore when the provider confirms that a retained computer is missing
- repairs the running turns from the committed chat before its deadline
  and idle decisions, as
  [Turn recovery](recovery-and-shown-state.md#turn-recovery) says
- stops the sandbox after the [stop time](README.md#the-stop-time)
  without activity or a running turn
- extends the Boat auto-stop deadline while a turn runs, unless the owner
  is suspended
- applies the state in each deadline reply, even when the saved runner
  flag says connected
- reads the sandbox state from Boat while the runner is not connected
- checks for an [automatic restart](#automatic-restart) after it completes
  the regular lifecycle step of a running workspace with a runner that is away
- watches the restore after each create and resume until Boat reports its
  end, or until a stop, an error, an archive, or a new start, as
  [Creates and resumes](#creates-and-resumes) says
- runs the disk retention restart 13 days after each confirmed stop
- retries the sandbox delete of a failed create
- retries a failed `changed` hook, as
  [The shown state](recovery-and-shown-state.md#the-shown-state) says
- recovers and deletes an unresolved allocation after a start reaches its limit
- keeps failed or cancelled resume stop cleanup after the start result ends
- advances a running Continue or repository change by one phase. While
  one of them runs, the lifecycle steps run only to advance a queued
  start, as [Continue](continue.md#the-reservation) and
  [Repository change](repository-change.md#the-reservation) say

[The object alarm scheduler](alarm-scheduler.md) gives `WorkspaceAlarms`,
the one scheduler of the object alarm: the owners and their due times, the
security sources, Continue, the run lease, and the steps at the end of each
run.

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
itself. The socket sends the stored history after the requested event
number first, then each new event. The workspace GET gives a seed and its
cutoff for a new workspace stream. Older apps can request a replay from
event 0. [Workspace events](../../docs/protocol/workspace-events.md) gives
the read and replay rules.

An admitted failed create keeps its workspace and normal event socket.
Every current member can read its chat, queued messages, and saved cause.
There is no sender-only replay or returned first-message draft.
The first-message transaction stores its admission marker beside the chat.
That marker preserves accepted work if the later lifecycle checkpoint fails.

`WorkspaceEventJournal` in [`durable-journal.ts`](durable-journal.ts) keeps
ordered lifecycle publication and suppresses unchanged updates. The
workspace update includes its saved public error code and message, or null
to clear an error. The event carries no error log. The
production `Workspace` sends each `workspace.updated` and `start.updated`
event to `WorkspaceChat`, through `commitWorkspaceEvent` or the `publish`
argument of a chat hook. Chat stores and numbers the only workspace event
history, with chat and lifecycle events.

### Automatic restart

`runnerDisconnectedAt` in the lifecycle state holds the time when the
runner connection closed. For an older state with no time, the alarm
starts the count when it first sees the runner away. `automaticRestartAt`
records the attempt until the runner is ready again. The same state write
sets `softwareRestartAt` for the shared restart deadline and shows Starting.

The lifecycle alarm finishes its reconciliation and stop checks first.
It reads the oldest queued message from the pending chat commands. When
the two times are due, it confirms that the provider still shows a
running sandbox and checks access to the captured sandbox and account.
[Automatic restart](../../docs/protocol/restart-the-software.md#automatic-restart)
gives the requirements.

The alarm runner tracks the restart commands in a separate task.
`QueueTurn.outside` releases the chat queue during each command. The
regular alarm can apply the restart deadline while a command waits.
Before the restart command, the alarm checks receiver and workspace access
outside the chat queue. Readiness during these checks cancels the restart
and keeps the running turns active.

Back in the queue, the alarm checks that the attempt is current and its
deadline is still open. It saves `automaticRestartSubmitted` and ends the
running turns. Chat keeps their undelivered messages for the next ready
runner. The alarm then submits the command outside the queue.

After the submission record, a hello on the saved stream resumes replay
and keeps Starting.
A new `runner.ready` before the deadline ends Starting and releases the
waiting messages.

## Creates and resumes

The [browser routes](README.md#browser-routes) queue the start of each
create and resume. The workspace object runs that start:

- A create or a resume queues its start with `queueLifecycleStart`. The
  workspace object runs the start, so a closed browser does not cancel it.
- The queue sets the start alarm to the current time, so the first step
  runs at once. A create answers only after its first step, the
  `records` phase, so a later alarm would delay each create.
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
- The creation plan keeps the start branch beside the base branch and
  optional pull request start commit. Older plans use the base, then the
  default branch when the start branch is absent. A replay uses this plan
  before any new branch check.
- Resume restarts only a stopped or failed workspace. A resumed
  sandbox gets fresh env vars and runs the startup script again, but it
  fetches no code. A start older than the last stop cannot restart it.
- After a failed first start, Resume instead queues a replacement create.
  It keeps the workspace, workspace branch, start branch, base branch,
  repository, creation date, and first-message IDs.
  It uses the current image and settings, with a fresh token and allocation key.
  It keeps the original preparation sender and the current retry requester separate.
  Previous cleanup finishes before new allocation, including after a restart.
  Archive preserves a pending failed-computer cleanup alarm.
- A failed first start keeps its alarm while a start, outcome publication,
  or failed-computer cleanup is pending. Later lifecycle writes preserve that work.
  After cleanup and publication finish, it schedules no normal lifecycle alarm.
- An active create failure always leaves a failed start step.
  Its running steps become failed before the workspace error event is published.
  If no step is running or failed, the controller records the failed start itself.
  A later sandbox error after successful creation adds no such step.
- Each start gives the sandbox its base branch, with the repository default
  as the fallback for a null base. It
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
  access, cancellation, deadline, and runner connection checks.
- When the runner disconnects during these final checks, the start job
  stays in its runner phase. The start then completes after a later
  readiness report.
- When the chat backend refuses a runner below the supported protocol
  version, a start in its runner phase fails at once through the existing
  failure path of a start, with the cause of the refused turns, as
  [Runner versions](../../docs/protocol/version-pins.md#runner-versions)
  says. A refusal of a higher version leaves the start waiting.
- While a start job exists, the start keeps its own due time, and the
  lifecycle state keeps none. After the start ends, the alarm run sets the
  lifecycle due time from the saved state.
- The progress phases of a start are `records`, `machine`, `ready`,
  `fetch`, `branch`, `startup`, `terminal`, `terminal-password`, and
  `runner`, up to the success of the start. Each command phase after
  `fetch` first calls `settleWorkspaceBranch` in
  [`workspace-branch.ts`](workspace-branch.ts). While the branch is a
  placeholder, one D1 statement ends the placeholder and reads the branch
  for the command. Later phases and resumes write nothing there. Before
  that, a name write renames a placeholder branch with `namedBranchSql`.
  They make most of their D1 and
  Boat calls outside the chat queue. The start guard in
  [`start-guard.ts`](start-guard.ts) runs each group of these calls with
  `outside`, as [History and event order](../chat/history.md) says. So
  chat reads, messages, and runner receipts do not wait for those calls.
- Before and after each outside call, in the queue task, the start guard
  reads the start job and the stop epoch. It also checks that the member
  receiver fence is active with the generation of the start's queue task.
  When the start job is gone, the fence check fails, or the second read
  differs from the first, the call throws `StartSuperseded`. The advance
  then ends with no further write, as after a lost reply. The lifecycle
  run sets the start due time one second later.
- One lifecycle run can advance the start through more than one phase,
  and it polls a running command or a sandbox that is not ready every
  250 milliseconds. [The start loop](start-loop.md) gives the rules.
- The storage reads and writes of a start stay in its queue task. So do
  its calls to the controller and to `DurableLifecycle`, with each
  lifecycle state write. The token write, the admission, the runner
  readiness check, and the D1 publication of a create result also stay in
  the queue. The failure path of a cancelled or failed start makes all its
  calls in the queue.
- Allocation saves its encrypted request in the queue task. Then one
  outside call records the ledger intent, creates the sandbox, records the
  returned ID, and assigns the sandbox to the workspace row. No guard check
  runs between the create reply and these D1 writes. So a member
  suspension during the create still leaves the sandbox ID in D1.
- When Archive ends a running start, Archive runs only its initialization
  in that queue task. The initialization ends the start as stopped. The
  next lifecycle run of the alarm runs the later Archive phases, with the
  provider stop. Only the regular alarm task starts a lifecycle run, one
  run at a time. So the provider stop comes after the last outside call of
  the start.
- While any queue task is outside the queue, Archive also runs only its
  initialization, also for a second Archive. Then `finishStop` reports no
  stop, so Restore leaves a pending stop to the lifecycle. So no Archive
  or Restore step reads or changes the sandbox while a cancelled start
  call can still reach the provider.
- No start begins while a pending stop runs, so that a start never
  overlaps the old stop. A resume or a Try again in that time, such as the
  open just after Archive and Restore, is held in
  [`start-after-stop.ts`](start-after-stop.ts). The newest request
  replaces an older one. While a start is held, the lifecycle checks the
  stop at once and then every 5 seconds, not every 30 seconds. When the
  stop ends, the next lifecycle run queues the held start with every
  admission check again. An Archive after the request changes the stop
  epoch and drops it. So does a wait past the start time limit.
- The first lifecycle prepare of each create and resume also starts the
  restore watch. After a start from a saved snapshot, Boat downloads the
  file content in the background. The
  [terminal backend](../terminal/README.md) moves an early shell only after
  that restore ends. The alarm reads the sandbox with
  `checkWorkspaceRestore` 5 seconds after the prepare, and then every
  5 seconds. `restoreWatchAt` in the lifecycle state keeps the time of the
  next read. When the watch is due, its read takes the place of the
  provider state read of that alarm.
  - A reply with `hydrated: false` keeps the watch.
  - A reply with `hydrated: true`, or without `hydrated`, ends the watch.
    The watch then writes the restore marker with
    `markTerminalRestoreEnded`. The terminal, the agent runner, and the
    [disk hold](../../docs/protocol/disk-line.md#when-the-line-applies)
    read it. Boat's schema makes the field optional, and Boat says that a
    sandbox that restored nothing is hydrated from the start.
  - A stopped or error state ends the watch, and the alarm applies that
    state as the provider state read does. A stopping state, such as
    `archiving`, also ends the watch. Neither writes the marker.
  - A Boat error or a failed marker command keeps the watch. The alarm
    error handling tries again in 30 seconds.
  - A stop, an error, an archive, or a new start ends the watch. An access
    stop, such as at an org suspension, also ends it when Boat still runs
    the sandbox and the stop waits for a retry. The watch has no deadline
    of its own, so it can last until a stop, such as the idle stop after the
    stop time without activity.
  - On an account with a disk line, a start can write the marker before
    the watch. When the ready sandbox already reports the end of the
    restore, the first command of the start writes it, as
    [Provider accounts](README.md#provider-accounts) says.
  - A disk retention restart starts no watch. It starts no terminal and no
    agent runner, and each of its steps already reads the sandbox from
    Boat. The disk hold still needs the marker. So when such a read
    reports a ready sandbox without `hydrated: false`, the retention writes
    the marker once after each resume, as
    [Provider accounts](README.md#provider-accounts) says.
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

## Start step records

`StartJobRecords` in [`start-job-records.ts`](start-job-records.ts) keeps
the job step records of the creates and resumes of one workspace object.
[Job step records](README.md#job-step-records) gives the D1 statements.

- `createWorkspaceIntegration` makes one `StartJobRecords` for each
  object, and gives its `env` to the lifecycle controller. That env reads
  each value from the env of the object, except its D1 binding, which
  comes from [`timed-d1.ts`](timed-d1.ts). `observeProviders` in
  [`client.ts`](../sandbox/client.ts) marks that binding. So
  `providerForAccount` gives each provider of that env, and of a copy of
  it, through [`timed-provider.ts`](timed-provider.ts).
- `StartRunTimer` in [`start-run-timer.ts`](start-run-timer.ts) adds each
  D1 and provider call to the open run of a start. A command status read
  counts as a poll. `WorkspaceLifecycle.alarmLifecycle` gives the timer the
  wait to enter the chat queue, and `startGuard` gives the wait to enter it
  again after each outside call. A call of another queue turn during an
  outside call of the run also counts in the run. A call while no run is
  open counts nowhere.
- `runWorkspaceAlarm` calls `begin` with the `dueAt` of
  `WorkspaceAlarms.begin`, and `end` after the `finish` of the run. A run
  whose begin finds a start job that is not cancelled is a run of the
  start. Its end adds one run row with the next run number of the job.
- `startJobStorage` in [`start-record-storage.ts`](start-record-storage.ts)
  wraps the start storage. The begin of a job saves the record meta of the
  job and opens its first phase. Each phase change of a running job closes
  the old phase and opens the new phase. The end of the job closes each
  step that is still open, as `done` or `failed`.
- In the `machine` and `ready` phases, a create or resume request opens
  `computer:request`. Its reply closes that step and opens
  `computer:boot`. The first read that shows a ready sandbox closes
  `computer:boot`. These marks wait in memory until the next write of the
  records in the queue.
- [`start-record-buffer.ts`](start-record-buffer.ts) keeps each row under
  its own key in the object storage. Only a job with record meta gets
  rows, so a job from before the records gets none. A step row of the
  running job stays after its send, so that later changes merge into it.
- [`start-record-send.ts`](start-record-send.ts) sends the rows.
  `WorkspaceStateProjection` gives them to `persistLifecycleState`, which
  writes at most 50 rows in the D1 batch of the shown state. Each send
  first copies the steps of the running start from the lifecycle state,
  for the step IDs that the Worker sets. When that batch fails, the shown
  state is written alone and the rows are dropped. The run that ends a
  start sends the rest of the rows in more batches.
- A failed record is dropped with the warning `start_record_failed` or
  `start_record_send_failed`, and the start goes on.

## The git credential sender

[The git credential sender](git-credentials.md) gives how
`Workspace.credentialSender` maps the turn ID of a git credential request
to a sender: the grant of a create, the grant of a Continue fetch, and the
running chat turn. It also names the tests of the route.

## Turn recovery

[Turn recovery](recovery-and-shown-state.md#turn-recovery) gives how the
lifecycle repairs its turns and its idle time from the committed chat.

## The shown state

[The shown state](recovery-and-shown-state.md#the-shown-state) gives the
one writer of the shown state: the state in D1 and its `workspace.updated`
event.
