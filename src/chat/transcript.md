# Transcript rules

This guide belongs to [the chat](README.md). It gives the rules of the
stream cursor, the session logs, the transcript items and their counts,
the end reason of a finished turn, the standard speed of a fast turn, the
lost lines, the turns, the open run
of tool calls of a running turn, the work fold of each ended turn, the
wake lines, and Try again. Its [key code](#key-code) names the shared
transcript modules and
the parts of the chat that draw the transcript.

- The stream cursor spans the whole workspace: every session, file, and
  workspace event. It drops a resent event, holds an event after a gap until
  the gap fills, and ignores the events of another workspace.
- Each session keeps its own event log. A session that opens later loads its
  full stored history, whose numbers can be older than the stream's cursor,
  so a history never goes through the stream's duplicate check.
- The transcript fold turns the events and records of a session into its
  transcript. It never changes a published transcript, one of its items, or
  its map of first times. That map gives the time of the first event of each
  item. So `sameData` never hides a change, and `transcriptLookups` can keep
  the indexes of each published transcript.
- The fold finds each turn, message, and item through an index, so its work
  grows about linearly with the length of the session. A new step of the
  fold uses an index, not a scan of the items. `batch-work.test.ts` counts
  this work.
- Browser readers preserve the required tool-detail and turn-file omission counts.
  These new counts are non-negative safe integers. Missing counts make an event unreadable.
- Tool transcript items keep `tool.omittedDetailBytes`.
  `Transcript.turnCompletions` keeps each completion event by turn ID, including stopped completions and `omittedFileCount`.
- A tool call shows the size of output that the runner left out, such as "1.2 MB left out".
  A folded run of calls shows the total of its calls' current counts, so a finished run still names it. The work fold of an ended turn shows the total of its calls too.
- A finished turn ends its file list with the files that the runner left out, such as "47 more files".
  A stopped line adds the count of its stopped completion: "You stopped the agent · 5 changed files not listed".
  The counts come from `turnCompletions`. A zero count shows nothing.
- A completion can say that the cloud computer could not read the changed files: `filesUnavailable` is true, with no files and no omitted count.
  The reader keeps only the value true, and it refuses nothing new. `turnCompletions` keeps the mark with the completion.
  A finished turn then ends with its duration and "Changed files unavailable" in place of its files.
  A stopped line ends with " · Changed files unavailable". The turn stays finished or stopped, with no failure and no Try again.
  A late end shows the mark in its file row, or on the stopped line when its turn has no file row. A row that lists files shows no mark.
- A completion can name its end reason in `endReason`. Its one value is `background_work_limit`, the end at the time limit of [background work](../../docs/protocol/agent-runner.md#background-work).
  The reader keeps only a known value and drops an unknown one, so it refuses nothing new. `turnCompletions` keeps the reason with the completion.
  `turnEndReason` gives the reason to the chat and to the copied transcript, so both show its line for the same turns.
  A finished turn then shows the line, "Background work stopped at the time limit", above its duration and its files. A stopped line does not change.
- A completion of a fast turn can give its speed in `speed`: fast, or standard with a cause code, as [The speed of a turn](../../docs/protocol/fast-mode.md#the-speed-of-a-turn) says.
  The reader keeps a speed that `readTurnSpeed` reads and drops any other value, so it refuses nothing new. `turnCompletions` keeps the speed with the completion.
  `standardSpeedOf` gives the standard speed of a turn, with the cause that the line can name: `fast_limit` or `older_runner`. Another cause, or none, gives "Standard speed" alone.
  A finished turn then shows the note, such as "Standard speed · Fast limit reached", beside its duration, with its files under it. A stopped line ends with the same words, before the notes of its files.
  A fast turn at fast speed and a turn without fast mode show nothing new. A late end shows the note in its file row, or on the stopped line when its turn has no file row.
  The copied transcript gives the same words after the duration of a finished turn, and in a stop line.
- Each refusal marker of a session becomes one `lost` item at its place among the events, which shows one line.
  The transcript keeps the marker only in that item. A repeat of the same marker replaces its item.
  The line names the lost data and the reason in plain words, and never the stream, number, or event type.
  No line says "this turn", because a line can follow a newer turn.
  Nullable turn context stays intact. Markers without a session stay outside per-session logs.
  The chat keeps no marker without a session, and shows nothing after such a loss.
  A notice beside the data shows only when the fresh full report that repairs it is lost too. The chat builds no such notice.
- `Transcript.turns` lists the turns that accepted events named, in the order of their first event, and whether each one ended.
  The last one is the newest turn. A turn ends with its completion or failure, with a refused end while it runs, or when a newer turn starts.
- Each item stays with its turn: before any request or item of a later turn, and before a message that no turn has taken yet.
- An agent item keeps `complete` once its `assistant.completed` event came, so Explain reads only finished text. `agentMessageId` gives the message ID that its key holds.
- While a turn runs, only the run that holds the newest tool call of the turn shows its calls, as
  [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn) says.
  It stays open between two calls, after a message or an insert that follows it, and while a message waits for the turn.
  Each earlier run of the turn is folded, also when one of its calls failed. A newer run folds it.
  When the turn ends, its work folds as the rules below say. Each other run shows its calls only while one of its calls is not done.
- An accepted event of a turn that has ended shows inside that turn, before the row where the turn ended.
  It brings back no Working row and no Stop, and it changes neither a running turn nor the newest turn.
  A running tool of an ended turn shows as stopped. The files of a late end show as a file row, and the stopped line keeps its member.
- A refusal marker starts no turn. A refused `turn.completed` or `turn.failed` ends its turn only while that turn runs.
  Its running calls show as stopped, its Stop request clears, and no time, files, or Try again appear.
  A marker of an ended turn, of a turn that never started, or without a turn ends nothing.
- The work of a turn folds when `Transcript.turns` shows that the turn ended, as `hasEnded` says: its end arrived, or a newer turn started.
  Then the work before the answer of each part becomes one work fold, as
  [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn) says. A running turn folds nothing.
- The items of an ended turn, as `turnOf` gives them, split into parts at each of its user items.
  The answer of a part is its last `agent` item, with the `agent` items directly before it. An insert between two of them ends the answer.
  The answer and each later item of the part stay in view, such as the calls that a stop cut off. The row where the turn ended stays in view too.
- A part without an `agent` item has no work fold. Its runs of tool calls group as while the turn runs.
- Before the answer, the work of a part is its `agent` and `tool` items and each `lost` item whose marker names the turn.
  A `lost` item of another turn, or of no turn, stays in view and ends a run of work.
  A run folds only when it holds a `tool` or an `agent` item.
- An insert, such as a Mac command card, that follows a folded item joins that work fold at its place. An insert never starts a work fold.
- Try again shows only on the failed item that names the retry message of the newest session record, as
  [Messages](../../docs/protocol/messages-and-attachments.md#messages) says. The order of the transcript items gives no permission.
  A read-only chat offers no Try again.
- Each session log takes the `session.updated` records of its session with its other events.
  It keeps the `retryMessageId` of the record with the highest event number as `Transcript.retryMessageId`.
  So a record that arrives late, such as in a history load, never brings back an older Try again or hides a newer one.
- A record from a read or a reply counts at the event number of its state, as the [record order rule](loads-and-sends.md#record-order) says.
  `SessionLog.offer` in [`session-log.ts`](../shared/transcript/session-log.ts) folds it at its place in the event order.
- `retryItemId` picks one failed item. A turn that continues the unanswered messages of a finished turn takes their IDs.
  So a late failure of the older turn can name the same message. Then only the item of the newer known turn offers Try again.
- The Worker refuses an old Try again, such as from a second tab that missed newer events, with `409 retry_not_available`.
  The chat then shows the notice "The turn didn't restart" with the Worker's plain message.
- Each `workspace.continued` event of a session becomes one `continued` item at its place among the events.
  The line names the member who pressed Continue, "You" to that member, the new branch, and its base, with the shared `ContinuedLine`.
  Each branch shows by its label, which hides each secret value. A note without labels, such as a note of an older Worker, shows the real names.
  The item takes its ID from the real new branch, so a repeat of the note replaces it. It belongs to no turn, so it never folds into work.
  A closed session gets the note in its stored history, so a session that opens later shows it.
- Each `workspace.repository-changed` event of a session becomes one `repository-changed` item in the same way.
  The line names the member who changed the repository, "You" to that member, the new repository, and the new branch, with the shared `RepositoryChangedLine`.
  The new branch shows by its label, also in a copy. A note without a label, such as a note of an older Worker, shows the real name.
  The item takes its ID from the new repository and the real new branch. A copy of the session gives the note with no heading.
- Each `capabilities.changed` event of a session becomes one `capabilities-changed` item in the same way, as [Capabilities: what agents learn](../../docs/protocol/capabilities-agents.md#in-the-chat) says.
  The line names the member who changed the capabilities, "You" to that member, and each change of the write, with the shared `CapabilityChangeLine`.
  The item takes its ID from the note, so a repeat of the note replaces it. It shows at its place also inside a running turn, and it never folds into work.
  The reader makes a note with a change of an unknown kind unreadable, so the chat skips the whole note and its cursor still moves.
- Each `session.watch-notice` event of a session becomes one `wake` item at its place among the events.
  It is the line that wakes the session when a turn that it watched ends, as [The wake line](../../docs/protocol/session-watches.md#the-wake-line) says.
  The shared `WakeLine` draws it with the words of `wakeCopy.ts` and the chip that `SessionLinkText` gives the watched session.
  The item takes its ID from the watch, so a repeat of the notice replaces it.
  The notice reader keeps only a known end reason, and an unknown one reads as none, so the line still shows. A notice with an unknown end is unreadable.
- A `wake` item belongs to the turn that takes its hidden message, as a message does: the turn that the message starts, the turn that it joins, or a continuation that takes it.
  The turn that the notice names gives no place, because a continuation can take the message.
  While no turn has taken the message, the items of the turn that runs go before the line, as before a message that waits.
  The line starts a new part of its turn and never folds. An answer to its hidden message moves after the line, as after a message.
  A copy gives the same words, with the link of the notice in place of the chip, under the heading of the turn of the line and with no heading of a sender.
- Ordered history folding preserves these fields and lines across completion and failure events.

## Key code

- [`transcript.ts`](../shared/transcript/transcript.ts): the items and the
  other parts of a transcript. `foldEvent` folds one event as a batch of
  one.
- [`transcript-batch.ts`](../shared/transcript/transcript-batch.ts):
  `TranscriptBatch`, the private working copy of one fold. It applies each
  event and record of a batch. Its `finish` publishes the transcript and its
  map of first times.
- [`duration.ts`](../shared/transcript/duration.ts),
  [`tool-words.ts`](../shared/transcript/tool-words.ts), and
  [`turn-words.ts`](../shared/transcript/turn-words.ts): the pure format,
  tool words, fold counts, and turn lines that the browser and Worker share.
  `turnEndReason` gives the end reason of a turn from `turnCompletions`, and
  `standardSpeedOf` and `standardSpeedLine` give the standard speed of a
  fast turn.
- [`session-events.ts`](../shared/transcript/session-events.ts): the session
  events from stored Worker envelopes or parsed browser envelopes.
- [`session-log.ts`](../shared/transcript/session-log.ts): the event log of each session, with its records
  in event order and its newest record. The record owner keeps the logs private.
  While the entries arrive in order, each `merge` or `offer` folds its new
  entries as one `TranscriptBatch`. An entry before the end of the log makes
  the next read of `transcript` or `times` fold the whole log again, as one
  batch.
- [`fold-items.ts`](../shared/transcript/fold-items.ts),
  [`fold-turns.ts`](../shared/transcript/fold-turns.ts), and
  [`item-order.ts`](../shared/transcript/item-order.ts): the indexes of a
  batch. `FoldItems` finds each item by its ID and by its turn, and
  `FoldItems.place` puts an item of a turn at its place, also a late one.
  `FoldTurns` gives the order of the turns and the turn of each message.
  `ItemOrder` keeps the order of the items.
- [`transcript-lookups.ts`](../shared/transcript/transcript-lookups.ts):
  `transcriptLookups`, the indexes of one published transcript: its turns
  and their order, the turn of each message, its items by ID, and the first
  message of each turn.
- [`known-turns.ts`](../shared/transcript/known-turns.ts): the known turns, their order, their ends, and
  `retryItemId`, the one failed item that offers Try again. `hasEnded` and
  `turnOf` read them through `transcriptLookups`. `turnOf` finds the turn of a
  message or a wake line through the message ID.
- [`item-placement.ts`](../shared/transcript/item-placement.ts): `TurnItem`,
  the kinds of item of one turn, and `isEnd`, which finds the row where a
  turn ended.
- [`late-events.ts`](../shared/transcript/late-events.ts): accepted events of a turn that has ended.
- [`item-keys.ts`](../shared/transcript/item-keys.ts): the item IDs that later events of an item reuse.
- [`refused-events.ts`](../shared/transcript/refused-events.ts): how a refusal marker becomes a line, and how a
  refused end ends its turn.
- [`turn-work.ts`](../shared/transcript/turn-work.ts) and
  [`transcript-entries.ts`](../shared/transcript/transcript-entries.ts):
  `foldedWork` finds the work of each ended turn that folds, as the rules
  above say. `groupEntries` makes the entries that the chat draws, and puts
  each insert at its place, also in a fold. It gives each run of tool calls
  its open state: while a turn runs, only the run with its newest call is
  open.
- `components/TranscriptView.tsx`: `TranscriptView`, the parts of the chat
  of a session in order, then its pending messages and its running turn.
  Its `TranscriptRows` draws the entries of `groupEntries` with the parts
  of `components/transcript-rows.tsx`, one part for each kind of row. Each
  part draws again only when its own data changes, as `sameData` of
  `components/same-data.ts` checks. So a new value of an input, such as
  `readers`, draws each row that uses it again. `components/same-data.ts`
  also holds `KeptParts` and `sameElement`. They keep each card of
  `sessionCommands` and `sessionSecrets` while its data stays the same.
  Its `samePlainData` compares the blocks and the text of an answer at
  each depth, as [Agent text](agent-text.md#drawing) says. `TranscriptRows`
  also names the agent message that the agent writes now, whose row gets
  `live`.
- `components/turn-facts.ts`: `endFacts` gives what the end of a finished
  turn shows from the rest of the transcript, such as its end reason.
  `stopFacts` gives the notes of a stopped turn and who stopped it.
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  the reconnect, and the `hold` and `release` of the workspace stream. It
  tells the chat when a replay of its stored history starts and ends, as
  [Record order](loads-and-sends.md#record-order) says.
