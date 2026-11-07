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
| `POST` sessions | `sessionsPath` | Creates a session |
| `PATCH` session | `sessionPath` | Renames a session |
| `POST` messages | `sessionPaths.messages` | Accepts a message. During a running turn, the message joins that turn |
| `POST` retry | `retryMessagePath` | Sends the message that `Session.retryMessageId` names again. Each other message gets `409 retry_not_available`, as [Retries](#retries) says |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session |
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

`Workspace` has two trusted RPCs with no HTTP path:

- `acceptLifecycleFirstMessage(first)` returns the stored first message of
  a create. A repeat returns the same message and adds no history.
- `readChatWorkspaceSummary()` returns the last event number, the last
  event number with visible output, and whether a dispatched turn runs.

[The workspace lifecycle](integration/README.md#the-workspace-lifecycle)
says how the lifecycle and chat work together.

A cross-agent model change uses the client's `newSessionId`. A repeated
request gets the same session. An unrelated occupied ID is refused. A
same-agent change ignores this field.

## Access

The Durable Object runs the gates itself.

- A forwarded browser chat request keeps the body limit of the Worker
  entry and the host and `Origin` checks. The outer Worker skips its
  request gate, so only the gate of the Durable Object parses the JSON body.
- `authorizeBrowser` runs `gate` from `worker/security/gate.ts`, the gate
  of the other app routes. It checks the app hostname, the `Origin`
  header, the session cookie, the org membership, and the body of writes.
- `findChatWorkspace` then reads the workspace from D1. The workspace must
  belong to that org, and the org must not be deleted.
- Each open tab holds a `workspace` identity. The
  [shared connection reader](../security/README.md#open-connections) of
  the security area gives it a grant with a deadline. The `workspace` kind
  needs no running sandbox. So the tabs of a stopped or archived workspace
  stay open.
- The Durable Object reads the first grant of a new tab before the
  history read. It checks the grant again before it sends the history. A
  tab without a valid grant gets no history and `404 workspace_not_found`.
- Each event send checks the grant first, without a D1 read. A tab with
  an expired grant closes and gets no event.
- Every 15 seconds, one D1 query refreshes the grants of all open tabs.
  The refresh closes each tab without a new grant. Sign-out, membership
  removal, session expiry, and org deletion end access. A failed read
  closes each tab of its batch.
- A separate expiry timer closes each tab at its grant deadline, also
  while a refresh read waits. A late read result cannot reopen a closed
  tab.
- Both timers stop when the last tab closes.
- An archived workspace still serves its history and its events socket.
  Each write gets `409 workspace_archived`.
- `connectRunner` accepts only `/v1/runner` on `MACHINE_ORIGIN`, with
  `Authorization: Bearer <workspace token>`.
- `tokenWorkspace` hashes the token. It accepts a token that is not
  revoked, of a workspace that is not archived, in an org that is not
  deleted.
- The runner sends `hello` first, with `RUNNER_PROTOCOL_VERSION` and its
  workspace ID. A new runner connection closes the previous one.
- The first workspace that passes a gate binds the Durable Object. Each
  other workspace gets `404 workspace_not_found`. So does a workspace that
  `matchesObject` refuses, because `WORKSPACES.idFromName` names another
  object.
- `resolveLogin` first checks that the sender is still a member and that
  the workspace is not archived. Then it reads the login. An override
  replaces only the read.
- Before dispatch, the same D1 read also checks the token hash of the live
  runner connection. A revoked or replaced token closes that connection
  without sending a login. The command stays queued.
- The Durable Object reads the login when it accepts a message. It reads
  it again for each `turn` and `message` command that it sends. Its
  storage never holds a login.

## History and event order

- `ChatStore.run` is one serial queue. Each request, each runner message,
  each command send, and each trusted read, change, or replay runs in it,
  one at a time.
- `ChatStore.change` commits the new events, the runner cursor, and the
  changed records in one storage transaction. The tabs get the events
  only after the commit.
- One publisher of `WorkspaceChat` pushes the events of each commit to the
  open tabs, in the queue task of that commit. So the tabs get the events
  in commit order.
- A failed send closes its tab. When the tab connects again, it gets the
  missed events from the stored history.
- Each event gets the next workspace event number. The numbers start at 1,
  have no gaps, and span all sessions and runner streams.
- A tab connects with `after`, the last event number that it has. It gets
  one `history` message with the stored events after that number. Then it
  gets one `event` message for each new event.
- The history read and the new subscription run in the queue. So no event
  falls between them, and no event comes twice.
- The records use the `chat:v1:` key prefix of the Durable Object storage.
- Each runner stream numbers its events from 1. The Durable Object stores
  a runner event, or its refusal marker, only when its number is the stream
  cursor plus one.
- A duplicate gets a new confirm and is not stored again. A gap gets a
  `resend` from the first missing number. The `welcome` gives the cursor,
  or less while a [report repair](#report-repairs) waits for its first send.
- The `turn_not_active` reason means that the turn never started.
- Valid late events append to a started turn that ended. They change no
  turn, session, message, or command state.
- A refused `turn.completed` or `turn.failed` ends its started active turn as `failed`.
- A message and its command commit together. The Durable Object sends the
  commands in order when the runner is ready.
- After the login checks, delivery commits the turn state before sending.
  If sending a newly dispatched turn throws, delivery restores its queued
  state. `message.sent` follows a successful send.
- The internal `StoredTurn.started` marker keeps dispatch evidence after an end.
- The interrupt route stores and pushes `turn.stop-requested` with the
  authenticated member's ID before it interrupts the runner. Runner events
  cannot set that member.
- A message accepted while the active turn stops waits in another stored
  turn. Its commands go out only after that turn becomes active.
- After a finished turn, its unanswered messages run before later waiting
  work. Closing a session records its waiting turns as stopped in history.
- A command stays pending until the Durable Object removes it. A new runner
  connection gets each pending command again, with the same command ID.
- An active agent event that lists a message ID removes that message's
  command. The first end of a turn removes each command of that turn.
- A new `model` command replaces the pending `model` command of its
  session.

## Retries

[Messages](../../docs/protocol/chat-and-events.md#messages) states the
rules. `Session.retryMessageId` names the one message that the retry route
accepts. It is the only public part of the retry state.

- `ChatTransaction.newestTurn` and `saveNewestTurn` keep the ID of the
  newest turn of each session under the `chat:v1:newest-turn:` prefix. This
  internal record never reaches a tab.
- Each accepted message records its turn there, also a running turn that it
  joins. It also sets `retryMessageId` to null.
- The end of the active turn sets `retryMessageId` to the retry message of a
  failed end. It does so only when that turn is still the newest turn. Every
  other end sets null.
- A refused end has no retry message, so it sets null.
- A turn that waits counts as the newest turn, also after a Stop ends it
  before it starts.
- When the newest turn finishes, a continuation of its unanswered messages
  becomes the newest turn.
- The session record and its `session.updated` event commit in the same
  transaction as the change that sets the field.
- A missing message, or a message of another session, gets
  `404 message_not_found`. Each other message that the record does not name
  gets `409 retry_not_available`, and the route writes nothing.

## Report repairs

[Lost workspace updates](../../docs/protocol/chat-and-events.md#lost-workspace-updates)
states the rules. A report repair is the stored `report.refresh` command of
one `RunnerReportKind`. [Report repairs](report-repairs.md) describes the
stored records, the refusal checks, and the sends before each confirm.

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

[Chat backend tests](tests.md) names the test helpers and the main tests.

## Seams for other milestones

[Chat backend integration](integration/README.md) gives the seams for other
features. It covers the hooks, the trusted workspace calls, the workspace
events, the outer Worker, and the lifecycle. It also covers the files, the
GitHub state, the agent runner, and the logins and attachments. Its
[Outer Worker tests](integration/outer-worker-tests.md) guide gives the
tests through the production Worker entry.

## Key code

- `backend.ts`: `WorkspaceChat`, its gates, its trusted methods, the open
  tabs, and the one publisher of committed events.
- `dependencies.ts`: the default seams of `WorkspaceChat`, which a feature
  owner can replace. The login resolver always wraps an override.
- `workspace-integration.ts`: `createWorkspaceIntegration`, which joins
  chat, the lifecycle, and the Mac devices in the workspace object and sets
  the hooks.
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
- `http-routes.ts`, `messages.ts`, and `sessions.ts`: the routes, the turns,
  and the session state.
- `model-changes.ts`: client session IDs, the creation records that repeated
  requests match, and ID conflicts.
- `store.ts` and `history-storage.ts`: `ChatStore` and `ChatTransaction`,
  the records, the event numbers, the GitHub view of a transaction, and the
  chunks of large file reports.
- `runner-channel.ts`, `runner-receipt.ts`, and `runner-refusal.ts`: the
  runner connection, the stream cursors, the file commands, and the receipt
  or refusal marker of each runner event.
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
- `turn-lifecycle.ts`, `turn-events.ts`, `turn-context.ts`, and
  `continuation.ts`: active and waiting turns, the retry message of a turn
  end, safe turn context, late data, terminal events, and unanswered
  messages.
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
- `login-access.ts`: the combined sender and runner-token access check
  before login dispatch.
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
- [Architecture: Workspace Durable Object](../../docs/architecture.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
