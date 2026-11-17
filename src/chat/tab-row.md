# The tab row

This guide belongs to [the chat](README.md). It gives the rules of each
pane's order of session, file, and diff tabs, the mark of its temporary tab
and the moves that keep it, the drag, the tab menu with Keep open and
Close tabs to the right, and the scroll of the row, and the reader's place
that each tab keeps.
[The tab row](../../docs/protocol/tab-row.md) states the requirements.
[Split panes](../../docs/protocol/split-panes.md) states the requirements
of two panes, each with its own row. The chat draws each pane with its own
row, as [the panes](panes.md) says. Its tab menu has no pane item yet, and
no drag moves a tab to the other pane of a desktop column yet.

- Each saved pane keeps its own order of session, file, and diff tabs.
  A tab belongs to one pane only. A host with no file or diff tabs leaves
  their saved places in the view. In a read-only workspace, the row uses
  the session places in the browser copy of the saved view. That copy owns
  both the order and the selection. The stored session records stay in the
  open sessions and the history, even when their browser tabs change.
- Each pane also marks its temporary tab, which the host opens,
  keeps, and closes, as
  [Temporary tabs](../../docs/protocol/temporary-tabs.md) says. A move
  that changes its place keeps it too, as `moveTab` says below. Each change
  of the session tabs keeps the mark as it is.
- The load gives each open session a place and removes the places of
  sessions that are not open. When an open session first arrives, the
  state adds its missing place at the end of the focused row. It drops no other place.
  A send, Try again, or model change that opens a session puts that tab in
  the sending session's row instead. It shows there only while that pane
  still shows the sending session, and the focused pane stays.
  At the first load, missing places go at the end, in the order of creation.
  These changes send no write of their own. The next view save carries
  them. A read-only workspace initializes these places once, then keeps
  them in the browser. Later session reads and stream updates change the
  records without adding or removing local places or changing the selection.
- In a read-only workspace, Close takes the next session from the row
  order, else the session before it. It removes the session place from the
  browser view and updates its active tab when that tab closed. Reopen adds
  the session at the end of the focused row. New session uses that row too.
  The row's + names its pane and focuses it. A session selection sets the active tab of the
  browser view, also when a file shows. These actions send no write. If the
  view did not load, the row shows the open sessions. The first local tab
  action makes a browser view with all these sessions, so the other tabs stay.
- The keys of the row follow the row order of the focused pane, or the one
  row of a phone, as `useTabKeys` in `components/tab-keys.ts` gives them.
  Previous tab and Next tab show the
  tab before or after the shown tab, with a wrap at each end, also a file
  or diff tab, through its `show`. Close tab closes the shown session tab
  as its Close does, and the host closes a shown file or diff tab of the
  focused pane. Reopen
  closed session runs the first row of the session history. Copy concise
  transcript and Copy full transcript copy the session of the focused
  pane, else the session that the other pane shows, as the items of its
  tab menu do. They use the same toast, also in a read-only workspace.
  A key that would do nothing, such as Next tab with one tab or a copy key
  when no pane shows a session, goes on to the page.
- `moveTab(tab, target)` of the controller puts a tab before or after its
  neighbour in the row of a pane, at the end of that row, or in a new pane
  on either side. Each row names the pane of the neighbour of the new
  place, so a move inside a row stays in its pane. It saves through the
  shared view writer, then sorts the open sessions for Close. A new or
  reopened session opens at the end. A read-only workspace moves no tab.
- Each move calls the pure `moveTab(view, tab, target)` in
  `state/tab-order.ts`. A pane move shows the tab there and focuses that
  pane. The source keeps its shown tab unless that tab moved. It then
  shows the next tab, else the previous tab. An empty source pane closes.
  A split of the only tab changes nothing. A move whose tab or neighbour is
  in no row of the view moves nothing. On a desktop, no screen control
  moves a tab to the other pane yet.
- The one row of a phone holds the session tabs of both panes, the left
  pane first, with a short neutral line between the two parts. A drop
  there moves the tab into the pane of the tab next to its drop place.
  Move left on the first tab of the right part, and Move right on the last
  tab of the left part, move the tab across the line, to the near end of
  the other pane. The status then names the pane, such as "app.ts moves to
  the right pane, place 1 of 3", and the focus goes back to the tab.
- A move that changes the place of the temporary tab keeps it, as
  [The tab row](../../docs/protocol/tab-row.md#the-tab-menu)
  says: the pure `moveTab` of `state/tab-order.ts` drops the mark with the
  new order, so one save holds both. The drop of a drag, Move left, and
  Move right all move through it. A move that changes no place gives the
  same view, so it saves nothing and the mark stays. A move of another tab
  keeps the mark too, also when it changes the index of the temporary tab.
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
  no move. So neither keeps the temporary tab.
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
  Copy link, Copy concise transcript, and Copy full transcript, a line,
  then Move left and Move right, a line, then Close tabs to the right, with
  the icons of the mockups. The temporary tab has Keep open, with the
  bookmark icon of the mockups, a line, Move left and Move right, a line,
  then Close tabs to the right. A kept file or diff tab has Move left and
  Move right, a line, then Close tabs to the right. The host tells the row
  which tab is temporary: only that tab gets a `keep` from `renderTab`. A
  move or a close that the place of the tab rules out is off: it keeps its
  place at half opacity, and the arrow keys skip it. Close tabs to the
  right is off on the last tab of each part of the one row of a phone.
  Escape or a press
  outside closes the menu.
- Each item that changes the workspace carries a mark: Rename session,
  Keep open, the moves, and Close tabs to the right. A read-only chat
  leaves out the marked items, and a group with no item left loses its
  line. So a session tab there has only its three copy items, and a file
  or diff tab, also the temporary tab, has no item, so it opens no menu
  and the browser shows its own. A read-only chat binds no drag, so a finger opens the menu with
  `useLongPress` of the web app: a hold of 450 ms that ends within 8 px. It
  lifts no tab, sends no write, and selects no tab, because the click after
  it reaches nothing. A finger that moves first scrolls the row, and the
  tab takes the touch CSS of a drag.
- Move left and Move right call `moveTab` with the neighbour of the tab.
  The focus goes back to the link of the tab, and the status of the row
  says the new place, such as "app.ts moves to place 2 of 3". Keep open
  calls the `keep` of the tab, as a double-click on the tab does, and the
  chat saves nothing of its own. The tab stays in its place, the focus goes
  back to its link, and the status says that it stays open, such as
  "README.md stays open". The row does not scroll for a keep. Rename
  session opens the rename field in that tab, also when the tab does not
  show, and the shown tab does not change. The tab with the field has no
  fill of its own unless it is the shown tab. A tab with its rename field
  opens no tab menu, so the browser shows its own.
- Close tabs to the right runs `closeTabsRight` of
  `components/close-right.ts` on the tabs after the tab in the row order,
  in the pane of the tab.
  When one of them is the shown tab, the tab of the menu shows first, as a
  click on it does, so no close picks another tab to show. The file and
  diff tabs then leave the view in one change, through `withoutTabs` of
  `state/tab-order.ts` and `updateView` of the controller, which also
  drops the mark of a closed temporary tab. The session tabs close through
  one `requestClose` of the controller, as their Close does: each idle
  session closes at once, and the running ones share one close question,
  which names each of them. A close of one of these sessions by another
  member drops it from the question. A phone row holds only the session
  tabs, so each file tab stays there.
- A copy item calls `copyTranscript` of the controller during its press,
  so the clipboard write starts before the reply comes, as
  [Session transcripts](../../docs/protocol/session-transcripts.md#the-copy-items)
  says. The menu closes, and a toast says "Transcript copied", or "The
  transcript didn't copy. Try again." It selects no tab, loads no history,
  and saves no view, also for a tab that never showed.
- Copy link copies the link of the session of its tab, with the origin of
  the link of the workspace, as
  [Session links](../../docs/protocol/agents-and-sessions.md#session-links)
  says. The menu closes, and a toast says "Link copied", or "The link
  didn't copy. Try again." It sends no request and selects no tab. Before
  the workspace loads, the chat knows no origin, so the menu has no Copy
  link.
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
- Each tab keeps the reader's place while another tab, workspace, or page
  shows, as
  [The scroll of the chat](../../docs/protocol/chat-and-events.md#the-scroll-of-the-chat)
  says. `ChatController.places` keeps the place of each session tab: the
  bottom, or the key of the top row in view with the distance of its top
  below the top of the box. `TranscriptView` puts each entry, pending
  message, and the running turn in one row with a `data-row` key, which
  lays out its parts as the transcript does. The keeper of the reader's
  place in `components/reading-place.ts` writes the place at each note, and
  a new keeper, for another session or a new mount, shows the kept place.
  A row that left the transcript gives the bottom. Each send of this tab,
  also a fixed prompt while a file tab shows, puts the place of its session
  at the bottom. The places live in a `TabPlaces` store of
  [the web app](../app/tab-places.ts). The chat gives it each list of the
  session tabs through `useFollowTabs`, and a session that leaves the tabs,
  such as at a close, forgets its place, so it opens at the bottom again. The kept files of the
  workspace keep the offset of each file and diff tab, as the
  [Files README](../files/README.md#kept-scroll-offsets) says.
