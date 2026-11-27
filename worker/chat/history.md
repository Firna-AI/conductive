# History and event order

This guide belongs to the [chat backend](README.md). It gives the serial
queue, the commits and the publisher, the event numbers, the runner
streams, and the order of the runner commands.

- `ChatStore.run` is one serial queue. Each request, each runner message,
  each command send, and each trusted read, change, or replay runs in it,
  one at a time.
- `ChatStore.run` gives each queue task a `QueueTurn` handle from
  [`queue-turn.ts`](queue-turn.ts). With `outside(call)` of the handle, a
  task runs one call outside the queue. In production code, the start
  guard of a sandbox start calls `outside`, as
  [Creates and resumes](../lifecycle/workspace-object.md#creates-and-resumes)
  says. A session read calls it between batches of a
  [session index](#the-session-index) build. The workspace GET calls it
  while it waits for [read-state recovery](#the-workspace-read-state).
  The Files list reads also wait outside the queue through
  `ChatStore.readQueued`.
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
  event of its kind from the history. The history keeps every tree delta.
- The first changes list that compaction visits records the current stored
  workspace event number in `chat:v1:history-index:changes-cutover`.
  Preparation preserves changes lists through that number.
  `chat:v1:history-index:changes` points to the newest indexed changes list
  after that number. A new delta replaces the previous indexed delta.
  A newer list deletes the prior indexed list and delta with their chunks.
  These deletions can leave gaps in stored event numbers. An older Worker
  can leave extra changes lists during a rollback.
- A tab connects with `after`, the last event number that it has. It gets
  the stored events after that number in one or more `history` pages, in
  the shape of `ChatHistoryResponse` in
  [`src/shared/events.ts`](../../src/shared/events.ts). Then it gets one
  `event` message for each new event.
- The history pages and the new subscription run in one queue task. So no
  event falls between them, and no event comes twice.
- For a socket without the changes delta form, the replay reads the
  complete changes list at the delta revision. If the projection has no
  list at that revision, the replay leaves that event out.
- The object answers the socket upgrade once the tab is registered with a
  valid grant, before the first `history` page. A refusal before then is
  the HTTP reply. The pages follow the handshake. So the tab reads each
  page while the replay goes on, and no page waits in memory for the
  handshake.
- `REPLAY_BUDGET` in [`browser-subscription.ts`](browser-subscription.ts)
  limits the events of the pages of one connection to 8 MiB of UTF-8 JSON.
  The page reads spend it, so a page ends after the event that uses it up.
  So a connection sends at most one event past the budget, and at least
  one event. When more events remain, the object then removes the tab and
  closes the socket. The tab connects again after the
  `nextAfterEventNumber` of its last page, and the replay goes on with a
  new cutoff.
- A replay that fails after the handshake removes the tab and closes the
  socket once. The upgrade route then writes the `unexpected_error`
  warning for an error that is not an `HttpError`.
- The records use the `chat:v1:` key prefix of the Durable Object storage.
- An event record holds its full envelope unless it uses a file stub.
  A `files.snapshot`, `files.changed`, `changes.updated`, or
  `changes.changed` envelope above 4,096 UTF-8 JSON bytes uses a stub
  with `workspaceId`, `eventNumber`, `occurredAt`, and `fileEventChunks`.
  Each chunk holds up to 65,536
  UTF-16 code units of the event JSON. The chunk keys start with
  `chat:v1:history-chunk:<eventNumber>:` and end with a zero-based part number.
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
- A [repository change](../lifecycle/repository-change.md#the-reservation)
  holds each turn in the same way. After it ends, the turns wait until the
  runner names the folder of the new repository in a new hello, as
  [Key code](key-code.md) says for `runner-repository-move.ts`.
- A `workspace.continued` note and a `workspace.repository-changed` note
  name their session, so the history of that session holds them, also
  after the session closes and reopens. An app that does not know the
  `workspace.repository-changed` type skips it, because `readEnvelope`
  keeps the event number of an event that it cannot read.
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

`HistoryPages.readNewest` first prepares the session index and the
compaction index through the cutoff, as
[The session index](#the-session-index) says.
[`history-newest-pages.ts`](history-newest-pages.ts) lists up to four
session keys at a time with `reverse: true`. It reads the event bodies
of each list at the same time. Each page reads only the requested session.
It projects session events through the fixed cutoff before it counts their
JSON bytes. Each page takes at least one key, also when its event exceeds
the byte budget. The cursor is the event number of the last key, also when
the page has no shown events. A one-row lookahead checks for an earlier
key of the session before the response sets `hasMore`. This check avoids
an extra page after the oldest event of the session. It projects no event.

The route ends the page after 2,048 session keys or 4 MiB of shown events.
`ChatTransaction.newestHistory` takes the session ID, an optional
`before` cursor, and an optional cutoff. It clamps that cutoff to the
workspace's current event number.

`ChatTransaction.history` and `HistoryPages.read` read forward after a
numeric cursor. Each storage list reads at most four workspace records or
four keys of the [session index](#the-session-index). An indexed list loads
up to four event bodies at the same time. The events socket, workspace
summary, Continue, repository change, the first stop requester lookup,
and transcript copy use this read. The stop lookup and transcript copy
filter by session.

A forward page ends at the cutoff, after 2,048 stored steps, after 4 MiB
of shown events, or when it uses up the connection's remaining budget.
It includes the event that reaches a byte limit. The 4 MiB count starts
again on each page. The connection budget spends the same bytes across
pages. A shown chunked event counts its stored UTF-8 JSON text and its
envelope. When more records can remain, `nextAfterEventNumber` is the
last stored event or session key visited, even when the page shows no events.

[`readNewestStoredEvents`](../../src/chat/api/read-workspace.ts) reads the
reverse response. `ChatHistoryResponse` and `readStoredEvents` keep the
forward response. The forward reader refuses a partial reverse page
because that page has no forward cursor.

### The session index

The session index keeps one key for each stored event of a session.
[`history-session-keys.ts`](history-session-keys.ts) builds each key from
`chat:v1:history-session:`, the encoded session ID, and the event number.
The value of the key is that event number. `historySessionOf` gives the
session of an event. An event without a session, such as a file report,
gets no key.

`ChatTransaction.emit` writes the key of an event in the transaction of
that event. The frontier, `chat:v1:history-session-index:through`, is an
event number. Each stored session event through that number has its key.
An emit moves the frontier only when its event comes directly after the
frontier. A Worker without the index, as after a rollback, stores events
with no key and leaves the frontier. So the frontier stays before those
events, also after newer events with keys.

The browser history route and the transcript copy read through
`ChatStore.read`. Before such a session read, `prepareSessionHistory`
brings the session index and the compaction index up to the cutoff of the
read. Each batch reads at most four stored records. It commits their keys
and the new frontier in one storage transaction. When the compaction index
covers a file stub, the batch uses its event number without loading its
chunks. Between batches, the read gives the queue up with `outside` of its
queue task, so other queue tasks run. The read keeps the cutoff that it
had before the first batch. After a stop, the next session read continues
after the last committed batch.

A session read in a write transaction cannot give the queue up. The stop
request lookup of an older turn record is one. It uses the index only when
the index has reached its cutoff. Otherwise it reads the workspace history
with the session filter and the forward page limits. Reads without a
session, such as the events socket, the workspace summary, and Continue,
list the stored events of the workspace and build no session index.
Workspace compaction preparation also reads up to four records per list.

## The workspace read state

[`workspace-read-state.ts`](workspace-read-state.ts) keeps the latest port
and skills events, the latest workspace repository ID, and the first
failure of each open [report repair](report-repairs.md). It updates the
state in the transaction of an event or repair removal. The versioned
mark in `chat:v1:meta` records whether the state is complete. A write from
an older Worker drops the mark, even when it adds no event.

[`workspace-read-recovery.ts`](workspace-read-recovery.ts) shares one
recovery across waiting reads. The recovery fixes a cutoff and saves its
progress after each page in a separate chat queue task. Each page uses
one reverse list of at most four stored events. It skips file descriptors
by reading their metadata alone. The cause of each failed repair bounds
its notice scan. A later full report ends that scan for its kind.

A page commits the next position and the reports and failures found so
far. A read resumes there after an eviction. A write that drops the mark
starts a new recovery at the latest event number. The last task checks
the cutoff and repair records, then joins the recovered state with the
changes that committed after the cutoff. A full report or removal after
the cutoff takes precedence for its notice window. A repeated refusal
keeps the first failure of an open window. The GET then reads the detail,
seed, and event number in one chat queue task.
