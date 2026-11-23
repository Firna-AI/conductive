# Loads, records, and sends

This guide belongs to [the chat](README.md). It gives the rules of the
history loads, the read-only chats, the order of the records, the sends,
Stop, the fixed prompts, and Add to chat.
[The message field](message-field.md) gives the rules of the
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
  the reads and the stream gets lost. The view also gives the automation of a run
  workspace, with the pull request of a pull request run. The snapshot keeps
  it as `automation` for the workspace header.
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
- The chat of a read-only workspace keeps one local close order. A local
  close puts its session first in that order. A local reopen takes the
  session out of the order, so a later close puts it first again. The
  session history lists the sessions of that order first, and then the
  other sessions by the stored end times that `endedAt` gives. Reopen
  closed session runs the first row of the history. So the history lists
  the session that closed last first, and Reopen closed session reopens
  it, as [Sessions](../../docs/protocol/agents-and-sessions.md#sessions)
  and
  [Where a command runs](../../docs/protocol/keyboard-shortcuts.md#where-a-command-runs)
  say.
- The local order changes no time that a row of the history shows. So
  the times of the rows can show out of order. The chat snapshot keeps the
  local order in `archiveClosed`, beside `archiveTabs`, in memory only. A
  reload or a [Restore](../../docs/protocol/workspace-life.md#restore)
  clears it. A workspace that accepts writes keeps the stored close order,
  with the closes of every member.
- A read-only chat shows no composer, no +, no Try again, no drag of a
  tab, and no answer to a Mac command. The tab menu of a session tab holds
  only its three copy items, and the tab menu of a file or diff tab holds
  only Copy path, as [the tab row](tab-row.md) says. A copy reads the
  transcript and sends no write. Its empty state names only the session
  history.

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
  edits of a rename, a model change, or a close.
- A close of a session tab shows at once, as a pending edit that sets
  `closedAt`. The tab moves to the session history and the next tab shows
  before the reply. The reply confirms the close and saves the view. A
  failed close puts the tab back at its place in the row. When the close
  moved the user off that tab and the user chose no other tab since, the
  tab shows again. The notice "The session didn't close" shows with the
  tab, or on the shown tab when the restored tab stays hidden.
  [`state/close-actions.ts`](state/close-actions.ts) holds these steps.
- A history load, and the stored history that the stream sends before its
  live events, each replay stored events in pages. While a replay runs,
  the chat holds the changes that its session records make to the open
  tabs, their order, and the shown tab. A page shows its messages and the
  newer fields of its session records, such as a title or a model, when it
  merges. When the connection of the stream drops during its replay, the
  hold lasts until the next final page, also an empty one.
- When the last running replay ends, after a success or a failure, the
  tabs follow the newest record of each session. The end compares the
  newest record of each session that the chat knows with the record that
  places its tab. It also compares that record with the open and the
  closed lists of the snapshot, `sessions` and `history`. It places each
  session that differs. So a change also shows when a failed load held
  it, or when its event comes again as a repeat.
- The first load counts as a running replay from before the history load
  of the shown session until its second session list read ends. This
  holds also when that read fails. So that list sets the tabs, also when
  the history load ends first. After a failed read, the newest records
  place the tabs when the last replay ends.
- Local tabs are the session tabs of a read-only chat after its first tab
  change in the browser only. `archiveTabs` holds them. While local tabs
  exist, a replay changes no tab, no order of the tabs, no shown session,
  and no view. It still puts each session in the open or the closed list,
  also a session that first shows in the replay. These lists need no hold
  then, because the local tabs hold the navigation. Each page updates them
  when it merges. So the session history also lists a session that first
  shows in a replay, and a Restore shows the stored open sessions as tabs.
- A close, a reopen, a choice of a tab, and a model change apply at once,
  also during a replay. A failed close during a replay puts its tab back,
  also when a page of the replay says that the session closed.
  [`state/session-replay.ts`](state/session-replay.ts) holds the steps of a
  replay.

## Sends and Stop

- A Stop request records the member who pressed Stop, and ends nothing. The
  turn ends when its end says stopped. A stop with no request names nobody:
  "The agent stopped".
- A stop through the workspace tools names the session whose agent asked
  for it, as
  [Stops by the workspace tools](../../docs/protocol/messages-and-attachments.md#stops-by-the-workspace-tools)
  says. The line shows "Stopped from" and the chip of that session, then
  the notes of the turn. `components/TranscriptItem.tsx` draws each stop
  line with the shared `StopLine`, and `SessionLinkText` of
  `links/LinkedText.tsx` draws the chip.
- That chip finds its session and opens its page as the chip of a session
  link in a message does, as [Workspace chips](text-links.md#workspace-chips)
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
  effort to the first. For a model that the model list marks as fast, the
  key of Fast mode turns fast mode on or off, as the Fast row of the menu
  does.
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
- A send clears the composer at once, with its file chips. The message
  shows below the transcript while its send waits, as `postMessage` of
  [`state/message-send.ts`](state/message-send.ts) says. The reply takes
  its place, and the stream's copy then takes the place of the reply. The
  Send button stays busy until the reply, so one send of a draft waits at a
  time. A fixed prompt shows at once in the same way.
- A send that the Worker refuses leaves the chat. Its text with its chips,
  its files, and its message ID go back to the draft, as `failSend` of
  [`state/drafts.ts`](state/drafts.ts) says. Text and files that the user
  added during the send stay after it, and the message then gets a new ID.
  The notice "Your message didn't send" shows the Worker's plain message.
- A send with no answer, or with a server error, can still reach the
  Worker, as `isRefusal` of [`state/context.ts`](state/context.ts) says.
  The notice of a failed send keeps the client ID of its message. When a
  transcript of any session shows that ID, the notice goes, and a draft
  that still holds that client ID empties, as `withLateSends` of
  [`state/late-sends.ts`](state/late-sends.ts) says. An edit of the draft
  clears its client ID, so a changed draft stays. A stream that shows the
  message before the error arrives gets the same result, as
  `showSendFailed` of [`state/message-send.ts`](state/message-send.ts)
  says. A fixed prompt follows the same rule for its notice.
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
- The controller sends one prompt at a time. From the call until the send
  of a prompt ends, another call of `sendPrompt` gets no request and
  changes nothing in the chat. The bar keeps the view for that call, as
  [Agent actions](../github/actions.md#agent-actions) says. The app keeps
  the controller while it shows another page, as
  [A chat that the app keeps](integration.md#a-chat-that-the-app-keeps)
  says. So a call after the member leaves the workspace and returns also
  gets no request while the send waits. A send from a composer still goes
  while a prompt sends.
- The prompt takes its client ID at the call, before its request goes out.
  The controller keeps that ID for the session and the text while the send
  waits. A sent prompt drops it, so the next send of the same prompt is a
  new message. A failed send keeps it. So a second try of the same prompt
  in the same session is the same message, and a lost reply makes no
  second message. The same prompt in another session is a new message.
- A reply that names a linked session shows the prompt there. No draft
  moves, and the tab moves only as for a draft that cannot move.
- A read-only workspace sends nothing.

## Add to chat

Add to chat of the menu of a row of the Files panel puts the chip of a
file or a folder into a message field, as
[Add to chat](../../docs/protocol/file-mentions.md#add-to-chat) says.
`addToChat` of the controller, in
[`state/mention-actions.ts`](state/mention-actions.ts), takes the path
of the entry and whether it is a folder:

- The chip goes to the session of the chat, as for a fixed prompt: the
  session that the member saw last, also while a file, a diff, or another
  tab of a phone shows. The chat shows that session, so a file or diff tab
  of the centre gives way to the chat, as for a click on a session tab.
- Without an open session, a new session starts, as "+" starts one.
  `newSession` gives the ID of the new session just before the chat shows
  it, so the chip goes into its field.
- The controller keeps the request for the chip in `mentionRequest` of
  the snapshot, with the session. A newer request takes its place. The
  composer of that session takes the request once, when it shows, and puts
  the chip into its field with `FieldHandle.insertMention`. Then it ends
  the request with `takeMention`. A field that mounts again has no caret,
  so the chip goes to the end of the text.
- The request changes no draft. The field puts the chip in as an edit, so
  the draft gets the mention from `onChangeText`, and the chip is one step
  of undo. A draft write from the owner would replace the content and
  clear the undo history, as [The message field](message-field.md) says.
- The request holds no focus. On desktop, the shell also makes a focus
  request of the app. While that request still stands, the field takes the
  focus with the chip, and the caret stands after it, as
  `useRequestedMention` of `components/composer-requests.ts` says. A phone
  makes no focus request, so the field takes no focus, and no keyboard
  opens.
- Before the chat loads, and in a read-only workspace, nothing happens.
