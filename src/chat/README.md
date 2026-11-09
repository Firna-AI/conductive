# Chat

The chat of a workspace: the session tabs with the session history, and the
chat of the open session with its composer. It shows messages, folded runs
of tool calls, the folded work of each ended turn above its answer, the
running turn, steer, Stop, failures with Try again, the start steps of the
sandbox, the Mac commands of each turn, and the bar that takes the
composer's place while the sandbox does not run. After a failed first start
of a new workspace, that bar sits above the composer, which stays. The workspace screen
of the app shell mounts it by default, as
[the workspace screen](../shell/workspace/README.md#the-chat-of-the-workspace)
says. It builds against the fake API and the recorded chat events of
`src/test-support/`.

## Use it in the app

The tab keeps one `ChatController` for each workspace that it showed. The
workspace screen draws it with `WorkspaceChatView`, as
[A chat that the app keeps](#a-chat-that-the-app-keeps) says. A part that
needs a chat of its own mounts `WorkspaceChat`, which makes, starts, and
stops its own controller:

```tsx
<WorkspaceChat
  orgId={orgId}
  workspaceId={workspaceId}
  client={services.api}
  subscribe={openWorkspaceEvents}
  viewport={phone ? 'mobile' : 'desktop'}
  onWorkspaceChange={(workspace) => showInHeader(workspace)}
  onViewChange={(view) => keepTabs(view)}
  onOpenDiff={(path) => openDiffTab(path)}
  onOpenPage={(to) => navigate(to)}
  onConnectAgent={(agent) => openAccount(agent)}
/>
```

- `client` and `subscribe` must be stable. A new one starts a new chat.
  `client` is an `ApiClient`: `AppServices.api` in the app, or one from
  `createApiClient` over a fake.
- Each call of the chat goes through that client. A failure shows the
  message of its `ApiError`, such as the message of the Worker. A reply that
  a reader of the chat refuses shows "The request failed. Try again."
- `subscribe(target, afterEventNumber, listener)` opens the stream of
  `workspaceEventsPath` after the event number. In the app, it opens
  `AppServices.events`. It gives each message to `listener.message`, the
  stored history first, and calls `listener.closed()` when the connection
  drops. The chat checks each message as `unknown`.
- The chat reads the signed-in user from the account route and the members
  of the org from the members route, or it takes both from its `sources`,
  as [A chat that the app keeps](#a-chat-that-the-app-keeps) says. A
  stopped turn then says "You stopped the agent" to the member who pressed
  Stop, and names that member to the others. When the members do not load,
  it names nobody but the reader.
- `onWorkspaceChange` gets the workspace record after each change: its state,
  and the title that the backend gives it through `workspace.title` and
  `workspace.updated` events. The header and the list of the app show it.
- A new workspace and each new session have no name: the `name` of the
  workspace record and the `title` of the session record are null. The
  tabs, the session history, the line of a linked session, and the header
  and the list of the app then show "Untitled", from `nameLabel` in
  `src/shared/name-label.ts`, as
  [Workspace and session names](../../docs/protocol/chat-and-events.md#workspace-and-session-names)
  says. "New session" names only the action of +: its label, the heading
  of the empty chat, and the detail in the model picker.
- Each tab shows the `title` of its session record. The backend provides
  the titles that the mockups show. The title from the first message names
  the workspace and its first session, as
  [Messages](../../docs/protocol/chat-and-events.md#messages) says. Each
  other session takes the first line of its first message with text as its
  title, as [Sessions](../../docs/protocol/chat-and-events.md#sessions)
  says. A name that a member set never changes. The development page does
  the same.
- The rename field of a session with no title starts empty, with
  "Untitled" as its hint, so the label never becomes the name of the
  session. An empty field keeps the old name.
- `renderTab(tab)` renders a file or diff tab of the saved view, such as an
  open file. Its `title` is the name of the tab, as a screen reader reads
  it from the tab, with each secret value hidden, such as "app.ts changes"
  for a diff. The tab menu and the status of the row name the tab by it,
  and the chat takes no name from a path. Its `draw(draw)` draws the tab
  by the same name. For `draw.kind` `row`, it draws the tab at its place
  in the row: it spreads `draw.item` on the `<li>` of the tab and
  `draw.close` on the wrapper of its Close button, and gives
  `draw.link.ref` to the link of the tab. These hold the handlers, the
  classes, and the refs of the drag, of the tab menu, and of the scroll of
  the row. The ref of the link gives the tab the focus back after a move
  from the tab menu. For `lifted`, it draws the copy that a drag lifts
  above the page: the icon and the whole title, with no link and no Close.
  Without `renderTab`, the row shows only the session tabs, as on a phone.
  `components/tab-row.ts` holds these types.
- `onOpenDiff` gets the real path of a changed file of a finished turn. The
  chip of the file shows the label of its path, `displayPath`, which hides
  each secret value, as [Labels of paths](../files/README.md#labels-of-paths)
  says.
- `onOpenPage` gets the page of a workspace chip in a sent message or an
  answer, such as `/orgs/acme/workspaces/<id>/files`, after a plain click.
  The app opens it in the same window. A click with a modifier key stays
  with the browser, as for each link of the app. Without `onOpenPage`, a
  chip is a plain link.
- `content` takes a page that the app shows in place of the chat of the
  open session, such as an open file. The session tabs and the overlays
  stay, and no session tab is the current one.
- The controller's `updateView(change)` changes the saved view with a
  change of the app, such as an open file tab or the list of the Files
  panel. It saves through the same writer as the session tabs, so a later
  write of the chat keeps the change. Until the load reads the view, it
  changes nothing, so the saved tabs stay. In a read-only workspace,
  archived or shown read-only by the app, it changes the view in the
  browser only, and sends no write.
- `host` takes the start steps and the sandbox bar that the app draws, as
  `ChatHost` in `components/SessionChat.tsx` says. The chat places them.
  `keepsComposer` keeps the composer under the bar, as after a failed first
  start. Without a host, the chat draws both from its own record of the
  workspace, with the message that the workspace saved for a failed start.
- `readOnly` says that the workspace takes no write, such as while its org
  is suspended. The app gives `WorkspaceContext.readOnly`. The chat then
  shows its history, as an archived workspace does, and the host's bar
  takes the place of the composer.
- Render the chat inside the Firna theme provider and the Graphite token CSS
  of `docs/mockups/src/theme.ts`, as `dev/main.tsx` does.
- The chat sets no CSS position. A dialog or a sheet covers the nearest
  positioned frame: the app frame. The lifted tab of a drag, and the tab
  menu on desktop, draw on `document.body` with a fixed position, because
  the row clips what it holds.
- The menus, the dialogs, and the sheets of the chat note themselves in
  the open layers of the app shell, from `../shell/ui/layers.ts`. So the
  key of the command palette closes an open menu, and does nothing while
  a dialog or a sheet is open. Outside the app, nothing notes them.
- The Mac app shows two more parts of Mac commands outside the chat:
  `ThisMacSection` and `AllowAllBar`. [The Mac commands](device/README.md)
  say how to mount them.
- `useChatController` gives the controller and its snapshot to an app that
  composes `SessionTabs` and `SessionChat` in its own layout. Such an app
  takes the tabs from `rowOf` with the sessions of `tabSessions` and the
  shown tab of `shownTab`, and the session history from `historySessions`
  with the times of `endedAt`, so an archived workspace navigates without a
  write.
- `useChatController` makes the controller through the shared
  `useWorkspaceStore` hook of [the web app](../app/README.md). The hook
  starts the controller after the render. It stops the controller at
  unmount. When a new controller replaces it, the hook stops the old
  controller before the new controller starts.

### A chat that the app keeps

`WorkspaceChatView` draws a `ChatController` that the app keeps, such as
across the pages of a tab. It takes the props of `WorkspaceChat` other than
the connection. The app makes the controller with a stable `client` and
`subscribe`, and calls `show` and `hide` itself:

- The first `show` loads the chat, as `start` does. A `show` after a failed
  load loads it again.
- A later `show` opens the stream again after its cursor. So the chat shows
  at once, and it reads no history, no session list, and no view again.
- `hide` closes the stream while the app shows another page. The chat keeps
  its sessions, drafts, transcripts, and cursor. Actions and loads that run
  still finish.
- A load that ends while the chat is hidden opens no stream until the next
  `show`.
- `stop` ends the controller, as at a sign-out. Late replies then change
  nothing.

The app can also give the controller `sources`, a `ChatSources` from
`state/sources.ts`. It gives the account, the org, the models, the
members, and the workspace list of the org from the models of the app.

- With sources, the load sends none of these four reads and writes none of
  these values. So no reply of an old read replaces a newer value of the
  app. The view read stays.
- Each change of a source shows at once, also while the chat is hidden. So
  a login that the account screen saves shows in a kept chat on a return.
- `start` copies the sources into the snapshot and follows them. `stop`
  ends the subscriptions. `hide` and `show` keep them.
- A chat without sources reads the four values at each load.
- The workspace list gives the chips their workspaces, with the archived
  ones. The chat watches it from `start` or `show` until `hide` or `stop`,
  through `watchWorkspaces`, which the app connects to
  `OrgModel.watch('list')`. So the chips stay current on a phone, where no
  list is on the screen, and a hidden chat reads nothing. A chat without
  sources reads the list itself while it shows, with the wait of a shown
  list of the app, in `state/workspace-list.ts`.

## Rules for this code

- The state keeps one saved order for session, file, and diff tabs. The row
  order includes each tab once. A host with no file or diff tabs leaves
  their saved places in the view. In a read-only workspace, the row uses
  the session tabs that the browser keeps.
- The load gives each open session a place and removes the places of
  sessions that are not open. When an open session first arrives, the
  state adds its missing place at the end. It drops no other place.
  At the load, missing places go at the end, in the order of creation.
  These changes send no write of their own. The next view save carries
  them, and a read-only workspace keeps them in the browser only.
- `moveTab(tab, place)` puts a tab before or after its neighbour in the
  row. It saves through the shared view writer, then sorts the open
  sessions for Close. A new or reopened session opens at the end. A
  read-only workspace moves no tab.
- The tab row draws the tabs in the row order and moves them by drag and
  drop, on the shared `usePointerDrag` of [the web app](../app/README.md).
  A mouse drags a tab after a move of more than 4 px. A finger lifts a tab
  after a long press of 450 ms. The drop place is before the first other
  tab whose middle is right of the pointer, else after the last tab. A line
  that takes no space marks it, so no tab moves during the drag. The tab
  stays at its place as a faint copy, and a lifted copy hangs below the row
  under the pointer. The copy shows the whole title, which the row cuts at
  168 px, and a title wider than the window goes on to more lines. The
  status of the row tells a screen reader the title and the place, such as
  "Moving Debounce lookups to place 2 of 3". The release calls `moveTab`,
  and a drop at the tab's own place moves nothing. Escape ends a drag with
  no move.
- A drag does not change the shown tab: the click at its end selects
  nothing, also the click that a finger sends after it lets go. A press on
  Close starts no drag. A read-only chat binds no drag, and neither does a
  tab that shows its rename field. The tabs take the touch CSS of a drag: a
  long press opens no link menu and selects no text, and a finger still
  scrolls the row sideways.
- The tab menu opens on a right click of a tab, at the pointer, and on
  Shift and F10 or the Menu key of a focused tab, below the tab. The key
  handler of the tab opens it on every system and stops the key, so the
  browser opens no menu of its own. On a phone, a long press that ends with
  no move opens it as a sheet. A session tab has Rename session, a line,
  Move left, and Move right. A file or diff tab has Move left and Move
  right. A move that the place of the tab rules out is off: it keeps its
  place at half opacity, and the arrow keys skip it. Escape or a press
  outside closes the menu.
- Move left and Move right call `moveTab` with the neighbour of the tab.
  The focus goes back to the link of the tab, and the status of the row
  says the new place, such as "app.ts moves to place 2 of 3". Rename
  session opens the rename field in that tab, also when the tab does not
  show, and the shown tab does not change. The tab with the field has no
  fill of its own unless it is the shown tab. A read-only chat and a tab
  with its rename field open no tab menu, so the browser shows its own.
- A row whose tabs do not fit at their minimum width scrolls sideways, with
  no scrollbar. It keeps the tab with the rename field, else the shown tab,
  whole in view: at the mount, when that tab changes, when the row gets
  narrower, and when that tab changes its size or its place in the row,
  such as after a rename, Escape in the rename field, a new title from the
  agent, a new label of a file, or the close of a tab before it. A resize
  of the row or of any tab, and a render that changes the tabs, check that
  tab. A scroll of the user away from it stays until such a change. A tab
  that opens shows too, as far as the kept tab still shows with it, and so
  does a tab after a move. A tab that scrolls into view stops clear of the
  fades, at the scroll padding of the row. A vertical wheel turn over the
  row scrolls it sideways, through `useSidewaysWheel` of the web app. The
  row sets `.fadeStart` and `.fadeEnd` from its scroll position and the
  sizes of the row and its tabs. During a drag, the pointer within 32 px of
  an end of the row, or past it, scrolls the row, and the drag finds its
  drop place again after each scroll. This scroll starts only after the
  pointer moves, so a long press that holds still scrolls nothing, and its
  release opens the tab menu.
- [Transcript rules](transcript.md) give the rules of the stream cursor,
  the session logs, the transcript items and their counts, the changed
  files that the cloud computer could not read, the lost lines, the turns,
  the work fold of each ended turn, and Try again.
- [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn)
  says what folds when a turn ends. It also says that the line of each fold
  stays in place when the user opens or closes it, also for a run of calls.
- The chat loads the history of each session that becomes the shown session,
  whatever changed the selection: a click, an action, or a record from the
  stream. One load runs at a time for each session, and a failed load waits
  for Try again or for the next selection.
- The status of the stored history comes from its load alone. A chat with
  content, such as live messages, a sent message, a running turn, or the
  start steps, keeps it and shows a failed load as a notice by the composer,
  with Try again. An empty chat shows the failure in place of the chat.
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
- A read-only chat shows no composer, no +, no tab menu, no Try again, no
  drag of a tab, and no answer to a Mac command. Its empty state names only
  the session history.
- [Sessions, logins, and drafts](sessions.md) give the rules of the draft
  moves, the login of each session, and the linked sessions.
- A Stop request records the member who pressed Stop, and ends nothing. The
  turn ends when its end says stopped. A stop with no request names nobody:
  "The agent stopped".
- Each reply, read, and event with a session record, or with the workspace
  record and its start steps, carries the event number of its state. The
  newest number wins, whatever arrives first. So a Resume reply never
  hides a newer state from the stream, such as a failed start with its Try
  again. The steps after an action, such as a view save, the focus, or a
  free Resume button, still run when its reply is older. The header of
  [`state/session-records.ts`](state/session-records.ts) gives the pending
  edits of a rename or a model change.
- The composer reads Enter through `useSendKey` of
  `components/send-key.ts`, the one send key of every composer: the chat,
  and the page and the dialog of New workspace. On a computer, Enter sends
  and Shift+Enter adds a line, as
  [The send key](../../docs/protocol/create-a-workspace.md#the-send-key)
  says. In the phone layout, Enter adds a line. The message field asks the
  send key through `onEnter` before it adds a line, so Enter never adds a
  line to a message that it sends.
- The message field of every composer is the chip text field of
  `components/chip-field/`, as
  [The message field](../../docs/protocol/workspace-links.md#the-message-field)
  says. It holds plain text and a chip for each workspace link. A paste and
  a draft that comes back turn each workspace link into a chip, and typed
  text stays text. A paste reads only the plain text of the paste event.
  The draft is plain text with the exact link of each chip. A space goes
  beside a chip only where the text beside it would join its link, also in
  a copy. When the list of the org changes, a chip whose workspace left it
  becomes ordinary text, and a pasted or restored link whose workspace the
  list now holds becomes a chip, with no new step of undo. A new draft from
  the owner, such as an empty one after a send, clears the undo history,
  and the owner's echo of the field's own text changes nothing. The field
  also takes an identity for its draft as `owner`: `Draft.id` in the chat,
  and the model of each form in New workspace. A new owner replaces the
  content, the selection, and the undo history, also when its text is
  equal, so undo never takes the text of one draft into another. A draft
  that moves to another session keeps its identity, so its undo moves with
  it. The field stays mounted, so it keeps the focus. The field stays a
  focusable textbox while it takes no change, such as during a create. Its
  chips find their workspaces through `LinksProvider`.
- Send works while the sandbox is not ready: during the first start of a
  new workspace, after it failed, and during a resume. The workspace queues
  each message for the sandbox, as
  [Messages](../../docs/protocol/chat-and-events.md#messages) says.
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
- The chat loads the session list and the view, then the full history of the
  shown session, then the workspace and the session list again. The stream
  starts after the history's `throughEventNumber`, so no change between the
  reads and the stream gets lost.
- The chat writes no browser storage. The drafts stay in memory, and the
  server keeps the open tabs through the view route. A kept controller
  lives only in the memory of its tab, so a reload or a new tab starts
  empty.
- [The Mac commands](device/README.md) hold the rules of the requests,
  their answers, and the settings of the Mac.
- Reusable code imports no fixture data and no fake. Fixtures, replays, and
  stateful fakes live in `dev/` and in test files only.
- The parts reuse the mockup CSS modules and the mockup parts that are pure,
  so the app and the mockups look the same. The shared CSS also limits a
  long menu or sheet, which then scrolls. A mockup part that imports
  fixture data or has no handlers has an interactive version here.
- Sizes, such as "12 KB" or "1.2 MB", come from `formatSize` in the mockups'
  `src/components/chat/sizes.ts`. The attached files, the left-out output,
  the mockups, and the composer of a new workspace share it. The chat keeps
  no size formatter of its own.
- Sent messages and agent answers show each workspace link as a chip, as
  [Workspace links](../../docs/protocol/workspace-links.md) says. One
  tokenizer, `chatParts` in `links/chat-parts.ts`, reads both, in one pass
  from left to right. A backtick starts code first, so a link in code
  stays code. A Markdown link whose brackets stand outside code is one
  unit, also when its label holds code or bold, so it shows as its chip
  alone. Then bare links count. In an answer, `**` marks bold around text
  and chips, and a bare link ends before a mark. Bold ends at code, as
  before. A Markdown link of no workspace shows its source with its code
  and bold, as before. `links/workspace-links.ts` reads each link with the
  URL parser and `parseRoute`. A link is a chip only when it has the
  origin of the links of the list, and the router reads a page of a
  workspace of the org in that list. The chip shows the current name and
  state, and it opens the page that the router read, with its tab path,
  query, and hash. Every other link stays as the text has it. The message
  field reads its text with `textParts`, which reads no code. A message line of
  a work fold shows chips too. A click on a chip there stays with the
  chip, so the line does not toggle, and a click with a modifier key opens
  a new tab as on any link.
- User-facing text follows the
  [names in the product](../../docs/protocol/chat-and-events.md#names-in-the-product):
  no "Claude Code", and no provider name.

## Development page

The [development page README](dev/README.md) gives the command that runs
the page, the options of its address, and what the page does. The page
shows the chat on a fake API with state, with no Worker. `npm run dev` also
shows the chat, in the whole app, with the limits that
[Run it](../app/README.md#run-it) gives.

## Tests

Run `npm run test -- src/chat`. The tests drive the controller and the stream
on `FakeApiServer` and the recorded events, and render the chat with
`react-dom/server`. `state/test-kit.ts` holds their helpers. The
[workspace screen](../shell/workspace/README.md#key-code) tests the kept
chat in the whole app.
`components/TryAgain.dom.test.tsx` mounts the chat and presses Try again.
It checks the plain message of a refused retry in a tab that missed newer events.
`state/linked-replies.test.tsx` drives replies of Send and Try again that
name a linked session, in both orders, and two chats with different readers
on one fake stream. `components/SessionLogin.test.tsx` renders the login
label and its notices. `components/SourceLink.dom.test.tsx` presses the link
of a linked session to its open and its closed source. In an archived
workspace, it opens a linked session that closed before the archive from the
session history. Its source link writes nothing.
`state/first-start.test.ts` drives Send in two sessions during the first
start, after it failed, and during a resume. It checks the saved message of
a failed start from a read and the stream, and a send that the Worker
refuses. `components/FirstStart.dom.test.tsx` mounts the chat without a
host, sends with Enter and Send during the first start and after it failed,
and checks the saved message on the bar of a failed first start and of a
failed resume. `components/WorkFold.dom.test.tsx` reads the folds of ended
turns from the rendered chat. `components/OpenFold.dom.test.tsx` opens a
fold and a message line, and checks that each line keeps its place. It
also presses a workspace chip in a message line, with and without a
modifier key.
`components/ReadingPlace.dom.test.tsx` lays the chat out as a browser lays
out its reversed scroll box. It ends a long turn while the reader reads
higher up, and checks the read row and the newest message at the bottom.
`components/TabDrag.dom.test.tsx` mounts the chat with the real
`FileTabItem` of the Files screens and drags tabs with pointer events over
boxes that `components/tab-drag-test-kit.tsx` gives them. The file tab of
the kit has a real path with a fake secret value and a label that hides
it, so a name that the row takes from a path fails the tests. A mouse
moves a file tab before a session tab, and the click at the end selects
nothing.
Escape keeps the order. A finger lifts a session tab after 450 ms, near
the clipped end of a full row, which takes the browser layout of
`components/row-layout-test-kit.ts`. While the finger holds still, the row
does not scroll. Its release with no move opens the tab menu as a sheet,
which the late click of the finger does not close. In a full row, a mouse
holds a dragged tab near each end. The drag kit holds the animation
frames, so this test fakes them and steps them one at a time. The row
scrolls toward each end, and the drop goes to a place that the scroll
showed. A second drag scrolls by the same step, so the first drag left no
frame loop running. `components/TabMenu.dom.test.tsx` opens the tab menu
with Shift and F10 and with a right click, moves a file tab with Move
left, and opens the rename field in a tab that does not show.
`components/TabRow.dom.test.tsx` turns the wheel over a full row and reads
its fades. It also scrolls a full row over the browser layout of
`components/row-layout-test-kit.ts`, which gives the row and its tabs
their boxes and calls back each `ResizeObserver`, as happy-dom does not.
The row scrolls the shown tab into view at the mount, on a new shown
tab, and on a narrower row, the moved tab after a move, and a tab that
opens as far as the shown tab still shows. It keeps the whole shown tab
in view after the close of a tab before it and after a rename makes it
wider, and a row that the user scrolled away stays there. On a phone, a
finger that moves after its long press drags a tab toward the clipped
end. The row scrolls, the release drops the tab at the place that the
status says, and no tab menu opens.
`components/tab-row-test-kit.ts` sends their right clicks, keys, and
wheel turns.
`components/SessionTabs.test.tsx` renders the tab of a session with no
title and its rename field.
`components/chip-field/ChipTextField.test.tsx` pastes workspace links,
steps over a chip, removes it with Backspace and Delete, restores a draft,
copies, follows the list, and checks a field that takes no change. It
also checks that a focus puts the caret at the end of a kept draft, and
later back where the user put it. It checks that undo stays with its
draft after a switch to another draft with equal text, with the focus as
it was, and moves with a draft that moves.
`components/chip-field/chip-field-test-kit.tsx` mounts the field with an
owner that keeps the draft of each session, as the chat does.
`components/ComposerDrafts.dom.test.tsx` switches the sessions of the
chat after a delete, and moves the draft of a composer with its identity.
Undo stays with its draft in both.
`components/chip-field/field-text.test.ts` checks the separator rule. The
DOM tests focus, type, paste, clear, and read the field through
`src/test-support/message-field.ts`.
`links/workspace-links.test.ts` reads links with and without a tab path,
Markdown links, a code label in a sent message, code, `..`, other origins
and orgs, unknown workspaces, and punctuation. `links/LinkedText.test.tsx`
mounts an answer with chips: in bold, in a list, with a bold or a code
label, and a link in inline code and in a code block.
`state/workspace-list.test.ts` checks that a chat without sources reads the
list while it shows, and not while it is hidden. The workspace screen's
`LinkChips.test.tsx` checks the chips of a kept chat on a phone.

The Mac commands have their own [tests](device/README.md#tests), and a
check in the Mac app.

### Key code

- `WorkspaceChat.tsx`: `WorkspaceChat`, which owns its controller, and
  `WorkspaceChatView`, which draws a kept one, with their callbacks.
- `useChatController.ts`: the controller of one workspace and its snapshot,
  through `useWorkspaceStore`.
- `state/controller.ts`: `ChatController`, the public boundary of the chat
  state and its actions, with `show` and `hide` for a kept chat.
- `state/tab-order.ts`: the pure row order, the places of the open
  sessions, and the move before or after a neighbour.
- `components/SessionTabs.tsx`: the tab row, with the session tabs of
  `components/SessionTab.tsx` and the tabs of `renderTab`.
  `components/tab-row.ts`: `RenderTab`, `TabDraw`, and `rowOf`, the tabs of
  the row in the saved order with their titles.
- `components/useTabDrag.ts`: the drag of the tab row: the drop place, the
  move, and the status. `components/TabDragParts.tsx`: the drop line and
  the lifted tab.
- `components/useTabMenu.ts` and `components/TabMenu.tsx`: the tab menu,
  its items, and its drawing at a point or in a sheet.
  `components/useTabMoves.ts`: the moves of the row, the focus after a move
  from the menu, and the words of the status.
- `components/row-scroll.ts`: the scroll of a full row, its fades, and the
  scroll of a drag near an end. `components/row-reveal.ts`: the place of a
  tab in the row, and the scroll that brings tabs into view.
  `components/tab-nodes.ts`: the elements of the tabs, which the drag, the
  scroll, and the menu share.
- `components/SessionChat.tsx`: the chat of the open session, and
  `ChatHost`, the start steps and the sandbox bar that the app can draw.
- `components/Composer.tsx`: the message box and its controls, with the
  steering prompt that [Messages](../../docs/protocol/chat-and-events.md#messages)
  states.
- `components/chip-field/`: `ChipTextField`, the message field of every
  composer, over Lexical. `chip-nodes.tsx` holds the chip node and the
  node of a link that waits for its workspace. `field-content.ts` turns
  plain text into nodes and back, and reconciles the chips with the list.
  `field-text.ts` joins the parts of the plain text with the separator
  rule. `field-plugins.tsx` holds the value, paste, copy, Enter, editable,
  and reconcile plugins. `focus-plugins.tsx` holds the handle that focuses
  the field, and the plugin of the `caretAtEnd` option. At each focus
  without a press of the pointer, such as from Tab, that plugin puts the
  caret back where it was, or at the end of a kept draft. The New
  workspace page and dialog use that option.
- `state/load.ts`: the order of the first reads and the stream start.
- `links/`: `workspace-links.ts`, the link syntax, the reader of the
  links of a message field, and `linkTarget`, `chat-parts.ts`, the one
  tokenizer of sent messages and answers, `LinksContext.tsx`, the
  workspaces that chips find and the open of a chip, and `LinkedText.tsx`,
  which draws the parts of a message or an answer.
- `state/workspace-list.ts`: `WorkspaceList`, the list that the chips
  read, and `ownWorkspaceList`, the reads of a chat without sources.
- `state/sources.ts`: `ChatSources`, the app values that a kept chat
  follows in place of its own reads.
- `state/transcript.ts`: how chat events become the parts of a transcript.
- `state/session-log.ts`: the event log of each session, with its records
  in event order and its newest record. The record owner keeps the logs private.
- `state/known-turns.ts`: the known turns, their order, their ends, and
  `retryItemId`, the one failed item that offers Try again.
- `state/placement.ts`: where an item goes in its turn, also a late one.
- `state/late-events.ts`: accepted events of a turn that has ended.
- `state/item-keys.ts`: the item IDs that later events of an item reuse.
- `state/refused-events.ts`: how a refusal marker becomes a line, and how a
  refused end ends its turn.
- `state/history.ts`: the shared history load of each session, and the
  watch that loads the history of each shown session.
- `state/drafts.ts`: the draft identity, its moves, and its work in flight.
- `state/archive-view.ts`: the tabs and the session history of a
  read-only workspace, which change in the browser only.
- `state/model-moves.ts`: the draft move of a model change, in the snapshot
  that first shows the new session. Its target becomes selected only while
  the source stays selected. A newer session, file, or diff tab stays selected.
- `state/session-records.ts`: the order of session records by event number,
  and the pending edits of a session. It publishes accepted records from
  replies, complete current lists, and event merges. `confirmSessions`
  establishes the current records before the shown session starts its history.
- `state/workspace-records.ts`: the order of the workspace record and its
  start steps and saved error by event number.
- `state/session-login.ts`: whose login a message uses, from the session
  record and the reader, and the login label in the composer.
- `state/linked-replies.ts`: the message and the focus of a reply that names
  a linked session.
- `components/SourceLine.tsx`: the line that links a linked session to its
  source.
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the mockups' `lostCopy.ts`.
- `components/turn-work.ts` and `components/transcript-entries.ts`:
  `foldedWork` finds the work of each ended turn that folds, as the
  [transcript rules](transcript.md) say. `groupEntries` makes the entries
  that the chat draws, and puts each insert at its place, also in a fold.
- `components/WorkFold.tsx` and `components/MessageLine.tsx`: the work fold
  of an ended turn with its steps, and the message line that grows to the
  full text.
- `components/ToolGroup.tsx`: a run of tool calls, with `FoldLine` and
  `CallLine`, which the work fold shares.
- `components/reading-place.ts`: the keeper of the reader's place, which
  `ChatPane` gives through `ChatKeeper`. While the reader is scrolled up, it
  keeps the top row in view in place for every change of size of the
  transcript. When that row folds away, the fold that took it keeps its
  place.
- `components/useFold.ts`: `useFold` opens and closes a fold on a click on
  its line, and gives the line to the keeper, also at the bottom of the
  chat, so the line keeps its place.
- `components/SessionStatus.tsx`: the empty views and the history status of
  a session.
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  the reconnect, and the `hold` and `release` of the workspace stream.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders and the app's `ApiClient`, and the readers of their
  responses.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `components/send-key.ts`: `useSendKey`, the send key that the composer
  shares with the page and the dialog of New workspace in the app shell.
- `device/`: the Mac commands. Their [README](device/README.md) names
  their key code.
- `dev/`: the development page, its fake writes, its scripted agent, its
  Mac, the `loss` scenario in `dev/dev-loss.ts`, and the `starter` option
  in `dev/dev-logins.ts`.


### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Agent runner](../../docs/protocol/agent-runner.md): the limits of the
  runner events, their refusal markers, and the late events of a turn.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
