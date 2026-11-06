# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace is one task with its own branch
and its own Boat sandbox. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the org's own Boat key.

The root Worker does not call these handlers yet. `worker/routes.ts` has no
lifecycle route, and `worker/application.ts` serves a stub on the machine
hostname. Milestones 8i and 15i own the root route wiring.

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
from [`runtime.ts`](runtime.ts). The caller gives three options:

- `software`: the runner archive for each new build and refresh, as the
  [image README](../../image/README.md#the-runner-archive) says.
- `acceptFirstMessage`: the hook of the chat backend. It stores the first
  message of a new workspace and returns it.
- `waitUntil`: the `waitUntil` of the Worker's execution context. A create
  gives it its work, so the work continues when the browser closes.

```ts
const runtime = { ...workspaceRuntime(env), images: imageRuntime(env) }
const response = await handleLifecycleRequest(request, context, runtime, {
  software,
  acceptFirstMessage,
  waitUntil: (promise) => ctx.waitUntil(promise),
})
```

- A create needs a published org image. A repeat of the same first message
  ID from the same sender returns the same workspace.
- A create or a resume queues its start with `queueLifecycleStart`, and
  waits with `waitLifecycleStart`. The workspace object runs the start, so
  a closed browser does not cancel it.
- A failed create removes the workspace and its token records. The
  workspace object keeps the sandbox cleanup until the delete succeeds. It
  also keeps the first message as a hidden draft, which
  `failedLifecycleCreation` finds for later recovery and org purge.
- Open and resume restart only a stopped or failed workspace. A resumed
  sandbox gets fresh env vars and runs the startup script again, but it
  fetches no code. A start older than the last stop cannot restart it.
- Activity from the `input`, `terminal`, and `preview` sources resets the
  idle time.
- The build log is a stream of server-sent events. It continues after the
  `Last-Event-ID` header or the `after` value, and it ends with a `build`
  event when the job ends.

`createWorkspace` in [`workspaces.ts`](workspaces.ts) also takes an optional
trusted `sender` as its last argument. The agent tools need it for a
workspace that an agent creates. The `user` stays the owner, and the first
turn and the branch step use the sender.

### Machine route

`handleGitCredential` in [`machine.ts`](machine.ts) serves
`MACHINE_PATHS.gitCredential` on the machine hostname. The
[git credential helper](../../image/README.md#git-credentials) sends the
workspace token and the ID of the current turn. The workspace object maps
that turn to its sender. Only trusted turn records give a sender: the first
turn of a create, and each turn that the chat backend registers. A stop
clears them.

The handler returns a fresh GitHub App user token of the sender, from
`freshGitHubUserToken` in [`github-tokens.ts`](../security/github-tokens.ts).
It stores no token. A user without a stored GitHub token must sign in again.

The route is not reachable until the root wiring adds it. Until then, the
branch step of a create cannot fetch a private repository.

### Workspace Durable Object

`Workspace` in [`worker/workspace.ts`](../workspace.ts) is the Durable
Object class of the `WORKSPACES` binding. [`runtime.ts`](runtime.ts) gets
each object by name, with the Western Europe location hint. Each name has
one role:

- The workspace ID names the workspace object of one workspace.
- `org-image:<orgId>` names the image coordinator of one org.

Its public methods are internal RPC, not HTTP routes. This folder uses the
`WorkspaceLifecycleEndpoint` interface of
[`workspace-runtime.ts`](workspace-runtime.ts). These hooks wait for the
chat backend and the runner ingestion, and no code calls them yet:

- `registerLifecycleTurn` records the trusted sender of a turn before the
  turn goes out. `finishLifecycleTurn`, or a report that the turn ended,
  removes it.
- `reportRunnerLifecycle` takes each runner event that ordered runner
  ingestion accepts. `runnerLifecycleDisconnected` takes a disconnect.
- `acknowledgeLifecycleFirstMessage` clears the first message that the
  object keeps from the create.

The `alarm` of the class serves both roles. For a workspace object, it:

- runs the queued start of a create or a resume, one phase at a time
- stops the sandbox after 30 minutes without activity or a running turn
- extends the Boat auto-stop deadline while a turn runs
- reads the sandbox state from Boat while the runner is not connected
- runs the disk retention restart 13 days after each confirmed stop
- retries the sandbox delete of a failed create

The object stores the env values of a start encrypted, and hides them in
each start log that it returns. For an image coordinator, the alarm
advances the running build or refresh by one step, or starts the daily
refresh.

The `fetch` of the class opens the workspace event socket at
`workspaceEventsPath` of `src/shared/events.ts`. Forward the browser's
upgrade request without changes, because the object runs the browser gate
itself. The socket sends the stored history first, then each new event.

`WorkspaceEventJournal` in [`durable-journal.ts`](durable-journal.ts) keeps
private lifecycle replay state. The production `Workspace` sends its
`workspace.updated` and `start.updated` events to `WorkspaceChat`. Chat
stores and numbers the public stream, with chat and lifecycle events.

### Builds and refreshes

`startImageBuild` in [`image-builds.ts`](image-builds.ts) records a build or
a refresh for an org admin, and returns its ID. While a job runs, a new
request gets the ID of that job and schedules it again. The image
coordinator advances a job by one step on each alarm. The software and
install commands run detached, so the log grows while they run. D1 keeps
the step, the output offsets, and the log.

- A build sandbox starts from the current org image, or as a new default
  sandbox for the first build. It gets no org env vars and no workspace
  token.
- A build loads the chosen repositories, installs the image software, runs
  the install script, and saves a snapshot. A refresh only loads the
  repositories of the current image again, and saves a snapshot.
- The org image changes only when the new snapshot is ready. Each job
  deletes its build sandbox at the end, and keeps its history and log.
- A queued create holds a lease on its source image. Cleanup waits for
  that lease before it deletes an old snapshot. D1 keeps deferred cleanup.

`createGitHubImageSourceMaterializer` in
[`image-sources/materialize.ts`](image-sources/materialize.ts) loads the
repositories, as the required `prepareSources` of `ImageRuntime`. The
Worker signs a GitHub App JWT with `GITHUB_APP_PRIVATE_KEY` and
`GITHUB_CLIENT_ID`. It gets an installation token that can only read one
repository. It fetches the default branch over Git's HTTP protocol, with
each tag that the branch reaches. Only the Git pack bytes and the ref data
reach the build sandbox, and no GitHub credential does.

Each failure of that loader gives one fixed error, because Boat output and
Git errors can hold a credential.

`refreshImagesForPush` in [`image-timers.ts`](image-timers.ts) starts a
refresh for each org whose current image holds the pushed repository. It
acts on a push to the default branch, at most once in 30 minutes for each
org. A push during a running job waits for a later refresh. Only the
verified GitHub webhook receiver may call it, and that receiver does not
exist yet. The image coordinator starts the daily refresh by itself.

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). It needs these values in addition to the
[Get started](../../README.md#get-started) values:

| Name | Value |
| --- | --- |
| `WORKSPACES` | The Durable Object binding in `wrangler.jsonc`. |
| `MACHINE_ORIGIN` | The `https://` origin of the machine hostname. Each sandbox gets it as `CONDUCTING_MACHINE_ORIGIN`. The git credential route refuses every request without it. |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub App's private key, as PEM. A build or refresh needs it when the org chose a repository. The PEM file from GitHub works as it is. |

`BOAT_KEY_ENCRYPTION_KEY` also encrypts the workspace tokens.

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
- [`workspace-resume.ts`](workspace-resume.ts): `openWorkspace` and
  `resumeWorkspace`.
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, process IDs, output offsets, and results.
- [`failed-creations.ts`](failed-creations.ts): the hidden drafts of failed
  creates, and `failedCreationForSender`.
- [`durable.ts`](durable.ts): `DurableLifecycle`, the state and timers of a
  workspace. [`durable-types.ts`](durable-types.ts) holds the times.
- [`disk-retention.ts`](disk-retention.ts): `keepWorkspaceDisk`.
- [`workspace-sockets.ts`](workspace-sockets.ts): the workspace event
  socket.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`.
- [`image-timers.ts`](image-timers.ts): `refreshImagesForPush` and
  `runImageAlarm`.
- [`image-coordinator.ts`](image-coordinator.ts): `ImageCoordinator`.
- [`image-sources/materialize.ts`](image-sources/materialize.ts):
  `createGitHubImageSourceMaterializer`.
- [`image-software.ts`](image-software.ts): the runner archive check, the
  install command, and the startup command.
- [`commands.ts`](commands.ts): `repositoryDirectory`, the repository folder
  in a sandbox.
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
