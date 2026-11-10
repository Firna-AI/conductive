# Chat backend integration

This README gives the seams of the chat backend for other features, and
its test fixtures. The [chat backend README](../README.md) names the code
and its guarantees.
A file name without a folder names a file in `worker/chat/`.

`WorkspaceChat` takes `ChatDependencies` from `types.ts` as overrides.
`createWorkspaceIntegration` in `workspace-integration.ts` sets them for
the workspace object, as [The workspace lifecycle](workspace-lifecycle.md)
says. Its `runnerEventStored` starts device cleanup at each turn end, also
after a refused end or a lifecycle error. A later handler must keep it.

## Trusted workspace calls

Trusted Worker code can call these methods of `WorkspaceChat`. They run no
gate. [The workspace lifecycle](workspace-lifecycle.md) gives the methods
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
- Before forwarding, the chat and feature routers call `sessionGate` on
  the original request. It checks the session and app access without
  reading the body. A waiting session gets 403 `access_required` before
  any workspace lookup or call.
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

[The workspace lifecycle](workspace-lifecycle.md) gives how chat and the
lifecycle work together in the workspace object.

### The first message

[The first message](workspace-lifecycle.md#the-first-message) gives the
checks and the admission of the first message of a create.

### Hooks and events

[Hooks and events](workspace-lifecycle.md#hooks-and-events) gives the chat
hooks that report runner events to the lifecycle.

### Stop and summary

[Stop and summary](workspace-lifecycle.md#stop-and-summary) gives the
runner stop at a stopped or error state, and the workspace summary. It
also gives the kept chat and queued messages of a failed admitted create.

<a id="milestone-9-files"></a>

## Files

- The Durable Object joins file parts with `RunnerFileReports` on
  `ChatTransaction.files`. It stores each complete report before the confirm.
- `runnerEventStored` gets each complete file report and tree delta, never a
  part. It must not apply them to the files projection again.
- Send each `file.read` and `file.diff` request with `sendFileCommand`. A
  `false` result means that no runner got the request.
- `runnerAttached(workspaceId, connectionId, send)` attaches the file broker when a physical runner is ready.
  The callback keeps the physical identity across commands. `runnerDetached(connectionId)` removes that connection.
  A ready runner that the object restores after a wake attaches again with the same connection ID.
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

<a id="milestone-7r-the-agent-runner"></a>

## The agent runner

[The agent runner](runner-rules.md) gives the rules of runner events and
commands that the agent runner and the Durable Object share.

## Agent logins and attachments

[Agent logins and attachments](logins-and-attachments.md) gives the login checks, the share refusal, and the attachment seams.

## Session logins

[Session logins](session-logins.md) gives the starter of each session, the
two login paths of `SessionLogins`, and the linked sessions.

## Test fixtures

[Chat backend tests](../tests.md) names the test support files and what
each group of tests covers. [Outer Worker tests](outer-worker-tests.md)
gives the tests through the production Worker entry.
