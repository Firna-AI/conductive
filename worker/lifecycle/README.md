# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace has its own Boat sandbox and one
branch at a time. [Continue](continue.md) moves it to a new branch after
its merge. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the client of the provider account that each record stores.
[Provider accounts](provider-accounts.md) and the
[sandbox area](../sandbox/README.md) say how.

`chatLifecycleRoute` in [`worker/app-api/lifecycle.ts`](../app-api/lifecycle.ts)
gives the create, read, resume, and activity routes of a workspace to
`handleLifecycleRequest`. The root Worker also serves the
[machine route](#machine-route), image builds, refreshes, and build log streams.

## Responsibilities

- Build and refresh the org image in a separate build sandbox, with a build
  history and a live build log.
- Create a workspace from the newest good org image.
- Keep the state of each workspace in its Durable Object: the starts, the
  activity, the idle stop, and the disk retention restart. That restart
  starts a stopped sandbox briefly, so that Boat keeps its disk.
- Repair overdue disk alarms and image refreshes from the 15-minute Cron Trigger.
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn, or of the member who pressed Continue during its fetch.
- Continue a workspace on a new branch after its merge, with the same
  sandbox and sessions.
- Give the GitHub CLI the workspace owner's token outside an agent turn.

## Integration points

### Browser routes

[Browser routes](routes.md#browser-routes) gives the routes that
`handleLifecycleRequest` serves, the options of its caller, and the rules
of a create.

### Input activity

[Input activity](routes.md#input-activity) gives how one
`InputActivityOwner` in each workspace object takes the input of the
browser and of previews. Terminal frames report no activity.

### Machine route

[Machine route](routes.md#machine-route) gives `handleGitCredential`, the
git credential route on the machine hostname, and how `createApp` routes
it.

### Workspace Durable Object

[Workspace Durable Object](workspace-object.md) describes the Durable
Object of each workspace and of each image coordinator. It gives their
names, the lifecycle steps, the alarm, the start logs, the event socket,
and the publication of the events. It also gives the creates and resumes
and the git credential sender.
[Turn recovery and the shown state](recovery-and-shown-state.md) gives the
turn repair from the committed chat and the one writer of the shown state.

### Continue

[Continue](continue.md) gives the admission and reservation of Continue,
its phases, the staged fetch and the branch move, the publication, and the
recovery. [Continue routes](continue-routes.md) gives its routes and errors.
[The git credential sender](git-credentials.md#continue) gives the grant
of its fetch.

### Builds and refreshes

[Image builds](image-builds.md) describes build sandboxes, the runner version of an image, suspension,
provider retries, logs, snapshot leases, and refresh timers.
The [software image area](../software-image/README.md) builds the shared
image that a build of an org without an org image starts from.

## Settings

[Lifecycle settings](settings.md) gives the environment inputs and captured secret values.

## Provider accounts

[Provider accounts](provider-accounts.md) gives the provider account that
each record and start job stores, the client that each call uses, and the
[org image of each account](provider-accounts.md#org-images).

## Development

Run `npm run test -- worker/lifecycle` from the repository root with Node 24.
The [lifecycle test guide](tests.md) describes the native fixture, clocks, alarms, and focused checks.

D1 holds the workspace, token, build, and log records. The storage of each
object holds the lifecycle state, the turn records, and the events.
The computer ledger keeps allocation keys, orgs, owners or starters, and provider IDs with their [provider accounts](provider-accounts.md#the-computer-ledger).
It keeps deleted computer IDs until their org is purged.
Assigned identity writes also retain older IDs, including imports and repairs.
Workspace owner changes update each live ledger entry of that workspace.
The retained owner survives removal of the workspace row.
Allocation recovery keeps that retained owner when it merges an imported computer.
Definite first create refusals stay as rejected allocation records.
A refused replay keeps an earlier uncertain request live.
Each failed computer has its own cleanup flag.
The native cleanup pointer can therefore change without losing an older failed computer.

### Key Code

- [Routes and input activity](routes.md#key-code): the browser routes, the
  git credential route, and the input activity owner.
- [`workspaces.ts`](workspaces.ts): `createWorkspace`, which records a
  workspace and queues its start.
- [`creation-claims.ts`](creation-claims.ts): `claimCreation`, which records
  the claim, its start plan, and its image lease in one D1 batch. Its
  statements live in [`creation-plan-statements.ts`](creation-plan-statements.ts).
  [`published-image-data.ts`](published-image-data.ts) reads the published image.
- [`image-leases.ts`](image-leases.ts): `leasedCreationImage` reads the reserved image's name and branch.
- [`start-allocation.ts`](start-allocation.ts): `allocateWorkspace` writes the workspace runner version from the saved allocation's image snapshot.
- [`workspace-data.ts`](workspace-data.ts): the D1 reads and writes of the
  workspace record. `workspaceRecord` gives an origin-free saved snapshot.
  `workspaceView` adds the canonical web link for an explicit app origin.
  In the `records` phase of a create, `insertWorkspace`
  writes the new row and its runtime record in one D1 batch. The new row
  lists first in its section, as
  [List order](../app-api/README.md#list-order) says.
  The D1 allocation trigger assigns the next org number inside that insert transaction.
  Cleanup keeps the org counter. A read after the insert gets the assigned number.
- [`archive-workspace.ts`](archive-workspace.ts): `archiveWorkspace`, the guarded archive, cleanup, event, and response with an explicit app origin.
- [`workspace-response.ts`](workspace-response.ts): `presentProvisionedWorkspace` adds the immutable number and request link to older saved create admissions without replacing their saved fields.
- [`workspace-resume.ts`](workspace-resume.ts): `resumeWorkspace`, which
  answers once the start is queued.
- [`workspace-state-projection.ts`](workspace-state-projection.ts):
  `WorkspaceStateProjection`, the one writer of the shown state and of the
  repaired name, as
  [The shown state](recovery-and-shown-state.md#the-shown-state) says.
- [`workspace-controller.ts`](workspace-controller.ts):
  `createWorkspaceController`, the lifecycle methods of the workspace
  object. [`lifecycle-admission.ts`](lifecycle-admission.ts) checks a create
  and calls the admission hook inside `blockConcurrencyWhile` of the
  platform. A refused admission ends the start as a normal failed start.
- [`workspace-platform.ts`](workspace-platform.ts): `nativeWorkspacePlatform`,
  the platform of the workspace object. A throw inside the runtime's
  `blockConcurrencyWhile` resets the object. So the platform keeps the
  error of each callback and throws it after the runtime call returns. Run
  each blocking callback through the platform. A caller that needs the
  reset calls the object state directly.
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, admission, process IDs, output offsets, retry state, deadline, and results.
- [`start-progress.ts`](start-progress.ts): the command steps, the
  terminal setup and its password read, and the move into the saved runner
  readiness phase.
  [`start-command-execution.ts`](start-command-execution.ts) starts each
  step command detached, also the setup command of the
  [terminal backend](../terminal/README.md), and polls its saved process.
  Its `prepareStartTerminal` checks the start time limit before and after
  the password read.
- [`start-completion.ts`](start-completion.ts): restores runner-step progress
  and prepares successful starts through the lifecycle writer.
- [`creation-publication.ts`](creation-publication.ts): `publishCreationResult`
  writes the stored result of a create to D1, with its own due time, as
  [Creates and resumes](workspace-object.md#creates-and-resumes) says.
- [`start-runner.ts`](start-runner.ts): readiness admission, the original
  deadline, and the active owner and requester checks for runner reports.
- [`job-time-limit.ts`](job-time-limit.ts): the build and start time limits
  and their public failure messages.
- [`start-allocation-cleanup.ts`](start-allocation-cleanup.ts):
  `retryAllocationCleanup` recovers a timed-out allocation from its saved
  encrypted request, then deletes the sandbox. Its separate durable job
  keeps cleanup ownership after the start publishes its failure.
- [`start-job-codec.ts`](start-job-codec.ts): `serializeStartJob` and
  `readStartJob`, which convert the start job for storage and internal RPC.
- [`start-logs.ts`](start-logs.ts): `releasedStartLog`, which masks the
  decrypted log as a [`MaskedStartLog`](masked-start-log.ts).
- [`org-environment.ts`](org-environment.ts): parses stored env values and
  secret marks. It treats older plain values as secret. `environmentSecrets`
  selects marked values without a length rule.
- [`output-secrets.ts`](output-secrets.ts): reads the actual start capture
  for the workspace event filter and file display labels.
- [`workspace-transport.ts`](workspace-transport.ts): the encrypted log
  transport, and `workspaceLifecycleEndpoint`, which masks each received log.
  It also exposes the trusted `checkTurnToken` RPC through `workspaceRuntime`.
- [`credential-sender.ts`](credential-sender.ts): the git credential sender lookup, including creation-time access and active stored turns.
- [`retry-creation.ts`](retry-creation.ts): `retryFailedCreation` reuses the
  first-message admission and workspace identity after a failed first start.
  [`retry-creation-data.ts`](retry-creation-data.ts) pins the replacement image.
- [`start-admission.ts`](start-admission.ts): `enqueueWorkspaceStart` admits
  initial starts, replacements, and resumes in the coordinator's serial task.
- [`durable.ts`](durable.ts): `DurableLifecycle`, the state and timers of a
  workspace. [`durable-types.ts`](durable-types.ts) holds the times.
- [`durable-turns.ts`](durable-turns.ts): `applyLifecycleTurn`, the turn
  update, and `recoverLifecycleTurns`, which rebuilds the running sessions.
  Both take the turn part of the idle time only from the committed chat.
  The [turn recovery](recovery-and-shown-state.md#turn-recovery) gives the
  rules.
- [`durable-start-stop.ts`](durable-start-stop.ts): the saved stop owner of
  failed and cancelled resumes.
- [`durable-alarm.ts`](durable-alarm.ts): `advanceLifecycleAlarm`, the
  lifecycle step of the alarm. It advances stop cleanup before normal
  lifecycle work. It runs the turn repair before its deadline and idle
  decisions. When the restore watch is due, it runs the restore check in
  place of the Boat state read.
- [`create-workspace-lifecycle.ts`](create-workspace-lifecycle.ts):
  `createWorkspaceLifecycle`, the lifecycle with its hooks and the shared
  state writer. Its `lastTurnEndedAt` and `recoverTurns` hooks read the
  committed chat through `readChatRecovery` of
  [`workspace-platform.ts`](workspace-platform.ts). Its `extendDeadline`
  hook is the deadline hook of [Input activity](routes.md#input-activity).
- [`confirmed-stop.ts`](confirmed-stop.ts): `isConfirmedStopped` shares the
  physical stop classification across lifecycle maintenance. A saved public
  error stays separate. `finishRetentionAttempt` clears an ended attempt
  and renews dates only when its owner supplies a stop-request time.
- [`workspace-actions.ts`](workspace-actions.ts): the stop, deadline,
  state read, and restore check actions on the sandbox.
  `checkWorkspaceRestore` reads `hydrated`, and it writes the restore
  marker of the [terminal backend](../terminal/README.md) when the restore
  ends, as the [restore watch](workspace-object.md#creates-and-resumes)
  says.
- [`resource-intents.ts`](resource-intents.ts): `createResource`, the only
  path to a Boat call that creates a sandbox or a snapshot. It stores the
  request first, so the lifecycle finds the resource after a lost reply.
  It records a computer allocation before create and attaches the returned ID.
- [`computer-ledger.ts`](computer-ledger.ts): allocation records, returned IDs,
  confirmed deletions, and the live computers that still need cleanup.
- [`computer-stop-task.ts`](computer-stop-task.ts): persistent org Stop tasks.
  The task saves the account and ID of each computer, and its alarm, before the first provider request.
  Its native RPC and alarm share the lifecycle queue.
- [`build-execution.ts`](build-execution.ts): build commands and cleanup of every live ledger computer for the exact org and build.
- [`cleanup.ts`](cleanup.ts): retries every failed computer of a workspace.
  `deleteSandboxIfPresent` marks the ledger after Delete succeeds or returns not found.
- [`disk-retention.ts`](disk-retention.ts): `keepWorkspaceDisk`, the
  maintenance resume, startup, and stop phases. Its D1 progress retains a
  failure while stop cleanup retries.
- [`retention-command.ts`](retention-command.ts): `advanceRetentionCommand`
  starts the maintenance script detached and polls its saved process.
  Its journal identity and output offsets survive reconstruction.
- [`retention-stop.ts`](retention-stop.ts): `stopRetention` saves the
  attempt's stop request before it contacts the provider. Later confirmation
  uses that time. An already stopped sandbox with no saved request keeps
  its earlier disk dates.
- [`disk-retention-state.ts`](disk-retention-state.ts):
  `advanceDiskRetentionState` saves the original maintenance deadline in
  native lifecycle state before the first provider call. It also saves the
  maintenance command identity and process. It keeps the failure after
  cleanup and caps active maintenance alarms at the deadline.
- [`retention-data.ts`](retention-data.ts): saved phase progress and the
  resource eligibility lookup used when a confirmed stopped workspace shows
  an error. The lookup reuses the shared owner, org, and archive predicate.
  Confirmed stop finalization clears the D1 progress with the native attempt.
- [`durable-scheduling.ts`](durable-scheduling.ts): `writeLifecycleState`,
  the shared lifecycle state write. `scheduleLifecycleState` sets the due
  time of the lifecycle state. `publishLifecycleState` runs the `changed`
  hook with its stored retry, as
  [The shown state](recovery-and-shown-state.md#the-shown-state) says.
- [`workspace-alarm.ts`](workspace-alarm.ts): `runWorkspaceAlarm`, the
  lifecycle part of each alarm run. It runs the lifecycle owners whose due
  time has come.
  [`workspace-task-alarms.ts`](workspace-task-alarms.ts):
  `taskWorkspaceStorage` gives each lifecycle owner its own due time in
  `WorkspaceAlarms` of [`alarms.ts`](../features/alarms.ts), as the
  [Workspace Durable Object](workspace-object.md) says.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [Image builds](image-builds.md#key-code): the image build, its log, its
  timers, its coordinator, its software, the shared software images, and
  the private Node of the image.
- [`saved-script.ts`](saved-script.ts): `SavedScript`, which hides the text
  of a saved install or startup script. Only `savedScriptCommand` turns it
  into a Bash command. [`lifecycleCommand`](command-intents.ts) runs each step once.
- [Repository layout](repository-layout.md#key-code): the repository entries.
- [The default branch at a create](default-branch.md#key-code): the fetch
  and branch commands of a create.
- [Continue](continue.md#key-code): the Continue entries, the shared
  local-work check, and the branch name of a create and of Continue.
- [`tokens.ts`](tokens.ts): the encrypted workspace token and
  `authenticateWorkspaceToken`.
- [`runtime.ts`](runtime.ts): `LifecycleEnvironment`, `workspaceRuntime`,
  and `imageRuntime`.
- [`repair.ts`](repair.ts) and [`repair-data.ts`](repair-data.ts): bounded Cron repair with shared eligibility rules and persisted retry signals.
- [`worker/workspace.ts`](../workspace.ts): the composed `Workspace` class.
  [`worker/workspace-lifecycle.ts`](../workspace-lifecycle.ts) exposes its lifecycle methods.
- [Member receivers](../members/workspace-receiver.ts) install durable generations, drain active phases, and restore maintenance timers.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the start steps, and stop and resume.
- [Access and security](../../docs/protocol/access-and-security.md): what a
  sandbox holds, the workspace token, and GitHub tokens.
- [Architecture](../../docs/architecture/components.md): the Worker, the workspace
  Durable Object, and Boat.
- [Sandbox software](../../image/README.md): the software that each build
  installs.
- [Shared contracts](../../src/shared/README.md): the browser and runner
  payloads.
- [Migrations](../../migrations/README.md): the D1 tables.
- [Operator actions](../operator/README.md#lifecycle-checks): the suspension checks.
