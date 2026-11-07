# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace is one task with its own branch
and its own Boat sandbox. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the app's one Boat key, as the [sandbox area](../sandbox/README.md)
says.

`chatLifecycleRoute` in [`worker/app-api/lifecycle.ts`](../app-api/lifecycle.ts)
gives the create, read, open, resume, and activity routes of a workspace to
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

- create, read, open, resume, and activity of a workspace, from
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
- `acceptFirstMessage`: the hook of the chat backend. It returns the first
  message of a new workspace after the admission, and for each repeat. The
  admission has already stored that message, so a repeat adds nothing. It
  must be idempotent for the message and session IDs.
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
- A failed create keeps the full first message, with its attachment IDs,
  as a hidden draft, and records the sandbox cleanup. It then releases the
  creation claim and publishes the failed `start.updated` and the error
  `workspace.updated`. After that, it removes the workspace and its token
  records. `failedLifecycleCreation` finds the draft for the event replay
  and the org purge. Lifecycle cleanup leaves the attachments to their owner.
- A retry gets a fresh workspace ID with the same first message ID. Its
  start waits until the records of the failed attempt are gone.
- Open and resume restart only a stopped or failed workspace. A resumed
  sandbox gets fresh env vars and runs the startup script again, but it
  fetches no code. A start older than the last stop cannot restart it.
- Each start gives the sandbox the default branch of its repository and
  the MCP URL of the Worker. The start keeps that URL only in its encrypted
  settings, as [Deployment inputs](../../docs/deployment.md#the-mcp-url)
  says.
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
no content type. The workspace object maps that turn to its sender. Only
trusted turn records give a sender: the first turn of a create, and each
turn that the chat backend registers. A stop clears them.

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

- `registerLifecycleTurn` records the trusted sender of a turn before the
  turn goes out. `finishLifecycleTurn`, or a report that the turn ended,
  removes it.
- `reportRunnerLifecycle` takes each runner event that ordered runner
  ingestion accepts. `runnerLifecycleDisconnected` takes a disconnect.
- `acknowledgeLifecycleFirstMessage` clears the first message that the
  object keeps from the create.
- `openLifecycleTab` and `closeLifecycleTab` keep the IDs of the open tabs.
  The open route also calls `openLifecycleTab`.

The `alarm` of the class serves both roles. For an image coordinator, it
advances the running build or refresh by one step, or starts the daily
refresh. For a workspace object, it:

- runs the queued start of a create or a resume, one phase at a time
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
the stored public history once, with the `message.accepted` event of the
first message, and then closes. The browser does not restore the composer
from it yet. The owner of `src/app/` and `src/shell/` adds that recovery.

`WorkspaceEventJournal` in [`durable-journal.ts`](durable-journal.ts) keeps
ordered lifecycle publication and suppresses unchanged updates. The
production `Workspace` sends each `workspace.updated` and `start.updated`
event to `WorkspaceChat`, through `commitWorkspaceEvent` or the `publish`
argument of a chat hook. Chat stores and numbers the only workspace event
history, with chat and lifecycle events.

### Builds and refreshes

- A build sandbox starts from the current org image, or as a new default
  sandbox for the first build. Its env holds only the folder variables.
- Risk: a program with root access that an earlier install left in that
  image can read the clone token of a later copy. That token can only read
  its own repository, which the image already holds. The Worker revokes it
  when the copy ends, as
  [GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens)
  says.

[Image builds](image-builds.md) gives the build entry points, the build
steps, the snapshot leases, and the refresh timers.

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). [Deployment inputs](../../docs/deployment.md)
gives each binding, variable, and secret that it reads, such as
`WORKSPACES`, `MACHINE_ORIGIN`, `BOAT_API_KEY`, `BOAT_ORG_ID`,
`GITHUB_APP_PRIVATE_KEY`, `CONDUCTIVE_COMPUTER_MCP_URL`, and the runner
archive variables.

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
- [`workspace-resume.ts`](workspace-resume.ts): `openWorkspace` and
  `resumeWorkspace`.
- [`workspace-controller.ts`](workspace-controller.ts):
  `createWorkspaceController`, the lifecycle methods of the workspace
  object. [`lifecycle-admission.ts`](lifecycle-admission.ts) checks a create
  and calls the admission hook.
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, process IDs, output offsets, and results.
- [`start-logs.ts`](start-logs.ts): `releasedStartLog`, which masks the
  decrypted log as a [`MaskedStartLog`](masked-start-log.ts).
- [`workspace-transport.ts`](workspace-transport.ts): the encrypted log
  transport, and `workspaceLifecycleEndpoint`, which masks each received log.
- [`failed-creations.ts`](failed-creations.ts): the hidden drafts of failed
  creates, and `failedCreationForSender`.
- [`durable.ts`](durable.ts): `DurableLifecycle`, the state and timers of a
  workspace. [`durable-types.ts`](durable-types.ts) holds the times.
- [`workspace-actions.ts`](workspace-actions.ts): the stop, deadline, and
  state read actions on the sandbox.
- [`disk-retention.ts`](disk-retention.ts): `keepWorkspaceDisk`.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`.
- [`build-log-reader.ts`](build-log-reader.ts): `readBuildSnapshot`, which
  reads the build state and its log in one D1 batch.
- [`image-timers.ts`](image-timers.ts): `refreshImagesForPush` and
  `runImageAlarm`.
- [`image-coordinator.ts`](image-coordinator.ts): `ImageCoordinator`.
- [`image-software.ts`](image-software.ts): the runner archive check and
  install/start commands. [`savedScriptCommand`](saved-script.ts) runs Bash.
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
