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
  `publish` argument instead, as [the seams](#seams-for-other-milestones)
  say.
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
- `connectRunner` accepts only `/runner` on `MACHINE_ORIGIN`, with
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
  a runner event only when its number is the stream cursor plus one.
- A duplicate gets a new confirm and is not stored again. A gap gets a
  `resend` from the first missing number. The `welcome` gives the cursor.
- A message and its command commit together. The Durable Object sends the
  commands in order when the runner is ready.
- After the login checks, delivery commits the turn state before sending.
  If sending a newly dispatched turn throws, delivery restores its queued
  state. `message.sent` follows a successful send.
- The interrupt route stores and pushes `turn.stop-requested` with the
  authenticated member's ID before it interrupts the runner. Runner events
  cannot set that member.
- A message accepted while the active turn stops waits in another stored
  turn. Its commands go out only after that turn becomes active.
- After a finished turn, its unanswered messages run before later waiting
  work. Closing a session records its waiting turns as stopped in history.
- A command stays pending until the Durable Object removes it. A new runner
  connection gets each pending command again, with the same command ID.
- An agent event that lists a message ID removes the command of that
  message. The end of a turn removes each command of that turn.
- A new `model` command replaces the pending `model` command of its
  session.

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
- `adapter.test.ts` runs `Workspace` in Miniflare, with SQLite storage,
  D1, and real WebSockets. `createAdapterRuntime` sets up that runtime.
- It closes every socket before Miniflare evicts the real object. The
  restarted object keeps its SQLite history, queued message, and runner
  cursor. The test checks delivery and continued event numbers after restart.

## Seams for other milestones

`WorkspaceChat` takes `ChatDependencies` from `types.ts` as overrides.
`Workspace` sets `matchesObject` and `runnerEventStored`. The latter starts
device cleanup when a turn ends. A later handler must keep that call.
The other hooks keep their defaults until their owners set them.

Other features can add events to the same numbered history. The method
depends on where the code runs:

- Outside the runner hooks, await `appendWorkspaceEvent`.
- Inside `runnerReady` or `runnerEventStored`, await the `publish`
  argument, a `ChatCallbackPublisher`. It commits the event in the task of
  the hook, then pushes it to the open tabs.
- Do not call `appendWorkspaceEvent` inside a runner hook. The hook runs in
  the serial queue, so the call would wait for the hook itself.
- `sendFileCommand` also waits in the serial queue. Do not await it inside
  a runner hook.

### Milestone 8i: the outer Worker

- `createApp` in `worker/application.ts` forwards the Mac device routes to
  the Durable Object. Other machine routes still get a stub. See
  [Mac device commands](../devices/README.md).
- Forward each chat route and the runner route to
  `env.WORKSPACES.get(env.WORKSPACES.idFromName(workspaceId))`.
- Use the decoded workspace ID as the name.
- Forward the original request, with its URL, its headers, and its unread
  body. The Durable Object runs the gate again.
- Do not run `gate` on a request that you forward. `gate` reads the JSON
  body of each write.
- A chat route has the workspace ID in its path. The runner request has
  only its bearer token. Find its workspace with `tokenWorkspace`.

### Milestone 5: workspace lifecycle

- `Workspace.fetch` tries device routes, then gives the remaining requests
  to chat. Match lifecycle routes before the chat call.
- `authorizeBrowser` gives a lifecycle route the same gate and workspace
  check. It reads the body, so do not pass that request on to `fetch`.
- `runnerReady(workspaceId, publish)` runs after the Durable Object stores
  each `runner.ready` event.
- `runnerEventStored(envelope, publish)` runs after each other stored
  runner event. Examples are `start.updated` and `workspace.title`.
- Both hooks run after the commit and the confirm. A hook error closes the
  runner connection, and the runner does not send that event again.
- Add the start steps and `workspace.updated` with `appendWorkspaceEvent`.
  Inside a hook, use its `publish` argument.
- Call `closeRunner()` when the sandbox stops.
- Keep the lifecycle records outside the `chat:v1:` key prefix.

### Milestone 9: files

- `runnerEventStored` also gets `files.snapshot`, `files.changed`, and
  `changes.updated`. These events also stay in the workspace history.
- Send each `file.read` and `file.diff` request with `sendFileCommand`. A
  `false` result means that no runner got the request.
- `receiveFileResult(value)` gets each `file.read.result` and
  `file.diff.result` message without checks. Validate the message in the
  hook. File results never enter the history.

### Milestone 7r: the agent runner

- The Durable Object stores agent events as the runner sends them. It
  copies only the known fields, and it refuses an unknown event type.
- It requires and preserves tool-detail and turn-file omission counts.
  These counts are non-negative safe integers.
- It requires and preserves file-report part numbers, part counts, and changes revisions.
  These new fields are positive safe integers. A single-part report keeps whole-report behavior.
- `runner.event-refused` is workspace-only. The runner parser refuses it.
- Byte checks, stored refusal markers, refusal confirmation, and part joining
  remain work for Milestone 7s.
- So the runner maps the SDK events, removes the text that an SDK adds,
  and maps each result to `userMessageIds`.
- `turn.started` names the sender of the turn and its message IDs. Each
  agent event names the active turn of its session.
- The Durable Object closes the connection on an event that breaks these
  rules. It does not confirm that event.
- Deduplicate the commands by `commandId`. A new connection gets each
  pending command again.
- After a text-only turn, each unanswered message moves to a new turn. So
  one message can come first in a `message` command, then in a new `turn`
  command with a new command ID.
- Each `turn` and `message` command carries the login of its message's
  sender. When the sender of a turn changes, start the agent again.
- An interrupt for a turn that the runner does not run still gets
  `turn.completed` with state `stopped`.
- A new stream gets commands only after its `runner.ready` event. A stream
  that sent `runner.ready` before gets commands right after the `welcome`.

### Agent logins and attachments

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

## Key code

- `backend.ts`: `WorkspaceChat`, its gates, and the open tabs.
- `http-routes.ts`, `messages.ts`, and `sessions.ts`: the routes, the turns,
  and the session state.
- `model-changes.ts`: client session IDs, retry records, and ID conflicts.
- `store.ts`: `ChatStore` and `ChatTransaction`, the records and the event
  numbers.
- `runner-channel.ts`: the runner connection, the stream cursors, and the
  file commands.
- `runner-delivery.ts`: the sends of pending commands, with the login
  check.
- `delivery-state.ts`: dispatch state before sending and queued-state restoration.
- `runner-input.ts`, `agent-events.ts`, and `other-events.ts`: the checks
  of runner messages.
- `turn-lifecycle.ts`, `turn-events.ts`, and `continuation.ts`: active and
  waiting turns, terminal events, and unanswered messages.
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
- [Access and security: Agent logins in a sandbox](../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Access and security: The workspace token](../../docs/protocol/access-and-security.md#the-workspace-token)
- [Architecture: Workspace Durable Object](../../docs/architecture.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
