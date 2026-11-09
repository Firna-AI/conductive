# Chat backend

This folder holds the chat backend of the workspace Durable Object. One
Durable Object serves one workspace. It keeps the sessions, the messages,
and the chat history of that workspace. It gives each message to the agent
runner in the sandbox. It stores the events of the runner and pushes them
to each open tab. A tab is one browser connection to the events socket.

[Chat and events](../../docs/protocol/chat-and-events.md) and
[Access and security](../../docs/protocol/access-and-security.md) state the
requirements. This README names the code, its guarantees, and the seams
for other milestones.

## Entry points

`Workspace` in [`worker/workspace.ts`](../workspace.ts) is the Durable
Object class. Its `fetch` gives device paths to the device feature first.
It gives each other request to `WorkspaceChat.fetch` in `backend.ts`,
which serves these routes. The path helpers live in
`src/shared/sessions.ts`, `src/shared/events.ts`, and
`src/shared/agent-tools.ts`.

| Route | Path helper | What it does |
| --- | --- | --- |
| `GET` sessions | `sessionsPath` | Lists the open sessions and the session history |
| `POST` sessions | `sessionsPath` | Creates a session. The requester becomes its starter |
| `PATCH` session | `sessionPath` | Renames a session |
| `POST` messages | `sessionPaths.messages` | Accepts a message. During a running turn, the message joins that turn. When the starter's login cannot be used, or the starter does not share it with the sender, a new linked session takes it, as [Session logins](integration/README.md#session-logins) says |
| `POST` retry | `retryMessagePath` | Sends the message that `Session.retryMessageId` names again, also to a new linked session. Each other message gets `409 retry_not_available`, as [Retries](#retries) says |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session that the requester starts |
| `POST` close, reopen | `sessionPaths.close`, `sessionPaths.reopen` | Moves a session to the session history, and back |
| `GET` history | `chatHistoryPath` | Reads the stored events of one session |
| `GET` events socket | `workspaceEventsPath` | Sends the stored history, then each new event |
| `GET` runner socket | `MACHINE_PATHS.runner` | Connects the agent runner on the machine hostname |

The outer Worker forwards each route of this table to the object of its
workspace, as [the integration README](integration/README.md#the-outer-worker)
says. `routeChat` in [`router.ts`](router.ts) forwards the browser routes.
`routeRunner` forwards the runner socket of the machine hostname, by its
bearer token.

Trusted Worker code can also call methods of `WorkspaceChat` that run no
gate. [Trusted workspace calls](integration/README.md#trusted-workspace-calls)
gives their rules.

`Workspace` has these trusted chat RPCs with no HTTP path:

- `acceptLifecycleFirstMessage(first)` returns the stored first message of
  a create. A repeat returns the same message and adds no history.
- `readChatWorkspaceSummary()` returns the last event number, the last
  event number with visible output, and whether a dispatched turn runs.
- `readChatWorkspaceResponse(orgId, workspaceId)` returns the reply of a
  workspace read or Resume and that summary, as
  [Browser routes](../lifecycle/README.md#browser-routes) says.

[The workspace lifecycle](integration/README.md#the-workspace-lifecycle)
says how the lifecycle and chat work together.

A cross-agent model change uses the client's `newSessionId`. A repeated
request gets the same session. An unrelated occupied ID is refused. A
same-agent change ignores this field.

## Message admission

The public Send and Retry routes check the workspace creation attempt
before login checks or message writes. A pending or failed attempt gets
`409 workspace_starting` in every session. A repeat of an accepted
message request returns its stored acceptance before this check.

The creation attempt stays successful during later stops and resumes.
Messages on a resume still enter the stored queue. A workspace without
a creation attempt keeps its existing send behaviour.

The check reads the creation result published in D1. A delayed success
publication can keep new sends waiting after the native start succeeds.
The separate trusted first-message path does not use this public route.

## Access

[Chat access](access.md) gives the browser gates, the runner token checks,
the workspace version pin, and the login checks.

## History and event order

[History and event order](history.md) gives the serial queue, the one
publisher, the event numbers, the runner streams, and the order of the
runner commands.

## Retries

[Retries](retries.md) gives the stored retry state, and the rules of the
retry route for `Session.retryMessageId`.

## Report repairs

[Report repairs](report-repairs.md) says how the chat backend asks the
runner for one fresh full report after it refuses an update. It describes
the stored records, the refusal checks, and the sends before each confirm.

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

[Chat backend tests](tests.md) names the test support files and what each
group of tests covers.

## Seams for other milestones

[Chat backend integration](integration/README.md) gives the seams for other
features. It covers the hooks, the trusted workspace calls, the workspace
events, the outer Worker, and the lifecycle. It also covers the files, the
GitHub state, the agent runner, the logins and attachments, the session
logins, and the test fixtures. Its
[Outer Worker tests](integration/outer-worker-tests.md) guide gives the
tests through the production Worker entry.

## Key code

- `backend.ts`: `WorkspaceChat`, its gates, its trusted methods, the open
  tabs, and the one publisher of committed events.
- `workspace-binding.ts`: `ChatWorkspaceBinding`, which binds chat to one workspace and checks the object identity.
- [../model-gateway/workspace.ts](../model-gateway/workspace.ts): `WorkspaceTurnTokens`, available through `WorkspaceChat.turnTokens`.
  It derives a running turn's token and checks the starter's current login in the chat queue.
- `dependencies.ts`: the default seams of `WorkspaceChat`, which a feature
  owner can replace. The login resolver always wraps an override.
- `operation.ts`: `ChatOperation`, the reads and changes of one route, tab
  subscription, or dispatch, in the serial queue that its caller holds.
- `workspace-integration.ts`: `createWorkspaceIntegration`, which joins
  chat, the lifecycle, and the Mac devices in the workspace object. It
  sets the hooks, and gives the Mac devices the shared state writer.
- `workspace-operations.ts`: `WorkspaceOperations`, the queue-owned work of
  the lifecycle: the first message, the stop, the summary, and the
  lifecycle events.
- `first-message.ts`: the checks and the admission of the first message of
  a create.
- `workspace-summary.ts`: `WorkspaceSummaryProjection`, the summary that
  `readChatWorkspaceSummary` returns.
- `workspace-stop.ts`: `stopDispatchedTurns`, which ends the dispatched
  turns as stopped when the lifecycle state becomes stopped or error.
- `browser-authorization.ts`: `authorizeChatBrowser`, the browser gate of
  the object.
- `browser-subscription.ts`: `subscribeBrowser`, the queue-owned start of
  a browser tab: the login refresh, the tab registration, the close after
  a failed start, and the grant check before the history.
- `http-routes.ts`, `send-message.ts`, `messages.ts`, and `sessions.ts`: the
  routes, Send and Retry with linked sessions, the turns, and session state.
- `model-changes.ts`: client session IDs, the creation records that repeated
  requests match, and ID conflicts.
- `store.ts` and `history-storage.ts`: `ChatStore` and `ChatTransaction`,
  the records, the event numbers, the GitHub view of a transaction, and the
  chunks of large file reports and tree deltas.
- `runner-channel.ts`, `runner-receipt.ts`, and `runner-refusal.ts`: the
  runner connection, the stream cursors, the file commands, and the receipt
  or refusal marker of each runner event.
- `runner-output.ts` and `runner-output-state.ts`: the filter from the
  actual start capture, and its encrypted state. Each runner stream keeps
  its held answer text. One workspace record keeps each shown answer end
  that can still start a secret, so a new stream cannot complete such a
  secret. That state, the filtered events, and the raw cursor of the
  stream commit in one transaction. The shared field policy keeps
  operational paths and masks display labels.
- `runner-output.ts` also moves the answer ends of older stream records
  into the workspace record, at the first accepted receipt without that
  record. Held text stays with its own stream, because the held text of
  two streams has no order. A workspace record with no answer ends still
  marks the move as done, so later receipts do not scan older stream
  records again.
- `authenticated-runner.ts`: `AuthenticatedRunner`, the token check of the
  runner connection before each message and while it is idle.
- [`runner-version-data.ts`](runner-version-data.ts): `readRunnerProtocolVersion`, the workspace pin read before a runner's welcome or commands.
- `runner-event-identity.ts`: `readRunnerEventIdentity` returns the readable
  fields in `RunnerEventIdentity` for refusal, repair, and turn-context checks.
- `runner-delivery.ts`: the sends of pending commands, with the login
  check.
- `report-repairs.ts`, `repair-refusal.ts`, and `repair-delivery.ts`: the
  report repair of each kind, its start or failure at a refusal, and its
  sends before the confirm.
- `delivery-state.ts`: dispatch state before sending and queued-state restoration.
- `runner-input.ts`, `runner-event-limits.ts`, `agent-events.ts`, and
  `other-events.ts`: the checks and the caps of runner messages.
  `parseRunnerEnvelope` applies the byte limits to the raw message.
  `parseRunnerOutputEnvelope` checks each filtered event again. It skips
  the byte limits only for file events, because masked labels can make
  them larger.
- `turn-lifecycle.ts`, `turn-events.ts`, `turn-context.ts`, and
  `continuation.ts`: active and waiting turns, the dispatch rule of each
  command, the retry message of a turn end, safe turn context, late data,
  terminal events, and unanswered messages.
  `TurnLifecycle.finish` preserves a saved login-failure cause when a runner end or workspace stop follows a gateway Stop.
- `sockets.ts`: the WebSocket upgrades of tabs and the runner.
- `browser-tabs.ts`: open tabs, their grants, the refresh and expiry
  timers, and the grant check before each send. By default,
  `WorkspaceChat` gives it `readConnectionAccess` from
  [`worker/security/connection-access.ts`](../security/connection-access.ts).
- `router.ts`: `routeChat`, `routeRunner`, and `forwardWorkspaceRequest`,
  which forward the browser chat routes and the runner socket from the
  outer Worker to the object.
- `queries.ts`: the D1 reads of workspaces, tokens, members, and logins,
  and the title update of a workspace.
- `login-access.ts`, `login-availability.ts`, and `login-kind.ts`:
  `readLogin` and the access checks, the metadata query
  `readLoginMetadata`, and the valid login kinds.
- `session-login.ts` and `session-storage.ts`: the two login paths of
  `SessionLogins`, and the defaults of older session records.
- `session-record.ts`: `sessionFor`, the read of one session record.
- `types.ts`: `ChatDependencies`, `ChatCallbackPublisher`, `ChatStorage`,
  and the peer types.

## Related docs

- [Chat and events: Messages](../../docs/protocol/chat-and-events.md#messages)
- [Chat and events: Events](../../docs/protocol/chat-and-events.md#events)
- [Chat and events: Lost workspace updates](../../docs/protocol/chat-and-events.md#lost-workspace-updates)
- [Chat backend integration](integration/README.md)
- [Report repairs](report-repairs.md)
- [GitHub banner backend](../github/README.md)
- [Access and security: Agent logins in a sandbox](../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Access and security: The workspace token](../../docs/protocol/access-and-security.md#the-workspace-token)
- [Operator actions: Workspace tokens and runners](../../docs/protocol/operator-actions.md#workspace-tokens-and-runners)
- [Architecture: Workspace Durable Object](../../docs/architecture.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
