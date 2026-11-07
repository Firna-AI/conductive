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
| `POST` messages | `sessionPaths.messages` | Accepts a message. During a running turn, the message joins that turn. When the starter's login cannot be used, a new linked session takes it, as [Session logins](integration/README.md#session-logins) says |
| `POST` retry | `retryMessagePath` | Sends the message that `Session.retryMessageId` names again, also to a new linked session. Each other message gets `409 retry_not_available`, as [Retries](#retries) says |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session that the requester starts |
| `POST` close, reopen | `sessionPaths.close`, `sessionPaths.reopen` | Moves a session to the session history, and back |
| `GET` history | `chatHistoryPath` | Reads the stored events of one session |
| `GET` events socket | `workspaceEventsPath` | Sends the stored history, then each new event |
| `GET` runner socket | `MACHINE_PATHS.runner` | Connects the agent runner on the machine hostname |

Trusted Worker code can also call six methods of `WorkspaceChat` that run no
gate. [Trusted workspace calls](integration/README.md#trusted-workspace-calls) gives their rules.

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

The Durable Object runs the gates itself.

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
- Every login lookup goes through `SessionLogins`. Its credential path uses
  `readLogin` in `login-access.ts`, the only caller of `resolveLogin`. It
  reads the agent login of a starter or of a linked-session member, for one
  agent. `resolveLogin` first checks the workspace, that user, the sender,
  and the runner token in one D1 read. An override replaces only the login
  read.
- Its metadata path reads only the membership and the stored login kind of
  each starter, in one D1 query. It reads no ciphertext.
- A revoked or replaced runner token closes that connection without a
  login, and the command stays queued. A sender who left the org gets no
  login either. [Session logins](integration/README.md#session-logins) says
  when the workspace checks the starter's login. The storage never holds a
  login.

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
one `RunnerReportKind`.

- `ReportRepairs` on `ChatTransaction.repairs` keeps one record for each kind
  under the `chat:v1:report-repair:` prefix.
- Refusal checks use one identity reader. It reads only the event type,
  session and turn IDs, and the revision and part number of a full file report.
  Each unreadable field is null. The checks use this identity, the envelope
  stream, and the stored records. Part count and payload contents do not
  identify an old tail.
- A record holds its command, its cause, its state, a `sent` flag, and a
  `replacementRevision`. The cause is the stream and the event number of the
  first refusal. For a file kind, it also holds the newest applied,
  incomplete, or refused full-report revision. The state is `pending` or
  `failed`.
- `refuseRunnerEvent` calls `refuseReportRepair` before `refuse(type)`
  discards the incomplete file report. So the check still reads the revision
  of that report.
- The first refusal of a kind saves a `pending` record with a new command ID.
  A later refusal of a replacement sets `failed`, and its marker gets
  `repairFailed`. A remaining part or a tree delta changes nothing.
- A stored new part 1 of a multipart report on the cause stream sets
  `replacementRevision`. So the later parts of a reused revision count as a
  replacement.
- The record, the marker, and the cursor commit in the receipt transaction.
- A complete tree, changes list, start steps, or name removes the record of
  its kind in the same transaction. A tree delta and a pending part do not.
- After the commit, `RepairDelivery.flush` sends each `pending` record that
  the connection did not get yet. The first send of a record then commits
  `sent`.
- Only then does `RunnerChannel` send the confirm and run the hooks. A send
  failure or a failed `sent` commit throws. The channel then closes the
  connection without the confirm.
- The `welcome` holds `confirmedThrough` below the cause of each `pending`
  record of its stream that no connection got. So the runner sends that
  event again, and the channel confirms it as a duplicate.
- After the `welcome`, the channel sends the repairs before the other
  commands. A repair needs no `runner.ready` and carries no login, so its
  send runs no login or token check.
- Turn, message, interrupt, model, and file commands still wait for
  `runner.ready`.
- Each new connection gets each `pending` record again, with the same
  command ID. A `failed` record is never sent again.

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

[Test fixtures](integration/README.md#test-fixtures) names the test
support files and what each group of tests covers.

## Seams for other milestones

[Chat backend integration](integration/README.md) gives the seams for other
features. It covers the hooks, the trusted workspace calls and the workspace
events, the outer Worker, the lifecycle, the files, the GitHub state, the
agent runner, the logins and attachments, and the test fixtures.

## Key code

- `backend.ts`: `WorkspaceChat`, its gates, its trusted methods, the open
  tabs, and the one publisher of committed events.
- `dependencies.ts`: the default seams of `WorkspaceChat`, which a feature
  owner can replace. The login resolver always wraps an override.
- `operation.ts`: `ChatOperation`, the reads and changes of one route, tab
  subscription, or dispatch, in the serial queue that its caller holds.
- `http-routes.ts`, `send-message.ts`, `messages.ts`, and `sessions.ts`: the
  routes, Send and Retry with linked sessions, the turns, and session state.
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
- `queries.ts`: the D1 reads of workspaces, tokens, members, and logins.
- `login-access.ts`, `login-availability.ts`, and `login-kind.ts`:
  `readLogin` and the access checks, the metadata query, and the valid
  login kinds.
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
- [GitHub banner backend](../github/README.md)
- [Access and security: Agent logins in a sandbox](../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Access and security: The workspace token](../../docs/protocol/access-and-security.md#the-workspace-token)
- [Architecture: Workspace Durable Object](../../docs/architecture.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
