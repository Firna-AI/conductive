# Chat backend integration

This README gives the seams of the chat backend for other features, and
its test fixtures. The [chat backend README](../README.md) names the code
and its guarantees.
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

## Milestone 8i: the outer Worker

- `createApp` in `worker/application.ts` forwards the Mac device routes to
  the Durable Object. Other machine routes still get a stub. See
  [Mac device commands](../../devices/README.md).
- Forward each chat route and the runner route to
  `env.WORKSPACES.get(env.WORKSPACES.idFromName(workspaceId))`.
- Use the decoded workspace ID as the name.
- Forward the original request, with its URL, its headers, and its unread
  body. The Durable Object runs the gate again.
- Do not run `gate` on a request that you forward. `gate` reads the JSON
  body of each write.
- A chat route has the workspace ID in its path. The runner request has
  only its bearer token. Find its workspace with `tokenWorkspace`.

## Milestone 5: workspace lifecycle

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

[Agents](../../../docs/protocol/chat-and-events.md#agents),
[Messages](../../../docs/protocol/chat-and-events.md#messages), and
[Agent logins in a sandbox](../../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
state the rules.

- Each creation path stores its authenticated user as `Session.startedBy`:
  the sessions route, a model of the other agent, and a linked session.
- The first message of a new workspace must create its session with
  `FirstWorkspaceMessage.sender` as the starter, never the workspace owner.
  The outer Worker does not wire that hook yet.
- `SessionLogins` in `session-login.ts` holds every login lookup of the chat
  backend. It has a metadata path and a credential path.
- The metadata path reads only the org membership of each starter and the
  kind of the stored login. It reads no ciphertext and decrypts nothing.
  `readLoginAvailability` in `login-availability.ts` makes one D1 query for
  all requested sessions, with a JSON input. `agentLoginKind` in `login-kind.ts`
  gives this path and `readAgentLogin` one rule for a valid login kind.
- `SessionLogins.refresh` runs the metadata path for the starters of all open
  sessions when a new tab subscribes. An archived workspace skips it.
- `SessionLogins.metadata` runs the metadata path for one session before
  the other routes of that session make their own change: rename,
  interrupt, model, close, and reopen. It skips a closed session.
- The credential path reads and decrypts the login through `readLogin`, with
  its access checks. `SessionLogins.observe` runs it for Send and for a Retry
  that the session record allows. It also runs it for each `turn` or
  `message` command before it goes to the runner.
- When a path finds a changed `loginAvailable` of an existing session, it
  commits the new value and a `session.updated` event in its own change. An
  unchanged result writes nothing.
- `ChatOperation` in `operation.ts` gives each caller its reads and changes
  in the serial queue that the caller holds. Each change commits on its
  own.
- The session list and a history read check no login and flush no runner. A
  write route, a runner connection, and a runner event still flush it.
- A login that the credential path reads never enters the history or the
  storage.
- An observed change stays when the action after it fails or is refused.
  For example, the workspace refuses Send after it observes the starter's
  missing login. Each tab still gets `loginAvailable: false`.
- A message, its commands, its attachment references, and a linked session
  commit together in one change, or not at all.
- A new session gets its first `loginAvailable` from `SessionLogins.initial`
  in the change that creates its record, because no earlier record exists.
- A repeated message ID returns its stored target with no new check. A
  `model` or `interrupt` command carries no login, so its dispatch reads no
  login. No timer watches logins.
- `send` in `send-message.ts` observes the starter's login before it accepts
  a message. When that login cannot be used, `SessionLogins.forMember`
  checks the own login of the member. Another member with a login gets a new
  linked session with `sourceSessionId`. Only the new message goes there.
- While the starter's login cannot be used, the starter's own message gets
  `409 agent_login_required`. So does the message of another member who
  has no login either. No session is created.
- The `chat:v1:message-source:` record keeps the requested session of each
  linked message. A repeat through either session returns the same message
  and session record.
- The same transaction sets `retryMessageId` of the source to null.
- A message that was accepted earlier never moves to another session.
- `normalizeSession` in `session-storage.ts` reads an older record without
  these fields as `null`, `null`, and `false`. Stored `session.updated`
  events get the same values. No history is removed.

## Test fixtures

The [chat backend README](../README.md#tests) gives the test commands. These
test support files and tests check the chat backend.

- `createChatFixture` in `harness.test-support.ts` builds on
  `createHarness`. It adds an owner, a member, a workspace with a token,
  and a stored login for each agent.
- Its helpers send messages, open tabs, connect a `FakeRunner`, and
  restart `WorkspaceChat` on the same storage.
- `MemoryChatStorage` keeps the records in memory. Set `failCommit` or
  `beforeCommit` to test a failed or a late commit.
- Its key order and `startAfter` comparison use UTF-8 bytes, like real storage.
- Set `crashAfterCommit` to commit the next transaction, then throw once.
  The restart tests cover retry permission, report repairs, turn cleanup,
  and file assembly after a commit crash.
- Send and Retry can commit a changed login observation before acceptance.
  So an acceptance crash test first makes the stored `loginAvailable` current,
  then sets `crashAfterCommit`. The fault then hits the acceptance commit.
- `createRunnerLimitsFixture` in `runner-limits.test-support.ts` runs one
  `RunnerChannel` for the refusal, cap, and file part tests.
- `runner-repairs.test-support.ts` builds a full and an oversized report of
  each kind, and reads the requests and markers of the repair tests.
- `late-events.test.ts` and `never-started.test.ts` cover replay after a
  workspace stop and the queued-turn eligibility rules.
- `retry.test.ts`, `retry-queue.test.ts`, and `retry-crash.test.ts` cover
  the newest failed turn: stale tabs, refused ends, waiting work, rollback,
  and commit crashes. `retry.test-support.ts` sends retries and reads the
  session records.
- `session-logins.test.ts`, `linked-sessions.test.ts`, `linked-retry.test.ts`,
  and `legacy-sessions.test.ts` test starters, linked sessions, and old data.
  `login-observation.test.ts` tests that an observed change stays after a
  refused Send, and that a repeated message ID observes nothing.
  `linked-retry.test.ts` also restarts after a crash at the acceptance of a
  linked Retry. It checks each stored record, and a stale Retry gets 409.
- `login-availability.test.ts` tests the metadata path. One query serves one
  or four sessions and reads no credential. Reads check no login and flush
  no runner. The list and a new tab still work with a damaged starter
  ciphertext. Closed sessions and archived workspaces stay unchanged.
  `login-queries.test-support.ts` records its D1 login queries.
- `device-cleanup.test.ts` checks Mac command cleanup after a refused turn
  end. It also checks that late ends preserve the next turn and its commands.
- `adapter.test.ts` runs `Workspace` in Miniflare, with SQLite storage,
  D1, and real WebSockets. `createAdapterRuntime` sets up that runtime.
- It closes every socket before Miniflare evicts the real object. Restart
  keeps SQLite history, queued messages, and the runner cursor. Event numbers
  continue. The resumed queued turn fails. Its message can retry after a
  second eviction.
- `createAdapterRuntime` can bundle another Durable Object entry for
  another workspace ID. The [GitHub store tests](../../github/README.md#verification)
  use it to run `WorkspaceChat` with the GitHub state on SQLite.
