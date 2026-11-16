# The tab row

This doc holds the requirements and the decisions in force for the tab row
of the centre column of a workspace. It covers the order of the tabs, their
drag, the scroll of the row, the reader's place that each tab keeps, and
the tab menu. It belongs to
[Agents and sessions](agents-and-sessions.md#the-tab-row).
[Split panes](split-panes.md) states the one or two panes of the centre
column. [Temporary tabs](temporary-tabs.md) states the temporary tab.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A split
panes decision number names a decision of the change that adds
[split panes](split-panes.md), as that doc says. The
[mockup catalogue](../mockups/catalogue-tabs.md) draws the tab row at
`app/tabs`.

## The order

- Each pane of the centre column has its own tab row (split panes decision
  1 C). [The panes](split-panes.md#the-panes) gives the reason.
- Each row shows the session tabs and the file and diff tabs of its pane in
  one order (decision 186).
- Each member has their own order of each row in each workspace. The order
  stays after a reload. The other devices of that member load the same
  order.
- A new tab of any kind opens at the end of the row of its pane. This holds
  also for a session that the history reopens, and for a new
  [temporary tab](temporary-tabs.md).
  [Where a tab opens](split-panes.md#where-a-tab-opens) says which pane a
  new tab opens in.
- A press that replaces the file or the diff of the temporary tab leaves
  the tab in its place. This holds also when later tabs stand after it. A
  keep does not move the tab either.
- The user can drag any tab to any place in its row, or to the other pane,
  as [Moves between panes](split-panes.md#moves-between-panes) says.
- A row that keeps the sessions and the files in two groups was rejected,
  because a file could then never go before a session.
- A drag inside one row does not change the shown tab. A move to the other
  pane shows the moved tab there, as
  [Moves between panes](split-panes.md#moves-between-panes) says. Escape
  cancels a drag and keeps the order.
- On a phone, the row shows only the session tabs. With two panes, it shows
  the session tabs of both panes, as [On a phone](split-panes.md#on-a-phone)
  says. A long press lifts a tab there.
- A move on a phone changes only the place of the moved session tab. Each
  file tab keeps its place.

## The scroll

- When the tabs do not fit at their minimum width, the row scrolls
  sideways (decision 187).
- The row scrolls a tab into view when the tab opens, when it becomes the
  shown tab, and after it moves.
- When the row gets narrower, it scrolls the shown tab back into view.
- A tab that opens without showing, such as a session that another member
  starts, does not push the shown tab out of view.
- A vertical turn of the mouse wheel over the row scrolls the row sideways.
  A sideways swipe, on a trackpad or with a finger, also scrolls it.
- A fade marks each end of the row that clips tabs.
- During a drag, the pointer near an end of the row scrolls the row, so a
  drop can reach every place.
- A menu of the hidden tabs was rejected, because the shown tab and the
  drop places could still hide. A row that wraps onto more lines was
  rejected, because the chat would move down when a tab opens.

## The reader's place

- Each tab of the row keeps the reader's place while another tab or another
  workspace shows. A session tab keeps the row that the user read, as
  [The scroll of the chat](chat-and-events.md#the-scroll-of-the-chat)
  says. A file or diff tab keeps its scroll offset, one for each of its
  views, such as the code and the preview of a Markdown file. A reload
  forgets the places. The user chose this on 13 November 2026.
- A tab that closes forgets its place, also when another member closes its
  session. When it opens again, a session tab shows the bottom, and a file
  or diff tab shows the top. The user chose this on 13 November 2026.

## The tab menu

- A right click on a tab opens its tab menu (decision 188).
- On a focused tab, Shift and F10, or the Menu key, also opens the tab
  menu. This holds on every system.
- On a phone, a long press that ends without a move opens the tab menu as
  a sheet.
- The tab menu of a session tab holds four groups, with a line between
  them: Rename session, then Copy link, Copy concise transcript, and Copy
  full transcript, then Move left, Move right, and the pane item, then
  Close tabs to the right. The tab menu of a kept file or diff tab holds
  Move left, Move right, and the pane item, then Close tabs to the right.
- The pane item reads Move to the other pane with two panes, and Open in a
  new pane with one pane (split panes decision 4 B).
- Copy link copies the link of the session of its tab, as
  [Session links](agents-and-sessions.md#session-links) says. The user
  added it on 12 November 2026.
- The tab menu of the temporary tab holds three groups, with a line
  between them: Keep open, then Move left, Move right (decision 286 B),
  and the pane item, then Close tabs to the right.
- Reason: the tab menu groups its items by kind (decision 188).
- [Session transcripts](session-transcripts.md) states what each copy item
  copies (decisions 213 and 215).
- Move left and Move right move the tab one place in its row. On the first
  tab, Move left is off. On the last tab, Move right is off.
- On a phone, Move left and Move right also move a tab across the border of
  the two panes, as [On a phone](split-panes.md#on-a-phone) says.
- The pane item moves the tab to the end of the row of the other pane.
  With one pane, it opens the second pane on the right, with the tab in
  it.
- Reason: the tab menu holds each keyboard path of a tab (decisions 188
  and 286 B). So a user who cannot drag can still split the column and
  move a tab to the other pane.
- The pane item is off when the tab is the only tab of the only pane,
  because the move then changes nothing. It is off on a phone, as
  [On a phone](split-panes.md#on-a-phone) says.
- After a move with the pane item, the tab shows in its new pane, and that
  pane becomes the focused pane, as
  [Moves between panes](split-panes.md#moves-between-panes) says. The
  focus goes to the tab in its new row. A screen reader user hears the
  name of the tab, its new pane, and its new place, such as "app.ts moves
  to the right pane, place 2 of 3".
- The pane item opens a new pane on the right only. So a keyboard user
  must move the other tabs to the right pane to get a left pane. Labels
  that name the side, with an item for each side, were not chosen. A split
  button at the end of each row was not chosen either, because it adds a
  control to each row.
- Close tabs to the right closes each tab after the tab in its row, of
  each kind, as the same item of a browser does. On the last tab of the
  row, it is off. The user asked for it on 16 November 2026.
- With two panes, it closes only tabs of the row of the tab. Reason: each
  pane has its own row (split panes decision 1 C).
- When the shown tab is among the closed tabs, the tab of the menu shows
  first, as in a browser. Each session tab closes as its Close does, so
  its session moves to the history for every member.
- On a phone, the row shows only the session tabs, so Close tabs to the
  right closes only the session tabs after the tab. Each file tab stays.
- After a move with Move left or Move right, a screen reader user hears
  the name of the tab and its new place, such as "Address autocomplete
  moves to place 2 of 4". The focus then goes back to the tab.
- Keep open keeps the temporary tab, and the tab stays in its place. The
  focus then goes back to the tab. A screen reader user hears that the tab
  stays open, such as "README.md stays open".
- [Keep a tab](temporary-tabs.md#keep-a-tab) says why the menu holds Keep
  open.
- A move of the temporary tab to another place keeps it (decision
  287 B). A move of another tab leaves it temporary. This holds for a drag,
  also to the other pane, and for Move left, Move right, and the pane item.
  A drag that Escape cancels, or that ends in the same place, leaves the
  tab temporary.
- Reason: a move shows that the user wants the file at that place. A
  temporary tab that stays temporary after a move was rejected. The next
  press would then replace the file at that place.
- A drag that keeps the tab while Move left and Move right do not was
  rejected. Two ways to make one move would then act differently.
- Rename session opens a field for the title in that tab. The shown tab
  does not change.
- In the app, the tab menu is the one way to rename a session. A Rename
  button on the shown session tab was rejected, because the tab menu
  already holds Rename session. An agent can also rename a session, as
  [Rename a session](session-management.md#rename-a-session) says.
- Keys that move a tab were rejected, because the user chose the menu. Alt
  with Left or Right also goes Back and Forward in browsers on Windows and
  Linux.
- No key and no row of the command palette moves a tab to the other pane,
  or puts the focus in the other pane (split panes decision 4 B). Commands
  for these, with no default key, were not chosen. They would reverse this
  rejection of keys, and the rule of
  [Actions](command-palette-actions.md#actions) that the palette has no
  view commands.

## Read-only workspaces

- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, moves no tab. It shows the saved split, as
  [Read-only workspaces](split-panes.md#read-only-workspaces) says.
- The tab menu of a read-only workspace leaves out each item that changes
  the workspace, and keeps each item that changes nothing (decision 214).
  So the tab menu of a session tab there holds only Copy link, Copy
  concise transcript, and Copy full transcript. It leaves out the pane item
  and Close tabs to the right. A file or diff tab there opens no tab menu.
- Reason: a read-only workspace accepts no change, but a member can still
  copy there, as
  [Read-only workspaces](session-transcripts.md#read-only-workspaces)
  says. The rule also covers each item that the menu gets later.
- So a read-only workspace also leaves out Keep open. The temporary tab
  there opens no tab menu either, and only a double-click keeps a tab
  (decision 286 B).
- The tab menu opens there in the same ways as in other workspaces. A long
  press on a phone opens it, but lifts no tab.
- An item that the place of a tab rules out, such as Move left on the
  first tab, still shows, but off. An item that a read-only workspace
  leaves out does not show.
- The usual tab menu with Rename session, Move left, and Move right off was
  rejected for a read-only workspace, because these rows never turn on
  there.
