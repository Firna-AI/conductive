# The tab row

This guide belongs to [the chat](README.md). It gives the rules of the one
order of the session, file, and diff tabs, the drag, the tab menu, and the
scroll of the row.
[The tab row](../../docs/protocol/agents-and-sessions.md#the-tab-row) states
the requirements.

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
- The keys of the row follow the row order, as `useTabKeys` in
  `components/tab-keys.ts` gives them. Previous tab and Next tab show the
  tab before or after the shown tab, with a wrap at each end, also a file
  or diff tab, through its `show`. Close tab closes the shown session tab
  as its Close does, and the host closes a shown file or diff tab. Reopen
  closed session runs the first row of the session history. Copy concise
  transcript and Copy full transcript copy the shown session tab as the
  items of its tab menu do, with the same toast, also in a read-only
  workspace. A key that would do nothing, such as Next tab with one tab or
  a copy key while a file shows, goes on to the page.
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
  Copy link, Copy concise transcript, and Copy full transcript, a line,
  then Move left and Move right, with the icons of the mockups. A file or diff tab has
  Move left and Move right. A move that the place of the tab rules out is
  off: it keeps its place at half opacity, and the arrow keys skip it.
  Escape or a press outside closes the menu.
- Each item that changes the workspace carries a mark: Rename session and
  the moves. A read-only chat leaves out the marked items, and a group
  with no item left loses its line. So a session tab there has only its
  three copy items, and a file or diff tab has no item, so it opens no menu and
  the browser shows its own. A read-only chat binds no drag, so a finger
  opens the menu with `useLongPress` of the web app: a hold of 450 ms that
  ends within 8 px. It lifts no tab, sends no write, and selects no tab,
  because the click after it reaches nothing. A finger that moves first
  scrolls the row, and the tab takes the touch CSS of a drag.
- Move left and Move right call `moveTab` with the neighbour of the tab.
  The focus goes back to the link of the tab, and the status of the row
  says the new place, such as "app.ts moves to place 2 of 3". Rename
  session opens the rename field in that tab, also when the tab does not
  show, and the shown tab does not change. The tab with the field has no
  fill of its own unless it is the shown tab. A tab with its rename field
  opens no tab menu, so the browser shows its own.
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
