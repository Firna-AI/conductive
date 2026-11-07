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
| `POST` retry | `retryMessagePath` | Sends the message of a failed turn again |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session |
| `POST` close, reopen | `sessionPaths.close`, `sessionPaths.reopen` | Moves a session to the session history, and back |
| `GET` history | `chatHistoryPath` | Reads the stored events of one session |
| `GET` events socket | `workspaceEventsPath` | Sends the stored history, then each new event |
| `GET` runner socket | `MACHINE_PATHS.runner` | Connects the agent runner on the machine hostname |

Trusted Worker code can also call three methods of `WorkspaceChat`. They
run no gate.

- `appendWorkspaceEvent(workspaceId, event, occurredAt)` stores one
  `WorkspaceEvent` with the next workspace event number. Then it pushes
  the event to the open tabs. Inside a runner hook, use the hook's
  `publish` argument instead, as
  [the integration README](integration/README.md) says.
- `sendFileCommand(workspaceId, command)` sends one `file.read` or
  `file.diff` command to the ready runner. It resolves to `false` when no
  runner is ready or the send fails.
- `sendFileCommand` adds nothing to the history or to the pending
  commands. So a new runner connection does not get the command again.
- `closeRunner()` closes the current runner connection, for example when
  the sandbox stops.

A cross-agent model change uses the client's `newSessionId`. A retry uses
the same session. An unrelated occupied ID is refused. A same-agent change
ignores this field.

## Access

The Durable Object runs the gates itself.

- `authorizeBrowser` runs `gate` from `worker/security/gate.ts`, the gate
  of the other app routes. It checks the app hostname, the `Origin`
  header, the session cookie, the org membership, and the body of writes.
- `findChatWorkspace` then reads the workspace from D1. The workspace must
  belong to that org, and the org must not be deleted.
- Each open tab keeps its authenticated session and membership identity.
  Every 30 seconds, one D1 query rechecks all open tabs. A failed check
  closes the tab after sign-out, membership removal, or org deletion.
- The access timer stops when the last tab closes.
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
  and each command send runs in it, one at a time.
- `ChatStore.change` commits the new events, the runner cursor, and the
  changed records in one storage transaction. The tabs get the events
  only after the commit.
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

- `createChatFixture` in `harness.test-support.ts` builds on
  `createHarness`. It adds an owner, a member, a workspace with a token,
  and a stored login for each agent.
- Its helpers send messages, open tabs, connect a `FakeRunner`, and
  restart `WorkspaceChat` on the same storage.
- `MemoryChatStorage` keeps the records in memory. Set `failCommit` or
  `beforeCommit` to test a failed or a late commit.
- Its key order and `startAfter` comparison use UTF-8 bytes, like real storage.
- Set `crashAfterCommit` to commit the next transaction, then throw once.
  The restart tests use it to check repair requests, turn cleanup, and file
  assembly after a crash immediately after the receipt commit.
- `createRunnerLimitsFixture` in `runner-limits.test-support.ts` runs one
  `RunnerChannel` for the refusal, cap, and file part tests.
- `runner-repairs.test-support.ts` builds a full and an oversized report of
  each kind, and reads the requests and markers of the repair tests.
- `late-events.test.ts` and `never-started.test.ts` cover replay after a
  workspace stop and the queued-turn eligibility rules.
- `device-cleanup.test.ts` checks Mac command cleanup after a refused turn
  end. It also checks that late ends preserve the next turn and its commands.
- `adapter.test.ts` runs `Workspace` in Miniflare, with SQLite storage,
  D1, and real WebSockets. `createAdapterRuntime` sets up that runtime.
- It closes every socket before Miniflare evicts the real object. The
  restarted object keeps its SQLite history, queued message, and runner
  cursor. The test checks delivery and continued event numbers after restart.

## Seams for other milestones

[Chat backend integration](integration/README.md) gives the seams for other
features. It covers the hooks, the workspace events, the outer Worker, the
lifecycle, the files, the agent runner, and the logins and attachments.

## Key code

- `backend.ts`: `WorkspaceChat`, its gates, and the open tabs.
- `http-routes.ts`, `messages.ts`, and `sessions.ts`: the routes, the turns,
  and the session state.
- `model-changes.ts`: client session IDs, retry records, and ID conflicts.
- `store.ts` and `history-storage.ts`: `ChatStore` and `ChatTransaction`,
  the records, the event numbers, and the chunks of large file reports.
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
  `continuation.ts`: active and waiting turns, safe turn context, late data,
  terminal events, and unanswered messages.
- `sockets.ts`: the WebSocket upgrades of tabs and the runner.
- `browser-tabs.ts` and `browser-access.ts`: open tabs, the scheduled access
  check, and its batched D1 query.
- `queries.ts`: the D1 reads of workspaces, tokens, members, and logins.
- `login-access.ts`: the combined sender and runner-token access check
  before login dispatch.
- `types.ts`: `ChatDependencies`, `ChatCallbackPublisher`, `ChatStorage`,
  and the peer types.

## Related docs

- [Chat and events: Events](../../docs/protocol/chat-and-events.md#events)
- [Chat and events: Lost workspace updates](../../docs/protocol/chat-and-events.md#lost-workspace-updates)
- [Chat backend integration](integration/README.md)
- [Access and security: Agent logins in a sandbox](../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Access and security: The workspace token](../../docs/protocol/access-and-security.md#the-workspace-token)
- [Architecture: Workspace Durable Object](../../docs/architecture.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
