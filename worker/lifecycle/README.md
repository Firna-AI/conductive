# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace is one task with its own branch
and its own Boat sandbox. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the app's one Boat key, as the [sandbox area](../sandbox/README.md)
says.

The root Worker does not call these handlers yet. `worker/routes.ts` has no
lifecycle route, and `worker/application.ts` serves a stub on the machine
hostname. The composition root must add each route and wrapper below.

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
- `acceptFirstMessage`: the hook of the chat backend. After the admission
  and for each repeat, it stores the queued first message of that admission
  and returns it. So it must be idempotent for the message and session IDs.
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
- Open and resume restart only a stopped or failed workspace. A resumed
  sandbox gets fresh env vars and runs the startup script again, but it
  fetches no code. A start older than the last stop cannot restart it.
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

The composition root must route `MACHINE_PATHS.gitCredential` to this
handler, and `IMAGE_SOURCE_CREDENTIAL_PATH` to `handleImageSourceCredential`
in [`image-sources/credential.ts`](image-sources/credential.ts), on the
machine hostname only, before any browser route, with the private error
response wrapper. Until then, a create cannot fetch a private repository
or push to an empty one, and a build cannot copy a repository.

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
- `acknowledgeLifecycleFirstMessage` clears the pending first message of
  the create. The admission keeps its own copy for repeats.

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
production `Workspace` must send each `workspace.updated` and
`start.updated` event to `WorkspaceChat`. Chat stores and numbers the only
workspace event history, with chat and lifecycle events.

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
steps, the log limits, the snapshot leases, and the refresh timers.

### Suspended users

The [operator action](../operator/README.md) records a suspension on a
user in D1. The lifecycle code reads it before each start and each build
step, with `requireActiveUser` from
[`user-access.ts`](../data/user-access.ts). A refusal is 403
`user_suspended`.

- `requireOrgMember` refuses a suspended user. So that user cannot
  create, resume, or build.
- An open or a resume that would start the sandbox also needs an owner
  who is not suspended. So no member can start a workspace of a suspended
  owner. A member who is not suspended can still open that workspace and
  read its history, also when it is archived.
- The start coordinator checks the users of a queued start before each
  phase: the owner and the sender of a create, the owner of a resume, and
  the member who asked for the resume. A refusal cancels the start. A
  cancelled resume stops its sandbox again. A cancelled create fails as
  [Browser routes](#browser-routes) says.
- `advanceImageBuild` stops each unfinished build that a suspended user
  started, also before its build sandbox exists, and marks it failed. A
  build whose create reply was lost first repeats its create to find that
  sandbox. The build then retries its cleanup until no build sandbox of
  that build is left.
- `keepWorkspaceDisk` makes no disk retention restart for a suspended
  owner. The [deleted-org retention](../members/README.md) skips such a
  workspace too.

`suspendLifecycle(workspaceId, ownerUserId)` of the workspace object stops
one workspace of a suspended owner. The operator action calls it for each
workspace that the user owns.

1. It cancels the active start, and it revokes the preview hostnames of
   the workspace.
2. While a start still runs, it sets an alarm one second later and
   reports that the stop is pending.
3. Otherwise it stops the sandbox with the app's Boat key, also when the
   org is deleted. A confirmed stop clears the turn records and sets the
   `stopped` state. A sandbox that Boat no longer has counts as stopped. A
   Boat `error` state sets the error state with `user_suspended`.
4. A stop that Boat has not confirmed, or a failed stop, sets an alarm 30
   seconds later and reports that the stop is pending.

While the owner stays suspended, each alarm of the workspace object runs
this stop again. So the stop continues without the operator.
`suspendLifecycle` returns `true` when the stop is complete. It also
returns `true` when the workspace has no suspended owner, or when another
user owns it now.

## Settings

The lifecycle code reads `LifecycleEnvironment` from
[`runtime.ts`](runtime.ts). It needs these values in addition to the
[Get started](../../README.md#get-started) values:

| Name | Value |
| --- | --- |
| `WORKSPACES` | The Durable Object binding in `wrangler.jsonc`. |
| `MACHINE_ORIGIN` | The `https://` origin of the machine hostname. Each sandbox gets it as `CONDUCTIVE_MACHINE_ORIGIN`. Both credential routes refuse every request without it, and a build cannot copy a repository. |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub App's private key, as PEM. A build or refresh needs it when the org chose a repository. The PEM file from GitHub works as it is. |

`BOAT_KEY_ENCRYPTION_KEY` also encrypts the workspace tokens.

## Development

Run the lifecycle tests with `npm run test -- worker/lifecycle`. They run in
Node with local D1 and fakes. The tests of the suspension of a user live in
`worker/operator/`, so run `npm run test -- worker/operator` too after a
change to the suspension checks. Node cannot load `worker/workspace.ts`,
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
- [`start-coordinator.ts`](start-coordinator.ts): `WorkspaceStartCoordinator`,
  the durable start. [`start-storage.ts`](start-storage.ts) keeps its
  phases, admission, process IDs, output offsets, and results.
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
- [`workspace-actions.ts`](workspace-actions.ts): the stop, deadline, and
  state read actions on the sandbox.
- [`workspace-suspension.ts`](workspace-suspension.ts):
  `suspendWorkspaceLifecycle`, the stop of a workspace of a suspended
  owner. [`start-access.ts`](start-access.ts): `requireActiveStartUsers`,
  the user check of a queued start.
- [`resource-intents.ts`](resource-intents.ts): `createResource`, the only
  path to a Boat call that creates a sandbox or a snapshot. It stores the
  request first, so the lifecycle finds the resource after a lost reply.
- [`disk-retention.ts`](disk-retention.ts): `keepWorkspaceDisk`.
- [`durable-journal.ts`](durable-journal.ts): `WorkspaceEventJournal`.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`.
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
  into a Bash command.
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
- [Operator actions](../operator/README.md): the suspension of a user.
