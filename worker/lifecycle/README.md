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
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
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
- `projectWorkspace`: optional. It changes each reply, such as the state
  of the workspace for the reader.
- `waitUntil`: the `waitUntil` of the Worker's execution context. A create
  gives it its work, so the work continues when the browser closes.

`chatLifecycleRoute` makes the runtime with `workspaceRuntime` and
`imageRuntime`. It gives `software` as a getter, so only a build or a
refresh reads the archive variables. It gives `acceptFirstMessage` to
`acceptLifecycleFirstMessage` of the workspace object.

For a read or a resume, the `projectWorkspace` of `chatLifecycleRoute`
takes the reply from `readChatWorkspaceResponse` of the workspace object,
in one task of the chat queue. That reply has the event number of its state. Its name comes
from the latest committed agent title, when there is one. The state for
the reader uses the chat summary of the same read.

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

`createApp` in [`worker/application.ts`](../application.ts) routes
`MACHINE_PATHS.gitCredential` to this handler, and
`IMAGE_SOURCE_CREDENTIAL_PATH` to `handleImageSourceCredential` in
[`image-sources/credential.ts`](image-sources/credential.ts). It does this
on the machine hostname only, after the Mac command route and before the
runner socket, with the private error response wrapper.

### Workspace Durable Object

[Workspace Durable Object](workspace-object.md) describes the Durable
Object of each workspace and of each image coordinator: its names, its
lifecycle steps, its alarm, its start logs, its event socket, the
publication of its events, and the turn recovery.

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
  `WorkspaceStateProjection`, the one writer of the shown state and of the
  repaired name, as
  [Workspace Durable Object](workspace-object.md#the-shown-state) says.
- [`workspace-controller.ts`](workspace-controller.ts):
  `createWorkspaceController`, the lifecycle methods of the workspace
  object. [`lifecycle-admission.ts`](lifecycle-admission.ts) checks a create
  and calls the admission hook.
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, admission, process IDs, output offsets, retry state, and results.
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
- [`durable-turns.ts`](durable-turns.ts): `recoverLifecycleTurns`, which
  rebuilds the running sessions and the idle time from the committed chat.
  [`durable-alarm.ts`](durable-alarm.ts): `advanceLifecycleAlarm`, the
  lifecycle step of the alarm, which runs that repair before its deadline
  and idle decisions. The
  [turn recovery](workspace-object.md#turn-recovery) gives the rules.
- [`create-workspace-lifecycle.ts`](create-workspace-lifecycle.ts):
  `createWorkspaceLifecycle`, the lifecycle with its hooks and the shared
  state writer. Its `recoverTurns` hook reads the committed chat through
  `readChatRecovery` of [`workspace-platform.ts`](workspace-platform.ts).
- [`workspace-actions.ts`](workspace-actions.ts): the stop, deadline, and
  state read actions on the sandbox.
- [`resource-intents.ts`](resource-intents.ts): `createResource`, the only
  path to a Boat call that creates a sandbox or a snapshot. It stores the
  request first, so the lifecycle finds the resource after a lost reply.
- [`disk-retention.ts`](disk-retention.ts): `keepWorkspaceDisk`.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`, which removes the command journals before a snapshot.
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
