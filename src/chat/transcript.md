# Transcript rules

This guide belongs to [the chat](README.md). It gives the rules of the
stream cursor, the session logs, the transcript items and their counts,
the lost lines, the turns, and Try again.

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
  A folded run of calls shows the total of its calls' current counts, so a finished run still names it.
- A finished turn ends its file list with the files that the runner left out, such as "47 more files".
  A stopped line adds the count of its stopped completion: "You stopped the agent · 5 changed files not listed".
  The counts come from `turnCompletions`. A zero count shows nothing.
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
- Try again shows only on the failed item that names the retry message of the newest session record, as
  [Messages](../../docs/protocol/chat-and-events.md#messages) says. The order of the transcript items gives no permission.
  A read-only chat offers no Try again.
- Each session log takes the `session.updated` records of its session with its other events.
  It keeps the `retryMessageId` of the record with the highest event number as `Transcript.retryMessageId`.
  So a record that arrives late, such as in a history load, never brings back an older Try again or hides a newer one.
- `SessionLog.takeListed` takes the record of the session list that the chat reads after the history.
  That record counts at the event number that the stream starts after.
  When the log already holds a newer record, the listed record changes nothing. A later `session.updated` event replaces it.
- `retryItemId` picks one failed item. A turn that continues the unanswered messages of a finished turn takes their IDs.
  So a late failure of the older turn can name the same message. Then only the item of the newer known turn offers Try again.
- The Worker refuses an old Try again, such as from a second tab that missed newer events, with `409 retry_not_available`.
  The chat then shows the notice "The turn didn't restart" with the Worker's plain message.
- Ordered history folding preserves these fields and lines across completion and failure events.
