# Loads, records, and sends

This guide belongs to [the chat](README.md). It gives the rules of the
history loads, the read-only chats, the order of the records, the sends,
and Stop. [The message field](message-field.md) gives the rules of the
message field of each composer.
[Attached files of a draft](draft-files.md) gives the rules of the files
of a draft.

## History loads

- The chat loads the history of each session that becomes the shown session,
  whatever changed the selection: a click, an action, or a record from the
  stream. One load runs at a time for each session, and a failed load waits
  for Try again or for the next selection.
- The status of the stored history comes from its load alone. A chat with
  content, such as live messages, a sent message, a running turn, or the
  start steps, keeps it and shows a failed load as a notice by the composer,
  with Try again. An empty chat shows the failure in place of the chat.
- The chat loads the session list, the view, and the workspace first. It
  then shows its records, its start steps, and its composer while the
  newest history page of the shown session loads. That session shows
  "Loading the session" until its first page arrives. The newest page
  merges into the session log at once. Then the workspace and the session
  list load again. The stream starts after that page's
  `throughEventNumber`, while earlier pages still load. No change between
  the reads and the stream gets lost. The view also gives the routine of a run
  workspace, with the pull request of a pull request run. The snapshot keeps
  it as `routine` for the workspace header.
- The history API reads newest first. Each earlier request uses the
  preceding page's `nextBeforeEventNumber` as an exclusive `before`
  cursor. Every request keeps the first page's cutoff. A cursor
  that does not move back fails the history load.
- Earlier pages load one after another. The load holds their events and
  merges them once, after the oldest page or an earlier-page failure.
  The session log orders them with newer history and live events, and
  drops repeats. The chat shows "Loading earlier messages" above the
  messages until that merge. A failed earlier page keeps the messages and
  offers Try again beside the composer.
- Try again starts with the newest page. Each session shares one running
  load. Session actions wait for the complete history. Only the initial
  workspace load takes the newest page's cutoff before that load ends.
  A stopped controller ignores a late reply and requests no further page.
- The chat writes no browser storage. The drafts stay in memory, and the
  server keeps the open tabs through the view route. A kept controller
  lives only in the memory of its tab, so a reload or a new tab starts
  empty.

## Read-only chats

- A read-only workspace keeps its chat as it is, and the backend refuses
  its writes: an archived workspace, and one that the app shows read-only,
  such as in a suspended org. So its tabs change in the browser only. The
  session history opens the stored history of any session as a tab, and a
  tab closes with no write. A closed tab shows in the session history
  again, also the tab of a session that was open at the archive. The
  session records do not change, so a closed session stays closed. The
  controller's `select`, `requestClose`, and `reopen` take this path while
  the workspace is read-only, and the server path otherwise. The controller
  reads `readOnly` at each action, because a suspension can start during a
  visit, and it sends no other write then.
- A read-only chat shows no composer, no +, no Try again, no drag of a
  tab, and no answer to a Mac command. The tab menu of a session tab holds
  only the two copy items, and a file or diff tab opens no tab menu, as
  [the tab row](tab-row.md) says. A copy reads the transcript and sends no
  write. Its empty state names only the session history.

When the chat becomes read-only, it hides an open rename or close question.
The session history stays open. The tab keeps its old name, and the sandbox bar says why.
`ChatBody` applies this rule for both hosts.

## Record order

- Each reply, read, and event with a session record, or with the workspace
  record and its start steps, carries the event number of its state. The
  newest number wins, whatever arrives first. So a Resume reply never
  hides a newer state from the stream, such as a failed start with its Try
  again. The steps after an action, such as a view save, the focus, or a
  free Resume button, still run when its reply is older. The header of
  [`state/session-records.ts`](state/session-records.ts) gives the pending
  edits of a rename or a model change.

## Sends and Stop

- A Stop request records the member who pressed Stop, and ends nothing. The
  turn ends when its end says stopped. A stop with no request names nobody:
  "The agent stopped".
- A stop through the workspace tools names the session whose agent asked
  for it, as
  [Stops by the workspace tools](../../docs/protocol/messages-and-attachments.md#stops-by-the-workspace-tools)
  says. The line shows "Stopped from" and the chip of that session, then
  the notes of the turn. `components/TranscriptItem.tsx` draws each stop
  line with the mockups' `StopLine`, and `SessionLinkText` of
  `links/LinkedText.tsx` draws the chip.
- That chip finds its session and opens its page as the chip of a session
  link in a message does, as [Workspace chips](agent-text.md#workspace-chips)
  says. This holds also for a session of another workspace, and for a
  closed or unknown session. A workspace that the list of the org does not
  hold leaves the session link as text, with the origin of the link of the
  chat's workspace.
- The composer reads Enter through `useSendKey` of
  `components/send-key.ts`, the one send key of every composer: the chat,
  and the page and the dialog of New workspace. On a computer, Enter sends
  and Shift+Enter adds a line, as
  [The send key](../../docs/protocol/create-a-workspace.md#the-send-key)
  says. In the phone layout, Enter adds a line. The message field asks the
  send key through `onEnter` before it adds a line, so Enter never adds a
  line to a message that it sends.
- While the composer shows, the keys of the app run its controls: Focus
  the message field, Attach files as the paperclip does, and Stop the
  agent as Stop does while a turn runs and does not stop yet. The key of
  Model picker opens the menu of the model picker. The key of Next effort
  level chooses the next effort of the menu, with a wrap from the last
  effort to the first.
- Send works while the sandbox is not ready: during the first start of a
  new workspace, after it failed, and during a resume. The workspace queues
  each message for the sandbox, as
  [Messages](../../docs/protocol/messages-and-attachments.md#messages) says.
- A failed first start shows the error state and a failed step of the
  create start, as `failedFirstStart` in
  [`../app/first-start.ts`](../app/first-start.ts) says. Its bar sits above
  the composer. A later error after a successful create,
  and a failed resume, keep the bar in place of the composer.
- The bar shows the message that the workspace saved for a failed start.
  The chat takes it from each read and Resume reply, and from each
  `workspace.updated` event. An event without an error keeps it, and null
  clears it.
- A send that the Worker refuses keeps its text, its files, and its message
  ID. The notice "Your message didn't send" shows the Worker's plain
  message.
- Send takes the files whose marks the draft text holds. It writes the
  returned copy path of each file at its mark, as
  [The send](draft-files.md#the-send) says.

## Fixed prompts

The actions of the pull request bar send fixed prompts, as
[Messages from the bar](../../docs/protocol/messages-and-attachments.md#messages-from-the-bar)
says. `sendPrompt` of the controller, in
[`state/prompt-actions.ts`](state/prompt-actions.ts), sends one:

- It goes to the session of the chat: the session that the member saw
  last, also while a file, a diff, or another tab of a phone shows.
- It shares `postMessage` of [`state/message-send.ts`](state/message-send.ts)
  with Send, so it follows each rule of a send: the model and the effort
  of the session, its login, and a linked session that the reply names. A
  send during a turn joins that turn.
- It reads and changes no draft. The draft keeps its text, its files, its
  identity, its uploads, and the client ID of a failed send.
- A session whose login is missing gets no request, and the outcome is
  `blocked`. A failed send shows the notice "Your message didn't send", as
  a send from the composer does. Without an open session, nothing sends.
- A second try of the same prompt in the same session keeps the client ID
  of the prompt that did not send, so a lost reply makes no second message.
  The same prompt in another session is a new message.
- A reply that names a linked session shows the prompt there. No draft
  moves, and the tab moves only as for a draft that cannot move.
- A read-only workspace sends nothing.
