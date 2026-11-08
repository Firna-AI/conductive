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
[machine route](#machine-route). It routes no build route yet.

## Responsibilities

- Build and refresh the org image in a separate build sandbox, with a build
  history and a live build log.
- Create a workspace from the newest good org image.
- Keep the state of each workspace in its Durable Object: the starts, the
  activity, the idle stop, and the disk retention restart. That restart
  starts a stopped sandbox briefly, so that Boat keeps its disk.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn.

## Integration points

### Browser routes

`handleLifecycleRequest` in [`browser.ts`](browser.ts) serves these routes
of the shared contracts:

- create, read, resume, and activity of a workspace, from
  `src/shared/workspaces.ts`
- the build list, a new build, a refresh, one build, and its log stream,
  from `src/shared/org-settings.ts`

Run the browser gate first, and pass its `RequestContext`. The handler
returns `null` for every other route. `env` is a `LifecycleEnvironment`
from [`runtime.ts`](runtime.ts). The caller gives these options:

- `software`: the runner archive for each new build and refresh, as the
  [image README](../../image/README.md#the-runner-archive) says.
  `runnerSoftware` in [`configuration.ts`](../configuration.ts) reads it
  from two Worker variables, as
  [Deployment inputs](../../docs/deployment.md#the-runner-archive) says.
- `acceptFirstMessage`: the hook of the chat backend. After the admission
  and for each repeat, it stores the queued first message of that admission
  and returns it. So it must be idempotent for the message and session IDs.
  In production, the admission has already stored that message in chat, so
  the hook adds no history.
- `projectWorkspace`: optional. It changes the workspace record of each
  reply, such as its state for the reader.
- `waitUntil`: the `waitUntil` of the Worker's execution context. A create
  gives it its work, so the work continues when the browser closes.

`chatLifecycleRoute` makes the runtime with `workspaceRuntime` and
`imageRuntime`. It gives `software` as a getter, so only a build or a
refresh reads the archive variables. It gives `acceptFirstMessage` to
`acceptLifecycleFirstMessage` of the workspace object.

- A create needs a published org image and a repository that its build
  loaded. A change to the chosen repositories takes effect after the next
  successful build. A repeat of the same first message ID from the same
  sender returns the same workspace, until that create fails.
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
- A failed create keeps the full first message, with its attachment IDs,
  as a hidden draft, and records the sandbox cleanup. It then releases the
  creation claim and publishes the failed `start.updated` and the error
  `workspace.updated`. After that, it removes the workspace and its token
  records. `failedLifecycleCreation` finds the draft for the event replay
  and the org purge. Lifecycle cleanup leaves the attachments to their owner.
- A retry gets a fresh workspace ID with the same first message ID. Its
  start waits until the records of the failed attempt are gone.
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
- Activity from the `input`, `terminal`, and `preview` sources resets the
  idle time.
- The build log is a stream of server-sent events. It continues after the
  `Last-Event-ID` header or the `after` value, and it ends with a `build`
  event when the job ends. One D1 batch reads the build state and its log,
  so the stream sends all log events before the final `build` event.

`createWorkspace` in [`workspaces.ts`](workspaces.ts) also takes an optional
trusted `sender` as its last argument. The agent tools need it for a
workspace that an agent creates. The `user` stays the owner, and the first
turn and the branch step use the sender.

### Machine route

`handleGitCredential` in [`machine.ts`](machine.ts) serves
`MACHINE_PATHS.gitCredential` on the machine hostname. The
[git credential helper](../../image/README.md#git-credentials) sends the
workspace token as a bearer token, and the current turn ID in the
`X-Conductive-Turn-Id` header. The handler reads no request body and needs
no content type. `Workspace.credentialSender` maps that turn to a sender,
in the chat queue:

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

The handler returns a fresh GitHub App user token of the sender, from
`freshGitHubUserToken` in [`github-tokens.ts`](../security/github-tokens.ts).
It stores no token. A user without a stored GitHub token must sign in again.
One response helper runs the same authorization before token resolution and after its last wait.
Each authorization reads the trusted sender through `credentialSender`.
Its final D1 read in [`machine-credential-data.ts`](machine-credential-data.ts) checks the shared workspace token rule, sender membership, and sender suspension together.
The handler does no asynchronous work between that final read and the reply.

`createApp` in [`worker/application.ts`](../application.ts) routes
`MACHINE_PATHS.gitCredential` to this handler, and
`IMAGE_SOURCE_CREDENTIAL_PATH` to `handleImageSourceCredential` in
[`image-sources/credential.ts`](image-sources/credential.ts). It does this
on the machine hostname only, after the Mac command route and before the
runner socket, with the private error response wrapper.

### Workspace Durable Object

[Workspace Durable Object](workspace-object.md) describes the Durable
Object of each workspace and of each image coordinator: its names, its
lifecycle steps, its alarm, its start logs, its event socket, and the
publication of its events.

### Builds and refreshes

- A build sandbox starts from the current org image, or as a new default
  sandbox for the first build. Its env holds only the folder variables.
- Risk: a program with root access that an earlier install left in that
  image can read the clone token of a later copy. That token can only read
  its own repository, which the image already holds. The Worker revokes it
  when the copy ends, as
  [GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens)
  says.

[Image builds](image-builds.md) gives the build entry points, the build steps, the provider retries,
the log limits, the snapshot leases, and the refresh timers.

The [operator backend](../operator/README.md#suspend-an-org) can suspend an org.
Every start and build phase checks this with user suspension.
Guarded admission, publication, token replacement, source grants, and refresh claims also check stored org state.
Cleanup can still recover uncertain allocations and remove resources.
Suspended orgs get no disk retention restart, including after an owner change.

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). [Deployment inputs](../../docs/deployment.md)
gives each binding, variable, and secret that it reads, such as
`WORKSPACES`, `MACHINE_ORIGIN`, `BOAT_API_KEY`, `BOAT_ORG_ID`,
`GITHUB_APP_PRIVATE_KEY`, and the runner archive variables.

## Development

Run the lifecycle tests with `npm run test -- worker/lifecycle`. They run in
Node with local D1 and fakes. Node cannot load `worker/workspace.ts`,
because it imports `cloudflare:workers`. So the logic of the class lives in
this folder, where the tests can reach it.

D1 holds the workspace, token, build, and log records. The storage of each
object holds the lifecycle state, the turn records, and the events.

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
- [`workspace-resume.ts`](workspace-resume.ts): `resumeWorkspace`, which
  answers once the start is queued.
- [`workspace-state-projection.ts`](workspace-state-projection.ts):
  `WorkspaceStateProjection`, the one writer of the shown state, as
  [Workspace Durable Object](workspace-object.md#the-shown-state) says.
- [`workspace-controller.ts`](workspace-controller.ts):
  `createWorkspaceController`, the lifecycle methods of the workspace
  object. [`lifecycle-admission.ts`](lifecycle-admission.ts) checks a create
  and calls the admission hook.
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, admission, process IDs, output offsets, retry state, deadline, and results.
- [`start-progress.ts`](start-progress.ts): the command steps and the move
  into the saved runner readiness phase.
- [`start-completion.ts`](start-completion.ts): restores runner-step progress
  and prepares successful starts through the lifecycle writer.
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
- [`workspace-transport.ts`](workspace-transport.ts): the encrypted log
  transport, and `workspaceLifecycleEndpoint`, which masks each received log.
- [`failed-creations.ts`](failed-creations.ts): the hidden drafts of failed
  creates, and `failedCreationForSender`.
- [`durable.ts`](durable.ts): `DurableLifecycle`, the state and timers of a
  workspace. [`durable-types.ts`](durable-types.ts) holds the times.
- [`durable-start-stop.ts`](durable-start-stop.ts): the saved stop owner of
  failed and cancelled resumes. [`durable-alarm.ts`](durable-alarm.ts) advances
  stop cleanup before normal lifecycle work.
- [`confirmed-stop.ts`](confirmed-stop.ts): `isConfirmedStopped` shares the
  physical stop classification across lifecycle maintenance. A saved public
  error stays separate. `finishRetentionAttempt` clears an ended attempt
  and renews dates only when its owner supplies a stop-request time.
- [`workspace-actions.ts`](workspace-actions.ts): the stop, deadline, and
  state read actions on the sandbox.
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
  the shared lifecycle state and alarm write.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [`build-admission-data.ts`](build-admission-data.ts): guarded image build admission and publication.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`, which removes the command journals before a snapshot.
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
- [`worker/workspace.ts`](../workspace.ts): the `Workspace` class.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the start steps, and stop and resume.
- [Access and security](../../docs/protocol/access-and-security.md): what a
  sandbox holds, the workspace token, and GitHub tokens.
- [Architecture](../../docs/architecture.md): the Worker, the workspace
  Durable Object, and Boat.
- [Sandbox software](../../image/README.md): the software that each build
  installs.
- [Shared contracts](../../src/shared/README.md): the browser and runner
  payloads.
- [Migrations](../../migrations/README.md): the D1 tables.
- [Operator actions](../operator/README.md#lifecycle-checks): the suspension checks.
