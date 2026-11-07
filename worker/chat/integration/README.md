# Chat backend integration

This README gives the seams of the chat backend for other features. The
[chat backend README](../README.md) names the code and its guarantees.
A file name without a folder names a file in `worker/chat/`.

`WorkspaceChat` takes `ChatDependencies` from `types.ts` as overrides.
`Workspace` sets `matchesObject` and `runnerEventStored`. The latter starts
device cleanup when a turn ends, including a refused turn end.
A later handler must keep that call.
The other hooks keep their defaults until their owners set them.

## Trusted workspace calls

Trusted Worker code can call six methods of `WorkspaceChat`. They run no
gate.

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
- On the machine hostname, `createApp` gives each path other than the Mac
  device routes to `routeRunner` in `router.ts`. `routeRunner` matches only
  `MACHINE_PATHS.runner`, `/v1/runner`. Each other machine path gets a `501`
  stub.
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
- The outer Worker has no lifecycle route yet. So no browser request can
  create a workspace or queue its first message. The
  [lifecycle README](../../lifecycle/README.md#browser-routes) gives the
  handler and its options.

## Outer Worker tests

The files of this section live in this folder, `worker/chat/integration/`.

- `forwarding.test.ts` sends each request through `worker/index.ts`, the
  production Worker entry, in Miniflare. It uses the real `Workspace`
  class, SQLite storage, D1, and real WebSockets. Only Boat and GitHub are
  fakes.
- These tests check that an encoded workspace ID reaches its own object,
  with the authenticated headers and the complete JSON body. They check the
  gate of the object on forwarded routes. They also check the replay cursor
  and the live events of the events socket.
- `runner-forwarding.test.ts` uses the same runtime, and connects a fake
  runner with only its bearer token. A member's queued message reaches the
  runner with the member's login. Text streams to the browser, and Stop
  goes out on the same path.
- `runner-access.test.ts` checks that a missing, unknown, or revoked token
  cannot upgrade, and that an unconfigured machine hostname stays
  forbidden. It also checks that a token of another workspace cannot claim
  this workspace or get its queued message.
- `runner-socket.test-support.ts` holds that fake runner, on a real
  WebSocket. `runner-launcher.test.ts` checks the runner start script, as
  the [image README](../../../image/README.md#development) says.
- `createOuterRuntime` in `outer-runtime.test-support.ts` bundles that
  entry with Vite and starts it, with `https://api.conductive.test` as the
  machine origin. `seedOuterRuntime` in `outer-seed.test-support.ts` adds
  three users with sessions, two orgs, two workspaces with tokens, stored
  agent logins, a Boat key, and a published org image.

`run-browser-harness.mjs` serves a production app build through the same
runtime, over local HTTPS. Run it from the repository root, after
`npm run build`:

```sh
node worker/chat/integration/run-browser-harness.mjs
CHAT_HARNESS_ASSETS=path/to/client CHAT_HARNESS_PORT=5181 \
  node worker/chat/integration/run-browser-harness.mjs
```

- It serves `https://127.0.0.1:5178`, with a self-signed certificate.
  `CHAT_HARNESS_PORT` sets another port.
- It reads the built app from `dist/client`. `CHAT_HARNESS_ASSETS` sets
  another folder, which must hold `index.html`.
- It writes the origin, the session cookie of the seeded owner, the
  workspace URL, the machine origin, the workspace token, and the IDs to
  `.context/chat-harness/browser-harness.json`.
- `startBrowserHarness` in `browser-server.test-support.ts` starts the
  runtime. SIGINT or SIGTERM stops it.
- The harness bundles the Worker when it starts. So restart it after a
  change of the Worker code.
- The harness hides no missing route. The app API paths that the outer
  Worker does not route still get `404` there. So the app shell fails to
  start in it.

## Milestone 5: workspace lifecycle

- `Workspace` gives the lifecycle `appendWorkspaceEvent` for its workspace
  events. No other production code connects the lifecycle and chat yet.
  The [lifecycle README](../../lifecycle/README.md#workspace-durable-object)
  lists the lifecycle hooks that wait for chat.
- No chat code implements the `acceptFirstMessage` option of a create. It
  must store the first message with the session and turn IDs that the
  lifecycle chose. A repeat with the same IDs must return the same message
  and store nothing new.
- `ChatDependencies` has no hook for a sent turn or a closed runner
  connection. `Workspace` does not give runner events to the lifecycle yet.
- No code calls `closeRunner()` at a sandbox stop. `WorkspaceChat` has no
  method that ends the active turns at a stop.
- `Workspace.fetch` tries device routes, then gives the remaining requests
  to chat. Match lifecycle routes before the chat call.
- `authorizeBrowser` gives a lifecycle route the same gate and workspace
  check. It reads the body, so do not pass that request on to `fetch`.
- `runnerReady(workspaceId, publish)` runs after the Durable Object stores
  each `runner.ready` event.
- `runnerEventStored(envelope, publish)` runs after each other stored runner
  event or refusal marker. Examples are `start.updated` and `workspace.title`.
- Both hooks run after the commit and the confirm. A hook error closes the
  runner connection, and the runner does not send that event again.
- Add the start steps and `workspace.updated` with `appendWorkspaceEvent`.
  Inside a hook, use its `publish` argument.
- Call `closeRunner()` when the sandbox stops.
- Keep the lifecycle records outside the `chat:v1:` key prefix.

## Milestone 9: files

- The Durable Object joins file parts with `RunnerFileReports` on
  `ChatTransaction.files`. It stores each complete report before the confirm.
- `runnerEventStored` gets each complete file report and tree delta, never a
  part. It must not apply them to the files projection again.
- Send each `file.read` and `file.diff` request with `sendFileCommand`. A
  `false` result means that no runner got the request.
- `receiveFileResult(value)` gets each `file.read.result` and
  `file.diff.result` message without checks. Validate the message in the
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
- Each `turn` and `message` command carries the login of its message's
  sender. When the sender of a turn changes, start the agent again.
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
- A message without a stored login gets `409 agent_login_required`.
- When the login is gone as a command goes out, `turn.failed` ends the
  turn only while it is queued.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- `resolveAttachments(userId, workspaceId, ids)` returns the attachment
  records and the sandbox path of each attachment. The command gives the
  paths to the runner.
- By default, a message with an attachment gets
  `503 attachments_unavailable`.
