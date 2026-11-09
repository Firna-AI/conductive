# Routes and input activity

This page is part of the [workspace lifecycle](README.md) guide. It gives the browser
routes, the input activity, and the machine route of this folder.

## Browser routes

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
takes the reply from `readChatWorkspaceResponse` of the workspace object.
That read runs in one task of the chat queue. That reply has the event
number of its state. Its name comes from the latest committed agent title,
when there is one. The state for the reader uses the chat summary of the
same read.

[Creates and resumes](workspace-object.md#creates-and-resumes) says how the
workspace object runs the start of each create and resume. It gives the
waits, the replies, the branch, the terminal start hook, the runner
readiness, and the stop cleanup of a failed resume.

- A create needs a published org image and a repository that its build
  loaded. A change to the chosen repositories takes effect after the next
  successful build. A repeat of the same first message ID from the same
  sender returns the same admitted workspace, including after a failed start.
- A failed admitted create keeps its workspace, chat, first message, and
  queued messages. Each current member can read the saved cause and history.
  Failure revokes the token and detaches the failed sandbox after saving cleanup ownership.
  Lifecycle cleanup leaves the attachments to their owner.
- Try again uses the Resume route. It queues a replacement create in the
  same workspace, with the same branch and first-message identities.
  The replacement pins the current published image for its repository.
  It gets a fresh allocation key, token, command journal, and start deadline.
  Known and uncertain cleanup finish before the replacement allocates.
  A failure before first-message acceptance can remove provisional records.
- The [member checkpoint adapter](../members/creation-checkpoint.ts) retains a create that Delete interrupted, before or after allocation.
  The production resume route continues that create when the workspace opens after Restore.
  It keeps the allocation attempt, the first message, and the sender. It renews a revoked workspace token.
  The requeue gives the create a fresh `deadlineAt`, `WORKSPACE_START_TIME_LIMIT_MS` after that open.
  `creation.createdAt` keeps the original creation date.
  A create without a sandbox continues from its pinned image.
  A create with a retained sandbox resumes that sandbox through the same readiness step as a resume, with the current env vars of the org.
  It then continues at the saved creation step in `afterReadyPhase`. Its commands use a fresh journal key, `commandAttempt`, and the allocation keeps `attempt`.
  A checkpoint that waited for runner readiness repeats the startup step after sandbox readiness, to rebuild the runtime files.
  Its finished fetch and branch steps stay complete.
  The branch step uses the branch when it already exists.
- Input from the browser, the terminal, and previews resets the idle time,
  as [Input activity](#input-activity) says.
- The build log is a stream of server-sent events. It continues after the
  `Last-Event-ID` header or the `after` value, and it ends with a `build`
  event when the job ends. One D1 batch reads the build state and its log,
  so the stream sends all log events before the final `build` event.

`createWorkspace` in [`workspaces.ts`](workspaces.ts) also takes an optional
trusted `sender` as its last argument. The agent tools need it for a
workspace that an agent creates. The `user` stays the owner, and the first
turn and the branch step use the sender.

## Input activity

[Stop and resume](../../docs/protocol/workspaces-and-sandboxes.md#stop-and-resume)
says which input counts as activity. One `InputActivityOwner` in each
workspace object receives the input times of the browser `activity` route,
the terminal, and previews. The terminal and preview handlers report each
input through `ToolDependencies.onActivity(workspaceId, at)`. That call
returns at once.

- The owner saves the newest input time in the durable lifecycle state,
  fenced by the member generation. The shared deadline hook checks the org
  before this queued local write. The write publishes no shown state and
  waits for no provider call.
- The idle stop still comes 30 minutes after `lastActivityAt`.
- The owner updates D1 and the provider at most once a minute. The first
  input after a quiet minute starts an update. One more update follows for
  the newest input of that minute.
- An update moves `last_activity_at` forward only, while the workspace, its
  sandbox, and the org generation stay active. It then sets the provider's
  auto-stop to 1,860 seconds, which covers the minute of collection.
- When the provider reports a stopped or failed sandbox, the update
  reconciles the durable lifecycle state.
- A failed update keeps its input time for the next minute, also without
  newer input. It writes one fixed warning through `warnWorker`.
- The deadline hook owns the same org check for the provider update and
  for queued activity, capture, reconciliation, and turn writes.
  A refused update preserves the activity time, provider deadline, and stop-retry alarm.
  Browser activity carries a plain refusal through RPC for the route's 403 reply.
  Stop, reconciliation, and disk cleanup keep their separate hooks.
- Each update runs through `waitUntil`. Input producers do not wait for the
  provider. Browser admission waits for its org check. No update holds the chat queue or the durable queue during a
  network call.

## Machine route

`handleGitCredential` in [`machine.ts`](machine.ts) serves
`MACHINE_PATHS.gitCredential` on the machine hostname. The
[git credential helper](../../image/README.md#git-credentials) sends the
workspace token as a bearer token, and the current turn ID in the
`X-Conductive-Turn-Id` header. The handler reads no request body and needs
no content type. `Workspace.credentialSender` maps that turn to a sender,
in the chat queue, as
[The git credential sender](workspace-object.md#the-git-credential-sender)
says, with its tests.

For the GitHub CLI outside an agent turn, the helper omits the turn header.
The handler then selects the workspace owner in its authorized D1 read.
A present but invalid turn header still fails, without an owner fallback.

The handler returns a fresh GitHub App user token of the sender, from
`freshGitHubUserToken` in [`github-tokens.ts`](../security/github-tokens.ts).
It stores no token. A user without a stored GitHub token must sign in again.
One response helper runs the same authorization before token resolution and after its last wait.
Each authorization reads the trusted turn sender through `credentialSender`,
or the workspace owner for a request without a turn header.
Its final D1 read in [`machine-credential-data.ts`](machine-credential-data.ts) checks the shared workspace token rule, sender membership, and sender suspension together.
The handler does no asynchronous work between that final read and the reply.
It also checks that both authorizations selected the same person.

`createApp` in [`worker/application.ts`](../application.ts) routes
`MACHINE_PATHS.gitCredential` to this handler, and
`IMAGE_SOURCE_CREDENTIAL_PATH` to `handleImageSourceCredential` in
[`image-sources/credential.ts`](image-sources/credential.ts). It does this
on the machine hostname only, after the Mac command route and before the
runner socket, with the private error response wrapper.
