# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace is one task with its own branch
and its own Boat sandbox. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the app's one Boat key, as the [sandbox area](../sandbox/README.md)
says.

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
  the current turn.
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

### Builds and refreshes

- A build sandbox starts from the current org image, or as a new default
  sandbox for the first build. Its env holds only the folder variables.
- Risk: a program with root access that an earlier install left in that
  image can read the clone token of a later copy. That token can only read
  its own repository, which the image already holds. The Worker revokes it
  when the copy ends, as
  [GitHub tokens](../../docs/protocol/tokens-and-secrets.md#github-tokens)
  says.
- Repository copies use the [shared GitHub App credential flow](../github/app-credentials.ts).
  The [source loader](repository-layout.md#the-source-loader) gives the token and revocation steps.

[Image builds](image-builds.md) gives the build entry points, the build steps, the provider retries,
the log limits, the snapshot leases, and the refresh timers.

The [operator backend](../operator/README.md#suspend-an-org) can suspend an org.
Every start and build phase checks this with user suspension.
Guarded admission, publication, token replacement, source grants, and refresh claims also check stored org state.
Cleanup can still recover uncertain allocations and remove resources.
A pending start, outcome publication, or failed-computer cleanup keeps suspension pending and its native alarm armed.
Suspended orgs get no disk retention restart, including after an owner change.

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). [Deployment inputs](../../docs/deployment.md)
gives each binding, variable, and secret that it reads, such as
`WORKSPACES`, `MACHINE_ORIGIN`, `BOAT_API_KEY`, `BOAT_ORG_ID`,
`GITHUB_APP_PRIVATE_KEY`, and the runner archive variables.

Each provider start captures the encrypted org env values and their secret
marks. The start-log masker and the workspace object output filter use
that capture. No private org-value list goes into the runner environment.
A running sandbox keeps its capture after later org setting changes.
Disk retention resumes also replace the saved capture.

## Development

Run `npm run test -- worker/lifecycle` from the repository root with Node 24.
The [lifecycle test guide](tests.md) describes the native fixture, clocks, alarms, and focused checks.

### Key Code

- [`browser.ts`](browser.ts): `handleLifecycleRequest`, the browser routes.
- [`machine.ts`](machine.ts): `handleGitCredential`, the git credential
  route.
- [`workspaces.ts`](workspaces.ts): `createWorkspace`, which records a
  workspace and queues its start.
- [`creation-claims.ts`](creation-claims.ts): `claimCreation`, which records
  the claim, its start plan, and its image lease in one D1 batch. Its
  statements live in [`creation-plan-statements.ts`](creation-plan-statements.ts).
  [`published-image-data.ts`](published-image-data.ts) reads the published image.
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
- [`input-activity-owner.ts`](input-activity-owner.ts): `InputActivityOwner`,
  the one input owner of a workspace object, with its minute updates and
  retries. [`create-input-activity.ts`](create-input-activity.ts) connects
  it to the lifecycle hooks, the member fence, and `warnWorker`.
- [`input-activity-local.ts`](input-activity-local.ts): `LifecycleInputState`,
  the fenced input time in the durable lifecycle state, with its capture
  and its reconciliation.
- [`input-activity-update.ts`](input-activity-update.ts) and
  [`input-activity-data.ts`](input-activity-data.ts): one D1 and provider
  update. `writeWorkspaceActivity` moves `last_activity_at` forward with
  `MAX`.
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
- [`build-admission-data.ts`](build-admission-data.ts): guarded image build admission and publication.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`, which removes the command journals before a snapshot.
- [`first-image-build.ts`](first-image-build.ts): `startAddedImageBuild`,
  which starts changed settings after the first good build finishes cleanup.
- [`image-build-failure.ts`](image-build-failure.ts): image failure classification, retry, warning, and allocation cleanup.
- [`image-allocation.ts`](image-allocation.ts): `recoverImageBuildAllocation`
  replays a saved allocation request and saves the recovered sandbox ID.
  Failed image jobs retain their unresolved allocation phase until cleanup
  recovers and deletes the sandbox.
- [`build-log-statements.ts`](build-log-statements.ts): `buildLogStatements`,
  which splits output into rows and adds the budget statements of
  [`build-log-retention.ts`](build-log-retention.ts) to the same D1 batch.
- [`build-log-reader.ts`](build-log-reader.ts): `readBuildSnapshot`, which
  reads the build state and its log in one D1 batch.
- [`image-timers.ts`](image-timers.ts): `refreshImagesForPush` and
  `runImageAlarm`.
- [`image-coordinator.ts`](image-coordinator.ts): `ImageCoordinator`.
- [`image-software.ts`](image-software.ts): the runner archive check and
  install/start commands.
- [`saved-script.ts`](saved-script.ts): `SavedScript`, which hides the text
  of a saved install or startup script. Only `savedScriptCommand` turns it
  into a Bash command. [`lifecycleCommand`](command-intents.ts) runs each step once.
- [`image-runtime.ts`](image-runtime.ts): `IMAGE_NODE_RUNTIME`, the pinned
  private Node of the org image, and its paths. The
  [runtime guide](../../image/runtime.md#update-the-node-release) says how to
  update it.
- [Repository layout](repository-layout.md#key-code): the repository entries.
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
