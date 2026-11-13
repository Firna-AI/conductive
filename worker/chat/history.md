# History and event order

This guide belongs to the [chat backend](README.md). It gives the serial
queue, the commits and the publisher, the event numbers, the runner
streams, and the order of the runner commands.

- `ChatStore.run` is one serial queue. Each request, each runner message,
  each command send, and each trusted read, change, or replay runs in it,
  one at a time.
- `ChatStore.run` gives each queue task a `QueueTurn` handle from
  [`queue-turn.ts`](queue-turn.ts). With `outside(call)` of the handle, a
  task runs one call outside the queue. In production code, only the start
  guard of a sandbox start calls `outside`, as
  [Creates and resumes](../lifecycle/workspace-object.md#creates-and-resumes)
  says.
- `outside` first gives the committed turn ends to the
  [`turnEnded`](integration/workspace-lifecycle.md#hooks-and-events) hook.
  Then the task gives the queue up and runs the call. When the call ends,
  the task joins the back of the queue. It gets the result or the error of
  the call only after it holds the queue again.
- `ChatStore.settled()` waits until no queue task remains.
  `ChatStore.idle()` waits only for the tasks that exist at the time of the
  call. Both also wait for a task that is in an `outside` call. The drains
  of the [member receiver](../members/README.md#lifecycle-ownership) wait
  for `idle()`.
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
- A new full tree or a new `skills.updated` event deletes the older stored
  event of its kind from the history. So the history keeps only the latest
  tree and the latest skill lists, and the event numbers can have gaps
  there.
- A tab connects with `after`, the last event number that it has. It gets
  the stored events after that number in one or more `history` pages, in
  the shape of `ChatHistoryResponse` in
  [`src/shared/events.ts`](../../src/shared/events.ts). Then it gets one
  `event` message for each new event.
- The history pages and the new subscription run in one queue task. So no
  event falls between them, and no event comes twice.
- The records use the `chat:v1:` key prefix of the Durable Object storage.
- Each runner stream numbers its events from 1. The Durable Object stores
  a runner event, or its refusal marker, only when its number is the stream
  cursor plus one.
- A duplicate gets a new confirm and is not stored again. A gap gets a
  `resend` from the first missing number. The `welcome` gives the cursor,
  or less while a [report repair](report-repairs.md) waits for its first send.
- The `turn_not_active` reason means that the turn never started.
- Valid late events append to a started turn that ended. They change no
  turn, session, or message state. A late `turn.completed` or
  `turn.failed` of a started turn that failed removes only the pending
  `interrupt` commands of that turn.
- A refused `turn.completed` or `turn.failed` ends its started active turn as `failed`.
- A message and its command commit together. The Durable Object sends the
  commands in order when the runner is ready.
- `TurnLifecycle.canDispatch` keeps each command behind its turn. A `turn`
  command needs a queued or running turn, and a `message` command needs a
  running turn. A `model` command waits while the active turn of its
  session is queued. An `interrupt` command needs a stopping turn.
- Only a `turn` command starts a turn, in `DeliveryState.begin`. So a
  follow-up message or model change never overtakes a held turn.
- `dispatchInOrder` in [`ordered-dispatch.ts`](ordered-dispatch.ts) checks
  the pending commands in stored order. Each check returns send, wait, or
  skip. `commandDispatchState` gives the result from the stored command,
  session, and turn. The login check,
  [the file copy](attachments.md#dispatch), and the `turnDispatching` hook
  can also make a command wait.
- `commandDispatchState` sends an `interrupt` of a started turn that has
  failed. Only a failed file copy saves such an interrupt. It is the only
  command that goes out after its turn has ended.
- A `turn` or `message` command that waits holds each later `turn` and
  `message` command of its turn. So a later message never overtakes an
  earlier message of its turn. It holds no `interrupt` or `model` command,
  and no command of another turn. A skipped command holds nothing.
- After the login checks, delivery commits the turn state before sending.
  If sending a newly dispatched turn throws, delivery restores its queued
  state. `message.sent` follows a successful send.
- Each `turn` and `message` command carries the current workspace branch
  and target branch in `branches`. Delivery reads them from D1 each time
  that it builds the command, also for a retry, a queued send, and a resend
  after a reconnect. No connection or pending command keeps an older pair.
- While a Continue of the workspace runs, `turnDispatching` holds each turn
  in the queue, and its commands wait. When Continue ends, the waiting
  commands go out with the new branches, as
  [Continue](../lifecycle/continue.md#the-reservation) says.
- A `workspace.continued` note names its session, so the history of that
  session holds it, also after the session closes and reopens.
- The internal `StoredTurn.started` marker keeps dispatch evidence after an end.
- Stop, a close that stops a turn, and a tool stop or close store and push
  `turn.stop-requested` before they interrupt the runner. The event names
  the authenticated member, or the calling workspace and session of a tool
  call. Runner events cannot set either. [Stop requests](README.md#stop-requests)
  gives the rule of the first request.
- A message accepted while the active turn stops waits in another stored
  turn. Its commands go out only after that turn becomes active.
- After a finished turn, its unanswered messages run before later waiting
  work. Closing a session records its waiting turns as stopped in history.
- A command stays pending until the Durable Object removes it. A new runner
  connection gets each pending command again, with the same command ID.
- A sent pending command records the ID of its connection in `deliveredTo`.
  A wake keeps that connection ID, so the command does not go out again.
  Older records without the field stay readable.
- An active agent event that lists a message ID removes that message's
  command. The first end of a turn removes each command of that turn. When
  a failed file copy ends a running turn, it then saves one `interrupt` for
  that turn, as [Chat attachments](attachments.md#dispatch) says.

- A new `model` command replaces the pending `model` command of its
  session.

## Session history pages

The browser history route checks the requested session before it reads
history. Every request reads the pages of that session backwards.
[`chatHistoryPath`](../../src/shared/events.ts) takes the org, workspace,
session, optional `beforeEventNumber`, and optional `throughEventNumber`.
It builds the `sessionId`, `before`, and `through` query fields.

The first reverse page includes the cutoff event. A later page takes
`before`, an exclusive upper bound. Each page takes the same `through`
cutoff. The response holds its events in ascending event order.
`NewestChatHistoryResponse` names the next cursor as
`nextBeforeEventNumber` while `hasMore` is true. It has no
`nextAfterEventNumber`.

`HistoryPages.readNewest` prepares the compaction index before it reads.
[`history-newest-pages.ts`](history-newest-pages.ts) lists stored events
with `reverse: true`. It counts skipped workspace and other-session events
against the scan limit. It projects session events through the fixed
cutoff before it counts their JSON bytes. Each page takes at least one
stored step, also when that event exceeds its byte budget. The cursor
names the last stored step, also when the page has no shown events.
A one-row lookahead checks for an earlier stored event before the response
sets `hasMore`. This check avoids an extra page when compaction removed
the oldest storage keys. It projects no event.

The route uses `BROWSER_PAGE_LIMITS`: 2,048 stored steps or 4 MiB of shown
events. `ChatTransaction.newestHistory` takes the session ID, an optional
`before` cursor, and an optional cutoff. It clamps that cutoff to the
workspace's current event number.

`ChatTransaction.history` and `HistoryPages.read` read forward after a
numeric cursor. Each page reads one storage list of 32 events. The events
socket, workspace summary, Continue, and transcript copy use that read.
The transcript copy also uses its session filter. The browser's scan and
byte limits apply only to the newest-first read.

[`readNewestStoredEvents`](../../src/chat/api/read-workspace.ts) reads the
reverse response. `ChatHistoryResponse` and `readStoredEvents` keep the
forward response. The forward reader refuses a partial reverse page
because that page has no forward cursor.
