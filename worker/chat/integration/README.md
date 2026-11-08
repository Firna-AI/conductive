# Chat backend integration

This README gives the seams of the chat backend for other features, and
its test fixtures. The [chat backend README](../README.md) names the code
and its guarantees.
A file name without a folder names a file in `worker/chat/`.

`WorkspaceChat` takes `ChatDependencies` from `types.ts` as overrides.
`createWorkspaceIntegration` in `workspace-integration.ts` sets them for
the workspace object, as [The workspace lifecycle](#the-workspace-lifecycle)
says. Its `runnerEventStored` starts device cleanup at each turn end, also
after a refused end or a lifecycle error. A later handler must keep it.

## Trusted workspace calls

Trusted Worker code can call these methods of `WorkspaceChat`. They run no
gate. [The workspace lifecycle](#the-workspace-lifecycle) gives the methods
that the workspace object adds for the lifecycle.

- `appendWorkspaceEvent(workspaceId, event, occurredAt)` stores one
  `WorkspaceEvent` with the next workspace event number. Then it pushes
  the event to the open tabs.
- `changeWorkspace(workspaceId, work)` runs `work` with a
  `ChatTransaction` in one storage transaction. The events of `work` get
  the next numbers. After the commit, the one chat publisher pushes them
  to the open tabs. `appendWorkspaceEvent` uses it.
- `readWorkspace(workspaceId, work)` runs `work` with a `ChatTransaction`
  outside a storage transaction. Use it only for reads.
- `authorizedWorkspaceOperation(workspaceId, authorize, work)` enters the
  serial queue and awaits `authorize`. Only then does it run `work` in the
  same task. `work` gets a `WorkspaceOperation` from
  `workspace-operation.ts`. Its `change` runs one storage transaction, and
  the one chat publisher pushes the new events after the commit. Its
  `publish` pushes one committed envelope to the open tabs again. It
  stores nothing, so the event keeps its number. Neither enters the queue
  again.
- `commitPreviewRevocations(workspaceId, previewIds)` stores each missing revocation event and its marker in one transaction.
  It uses the common publisher and does not enter the queue.
- `sendFileCommand(workspaceId, command)` sends one `file.read` or
  `file.diff` command to the ready runner. It resolves to `false` when no
  runner is ready or the send fails.
- `sendFileCommand` adds nothing to the history or to the pending
  commands. So a new runner connection does not get the command again.
- `closeRunner()` closes the current runner connection, for example when
  the sandbox stops.

Other features can add events to the same numbered history. The method
depends on where the code runs:

- Outside the runner hooks, await `appendWorkspaceEvent`.
- To commit feature records with their events, await `changeWorkspace`
  outside the runner hooks.
- Inside `runnerReady` or `runnerEventStored`, await the `publish`
  argument, a `ChatCallbackPublisher`. It commits the event in the task of
  the hook, then pushes it to the open tabs. Do not call
  `appendWorkspaceEvent` inside a runner hook.
- `appendWorkspaceEvent`, `changeWorkspace`, `readWorkspace`,
  `authorizedWorkspaceOperation`, and `sendFileCommand` wait in the serial
  queue. A runner hook and the work of `changeWorkspace` and
  `authorizedWorkspaceOperation` also run in that queue. Do not await these
  calls inside them. The call would wait for the running task itself.
- Inside the work of `authorizedWorkspaceOperation`, use its `change` and
  `publish`.
- Do not add another event sequence or another publisher. To send a
  committed event again, use the `publish` of
  `authorizedWorkspaceOperation`.

## The outer Worker

- `createApp` in `worker/application.ts` forwards the Mac device routes to
  the Durable Object. See [Mac device commands](../../devices/README.md).
- After the host and `Origin` checks, `createApp` gives each other app API
  request to `routeChat` in `router.ts`. This happens before the app
  request gate.
- `routeChat` matches the `sessions` path of a workspace and each path below
  it. It also matches the `history` and `events` paths. Each other path goes
  on to the app request gate.
- `routeChat` decodes the workspace ID of the path once. An ID that does not
  decode gets `404 workspace_not_found`.
- `forwardWorkspaceRequest` sends the original request to
  `env.WORKSPACES.get(env.WORKSPACES.idFromName(workspaceId))`. The request
  keeps its URL, its headers, and its unread body. The body limit of the
  Worker entry still bounds that body. The Durable Object runs the gate
  itself.
- `forwardWorkspaceRequest` copies the response into a new `Response`, with
  the WebSocket of an upgrade. So the outer Worker can add its private
  response headers.
- Do not run `gate` on a request that you forward. `gate` reads the JSON
  body of each write.
- On the machine hostname, `createApp` serves the Mac command route, then
  `MACHINE_PATHS.gitCredential` and `IMAGE_SOURCE_CREDENTIAL_PATH` through
  their lifecycle handlers. It gives each other path to `routeRunner` in
  `router.ts`. `routeRunner` matches only `MACHINE_PATHS.runner`,
  `/v1/runner`. The workspace tools and signed GitHub webhook use their own handlers.
  Each unknown machine path gets a `501` stub.
- The runner request has only its bearer token. `routeRunner` reads only
  the `Authorization` header, and finds the workspace with `tokenWorkspace`.
  A missing, unknown, or revoked token gets `401 workspace_token_required`.
- `routeRunner` uses the workspace ID from D1 as the object name, with no
  decode. It forwards the request with `forwardWorkspaceRequest`, without
  the browser gate.
- The Durable Object checks the machine origin and the token again. So a
  token reaches only the object of its own workspace. A `hello` that names
  another workspace closes the connection before a welcome, a command, or a
  login goes out.
- After the app request gate, `chatLifecycleRoute` in
  `worker/app-api/lifecycle.ts` gives the create, read, resume, and
  activity routes of a workspace to the lifecycle handler. It gives the
  first message of a create to `acceptLifecycleFirstMessage` of the
  workspace object. The
  [lifecycle README](../../lifecycle/README.md#browser-routes) gives the
  handler and its options.

[Outer Worker tests](outer-worker-tests.md) gives the tests of these
routes through the production Worker entry, and the browser harness.

## The workspace lifecycle

`createWorkspaceIntegration` joins chat, the lifecycle, the file broker, and the Mac devices
in the workspace object. The object also owns the preview, terminal, desktop, and GitHub handlers. The outer Worker calls the lifecycle through RPC
methods of `Workspace`.

- Chat and the lifecycle share the serial queue of `ChatStore`. Each
  lifecycle change of `Workspace` runs in it through `runLifecycle`, then
  calls `flushRunner`. So a waiting turn goes out when the lifecycle state
  allows it.
- `acceptFirstMessage`, `stopWorkspace`, `commitWorkspaceEvent`, and
  `flushRunner` do not enter the queue. Call them only inside it.
  `workspaceSummary` enters the queue.
- `waitCreationAdmission`, `waitCreationLifecycle`, and `waitLifecycleStart`
  do not hold the queue. So they cannot block the alarm that they wait for.
- A change of a Mac request enters `authorizedWorkspaceOperation` once.
  Inside it, the projection callback of `createWorkspaceIntegration` reads
  the stored session with `chat.store.read`, then calls
  `projectDeviceState` of the controller. The lifecycle reads the waiting
  requests through `deviceWaiting`. Neither read enters the queue again.
  [The shown state](../../lifecycle/workspace-object.md#the-shown-state)
  gives the one writer of the D1 state and its event.
- Keep the lifecycle records outside the `chat:v1:` key prefix.

### The first message

- `initializeLifecycle` checks the workspace and the org membership of the
  sender. Then its admission hook gives the assigned first message to
  `acceptFirstMessage`.
- `requireFirstMessage` in `first-message.ts` checks the stored creator,
  the session, the turn, the message ID, and the model choice. A mismatch
  gets `404 workspace_not_found`, and nothing is stored.
- `admitFirstMessage` of the same file needs a stored agent login of the
  sender. One chat transaction stores the session, the message, its first
  turn, and their events. It commits before `initializeLifecycle` returns.
  So the first message is durable before a browser can lose the create
  reply.
- A repeat returns the stored message and adds no history. An archived
  workspace can return its stored first message, but admits no new one.
- The RPC `acceptLifecycleFirstMessage`, or a `runner.ready` event, clears
  the pending first message of the lifecycle.

### Hooks and events

- Each hook passes its `publish` argument to the lifecycle. So the
  lifecycle events of a hook commit in the task of that hook.
- `runnerHello(workspaceId, publish)` runs after each `welcome`, also on a
  stream that is not ready. It repairs the lifecycle, as
  [Turn recovery](../../lifecycle/workspace-object.md#turn-recovery) says.
- `runnerReady(workspaceId, publish)` runs after the Durable Object stores
  each `runner.ready` event, and after `runnerHello` on a stream that sent
  it before. It reports the event to the lifecycle. A runner that is ready
  before the start is prepared gets its turns only after that. Their
  messages and model changes wait behind them.
- `runnerEventStored(envelope, publish)` runs after each other stored runner
  event or refusal marker. It reports `turn.started`, `turn.completed`,
  `turn.failed`, and `start.updated`, with their stored `occurredAt`. A
  refused `turn.completed` or `turn.failed` ends its lifecycle turn.
- A `workspace.title` updates the name of the workspace in D1. It is not
  unread output.
- `runnerReady` and `runnerEventStored` run after the commit and the
  confirm. A hook error closes the runner connection, and the runner does
  not send that event again. The next `hello` repairs the turns and the name.
- `turnDispatching` registers the sender of a turn with the lifecycle
  before the command goes out. While the lifecycle state allows no turn, it
  returns `false`, and the turn waits. `turnDispatchFailed` removes that
  turn after a failed send. It also removes it when the runner disconnects
  while `turnDispatching` registers the turn, before the send.
- `runnerDisconnected` reports a closed runner connection. It runs later in
  the queue, through `waitUntil`.
- The other lifecycle events go through `commitWorkspaceEvent`, with the
  one chat publisher. No hook calls `appendWorkspaceEvent` while it holds
  the queue.

### Stop and summary

- When the lifecycle state becomes `stopped` or `error`, or a failed create
  clears the lifecycle, `stopWorkspace` closes the runner. It ends each
  running or stopping turn as stopped. Queued turns stay for the resume.
  Device cleanup starts too.
- During org deletion, a missing workspace ends only the state projection.
  Device reconciliation still settles the request and sends its broker cancellation.
- `workspaceSummary` gives the last event number, the last event number
  with visible output, and whether a dispatched turn runs. Its record
  commits with the events and the turns. Queued turns do not count as
  working.
- Known limit: `Workspace.alarm` holds the queue during one lifecycle
  phase. A phase can make several provider requests. Each can take up to 30
  seconds, 65 for a file read, or 610 for a command. So a slow phase
  delays the chat reads, the messages, and the runner receipts of that
  workspace.

## Milestone 9: files

- The Durable Object joins file parts with `RunnerFileReports` on
  `ChatTransaction.files`. It stores each complete report before the confirm.
- `runnerEventStored` gets each complete file report and tree delta, never a
  part. It must not apply them to the files projection again.
- Send each `file.read` and `file.diff` request with `sendFileCommand`. A
  `false` result means that no runner got the request.
- `runnerAttached(workspaceId, connectionId, send)` attaches the file broker when a physical runner is ready.
  The callback keeps the physical identity across commands. `runnerDetached(connectionId)` removes that connection.
- `receiveFileResult(value, connectionId)` gets each `file.read.result` and
  `file.diff.result` message from that physical connection without payload checks. Validate the message in the
  hook. File results never enter the history.
- [The files integration](../../files/README.md#integration) says how to attach
  file reads. Do not call `WorkspaceFiles.connect` on this path.

## GitHub state

- `createGitHubStatePort` in `worker/github/chat-store.ts` builds the
  GitHub state port from `readWorkspace` and
  `authorizedWorkspaceOperation`. Its `run` checks access again after it
  enters the queue, then commits or replays in that same task.
- Its transaction is `ChatTransaction.github`. That view gives the GitHub
  state its records and its `github.updated` events in the same chat
  transaction. The GitHub records use the `github:` key prefix.
- Use that port. Do not build another store or publisher for GitHub.
- The port uses these queued calls, so the rules of
  [Trusted workspace calls](#trusted-workspace-calls) apply to a GitHub
  refresh.
- [The GitHub server integration](../../github/README.md#server-integration)
  gives the routes, the scheduled reads, and the refresh operation.

## Milestone 7r: the agent runner

- The Durable Object stores agent events as the runner sends them. It
  copies only the known fields, and it refuses an unknown event type.
- It requires and preserves tool-detail and turn-file omission counts.
  These counts are non-negative safe integers.
- It requires file-report revisions, part numbers, and part counts as positive
  safe integers.
- `runner.event-refused` is workspace-only. The runner parser refuses it.
- So the runner maps the SDK events, removes the text that an SDK adds,
  and maps each result to `userMessageIds`.
- `turn.started` names the sender of the turn and its message IDs. Each
  agent event names a started turn of its session, including an ended turn.
- A valid late event adds data only. It changes neither the turn's end nor
  the session's active turn. An event for a never-started turn gets
  `turn_not_active`.
- An event that breaks these rules or a cap gets a refusal marker and a
  confirm. The runner must not send it again.
- Deduplicate the commands by `commandId`. A new connection gets each
  pending command again.
- After a text-only turn, each unanswered message moves to a new turn. So
  one message can come first in a `message` command, then in a new `turn`
  command with a new command ID.
- Each `turn` and `message` command carries the agent login of the session
  starter, whoever sent the message. The runner keeps the login of the
  first command of a turn for the whole turn.
- An interrupt for a turn that the runner does not run still gets
  `turn.completed` with state `stopped`.
- A new stream gets each command other than `report.refresh` only after its
  `runner.ready` event. A stream that sent `runner.ready` before gets them
  right after the `welcome`.
- A `report.refresh` command can come right after the `welcome`, before
  `runner.ready`, and during a running turn. Answer it with a full report of
  its kind.

## Agent logins and attachments

- The code that stores an agent login must encrypt it with `encrypt`,
  `agentLoginContext(userId, agent)`, and `BOAT_KEY_ENCRYPTION_KEY`.
- `readAgentLogin` decrypts with the same context and key. It accepts the
  kinds `token` and `api-key` for Claude, and only `api-key` for Codex.
- A message whose login is missing gets `409 agent_login_required`, and no
  session is created, as [Session logins](#session-logins) says.
- When the starter's login, or the sender's access, is gone as a command
  goes out, `turn.failed` ends the turn only while it is queued. The failure
  names the cause. A lost starter login sets `loginAvailable` to false.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- `resolveAttachments(userId, workspaceId, ids)` gets the ID of the sender,
  not of the starter. It returns the attachment records and the sandbox path
  of each attachment. The command gives the paths to the runner.
- By default, a message with an attachment gets
  `503 attachments_unavailable`.

## Session logins

[Session logins](session-logins.md) gives the starter of each session, the
two login paths of `SessionLogins`, and the linked sessions.

## Test fixtures

[Chat backend tests](../tests.md) names the test support files and what
each group of tests covers. [Outer Worker tests](outer-worker-tests.md)
gives the tests through the production Worker entry.
