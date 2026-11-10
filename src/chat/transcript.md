# Transcript rules

This guide belongs to [the chat](README.md). It gives the rules of the
stream cursor, the session logs, the transcript items and their counts,
the lost lines, the turns, the work fold of each ended turn, and Try again.

- The stream cursor spans the whole workspace: every session, file, and
  workspace event. It drops a resent event, holds an event after a gap until
  the gap fills, and ignores the events of another workspace.
- Each session keeps its own event log. A session that opens later loads its
  full stored history, whose numbers can be older than the stream's cursor,
  so a history never goes through the stream's duplicate check.
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
  `SessionLog.offer` in [`state/session-log.ts`](state/session-log.ts) folds it at its place in the event order.
- `retryItemId` picks one failed item. A turn that continues the unanswered messages of a finished turn takes their IDs.
  So a late failure of the older turn can name the same message. Then only the item of the newer known turn offers Try again.
- The Worker refuses an old Try again, such as from a second tab that missed newer events, with `409 retry_not_available`.
  The chat then shows the notice "The turn didn't restart" with the Worker's plain message.
- Each `workspace.continued` event of a session becomes one `continued` item at its place among the events.
  The line names the member who pressed Continue, "You" to that member, the new branch, and its base, with `ContinuedLine` of the mockups.
  The item takes its ID from the new branch, so a repeat of the note replaces it. It belongs to no turn, so it never folds into work.
  A closed session gets the note in its stored history, so a session that opens later shows it.
- Ordered history folding preserves these fields and lines across completion and failure events.
