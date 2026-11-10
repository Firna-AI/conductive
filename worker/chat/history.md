# History and event order

This guide belongs to the [chat backend](README.md). It gives the serial
queue, the commits and the publisher, the event numbers, the runner
streams, and the order of the runner commands.

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
  turn, session, message, or command state.
- A refused `turn.completed` or `turn.failed` ends its started active turn as `failed`.
- A message and its command commit together. The Durable Object sends the
  commands in order when the runner is ready.
- `TurnLifecycle.canDispatch` keeps each command behind its turn. A `turn`
  command needs a queued or running turn, and a `message` command needs a
  running turn. A `model` command waits while the active turn of its
  session is queued. An `interrupt` command needs a stopping turn.
- Only a `turn` command starts a turn, in `DeliveryState.begin`. So a
  follow-up message or model change never overtakes a held turn.
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
