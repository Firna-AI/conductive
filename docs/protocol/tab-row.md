# The tab row

This page belongs to [Agents and sessions](agents-and-sessions.md). It
holds the requirements and the decisions in force for the tab row of the
centre column of a workspace. It covers the order of the tabs, their
moves, the scroll of the row, the place that each tab keeps, the tab
that shows at a return to the workspace, and the tab menu. The terms are
those of the [architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A file row menu decision number names a decision of the change that
adds the menu of the rows of All files and Changes, as
[File row menu](file-row-menu.md) says.

- The tab row of the centre column shows the session tabs, the file and
  diff tabs, the skill tabs, and the Preview tabs in one order (decision
  186). A Preview tab shows the page of one port, as
  [Port previews](port-previews.md#preview-tabs-and-the-end-of-a-preview)
  says (decision 291). A skill tab shows the text of one skill, as
  [Skill tabs](skill-tabs.md) says.
- Each member has their own order in each workspace. The order stays after
  a reload. The other devices of that member load the same order.
- A new tab of any kind opens at the end of the row. This holds also for a
  session that the history reopens, and for a new
  [temporary tab](temporary-tabs.md).
- A press that replaces the file, the diff, or the skill of the temporary
  tab leaves the tab in its place. This holds also when later tabs stand
  after it. A keep does not move the tab either.
- The user can drag any tab to any place in the row.
- A row that keeps the sessions and the files in two groups was rejected,
  because a file could then never go before a session.
- A drag does not change the shown tab. Escape cancels a drag and keeps the
  order.
- On a phone, the row shows only the session tabs. A long press lifts a
  tab there.
- A move on a phone changes only the place of the moved session tab. Each
  file, diff, skill, and Preview tab keeps its place.
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
- Each tab of the row keeps the reader's place while another tab or another
  workspace shows. A session tab keeps the row that the user read, as
  [The scroll of the chat](chat-and-events.md#the-scroll-of-the-chat)
  says. A file, diff, or skill tab keeps its scroll offset, one for each
  of its views, such as the code and the preview of a Markdown file. A
  reload forgets the places. The user chose this on 13 November 2026.
- A tab that closes forgets its place, also when another member closes its
  session. When it opens again, a session tab shows the bottom, and a
  file, diff, or skill tab shows the top. The user chose this on 13
  November 2026.

## The shown tab at a return

- A return to a workspace at its address alone shows the tab that showed
  when the member left it, also a file, diff, skill, or Preview tab. A
  click on the row of the workspace in the list, its workspace row in the
  command palette, and a reload of that address open the workspace at
  that address. The user asked for this on 17 November 2026.
- Reason: a member who leaves a Preview tab and comes back expects that
  tab, not the chat.
- The shown tab comes from the saved view that the browser tab read. A
  reload, a new browser tab, and another device of the member read the
  saved view again. A workspace that the browser tab keeps uses its kept
  copy of the view, as
  [Events](chat-and-events.md#events) says of its chat.
- An address that names a tab, a tool, or a session shows what it names.
- A move to the address of the workspace during the same visit shows the
  chat, as a click on a session tab does. Such a move, such as a move back
  in the browser history, makes the shown session the active tab. So a
  later return shows the chat too.
- A move away and back before the view is read keeps the address.
- On a phone, the workspace opens at the chat, because its row holds only
  the session tabs.
- A restore of the shown tab starts no Resume of a stopped cloud computer
  of its own. The open of the workspace resumes it, as
  [Stop and resume](workspace-life.md#stop-and-resume) says.

## The tab menu

- A right click on a tab opens its tab menu (decision 188).
- On a focused tab, Shift and F10, or the Menu key, also opens the tab
  menu. This holds on every system.
- On a phone, a long press that ends without a move opens the tab menu as
  a sheet.
- The tab menu of a session tab holds four groups, with a line between
  them: Rename session, then Copy link, Copy concise transcript, and Copy
  full transcript, then Move left and Move right, then Close other tabs and
  Close tabs to the right. The tab menu of a kept file or diff tab holds
  three groups, with a line between them: Copy path, then Move left and
  Move right, then Close other tabs and Close tabs to the right.
  The tab menu of a Preview tab holds Move left and Move right, then Close
  other tabs and Close tabs to the right. The tab menu of a kept skill tab
  holds the same items as the tab menu of a Preview tab. It has no Copy
  path, because a skill tab has no path.
- Copy link copies the link of the session of its tab, as
  [Session links](agents-and-sessions.md#session-links) says. The user
  added it on 12 November 2026.
- The tab menu of the temporary tab holds four groups, with a line between
  them: Keep open (decision 286 B), then Copy path, then Move left and
  Move right, then Close other tabs and Close tabs to the right. The tab
  menu of a temporary skill tab holds the same groups without Copy path.
- Reason: the tab menu groups its items by kind (decision 188). Copy path
  comes after Keep open and before the moves, as the copy items of a
  session tab come after Rename session and before the moves.
- [Session transcripts](session-transcripts.md) states what each copy item
  copies (decisions 213 and 215).
- [Copy path](file-row-menu.md#copy-path) states what the Copy path item
  copies, and the tabs that leave it out (file row menu decision 3 B).
- Reason: a member can copy the path of the open file from its tab, with
  no need to find its row. Copy path only on the rows, a Copy path button
  in the header of the file, and a Copy path command in the command palette
  were not chosen.
- Move left and Move right move the tab one place in the row. On the first
  tab, Move left is off. On the last tab, Move right is off.
- Close other tabs closes each tab of the row but the tab, of each kind,
  as the same item of a browser does. When the row holds only the tab, it
  is off. The user asked for it on 16 November 2026.
- Close tabs to the right closes each tab after the tab in the row, of
  each kind, as the same item of a browser does. On the last tab, it is
  off. The user asked for it on 16 November 2026.
- When the shown tab is among the closed tabs, the tab of the menu shows
  first, as in a browser. Each session tab closes as its Close does, so
  its session moves to the history for every member.
- On a phone, the row shows only the session tabs, so Close other tabs
  and Close tabs to the right close only session tabs. Each file, diff,
  skill, and Preview tab stays.
- After a move from the tab menu, a screen reader user hears the name of
  the tab and its new place, such as "Address autocomplete moves to place
  2 of 4". The focus then goes back to the tab.
- Keep open keeps the temporary tab, and the tab stays in its place. The
  focus then goes back to the tab. A screen reader user hears that the tab
  stays open, such as "README.md stays open".
- [Keep a tab](temporary-tabs.md#keep-a-tab) says why the menu holds Keep
  open.
- A move of the temporary tab to another place keeps it (decision
  287 B). A move of another tab leaves it temporary. This holds for a drag, Move left, and Move right. A drag that
  Escape cancels, or that ends in the same place, leaves the tab temporary.
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
- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, moves no tab.
- The tab menu of a read-only workspace leaves out each item that changes
  the workspace, and keeps each item that changes nothing (decision 214).
  So the tab menu of a session tab there holds only Copy link, Copy
  concise transcript, and Copy full transcript. It leaves out Close tabs to
  the right. The tab menu of a file or diff tab there holds only Copy path
  (file row menu decision 3 B).
- A file or diff tab there without Copy path, such as a tab whose label
  hides a secret value, has no item. So it opens no tab menu, and the
  browser shows its own.
- A skill tab or a Preview tab there opens no tab menu, because each of
  its items changes the workspace.
- Reason: a read-only workspace accepts no change, but a member can still
  copy there, as
  [Read-only workspaces](session-transcripts.md#read-only-workspaces)
  says. The rule also covers each item that the menu gets later.
- So a read-only workspace also leaves out Keep open. The tab menu of the
  temporary tab there holds only Copy path, and only a double-click keeps
  a tab (decision 286 B).
- The tab menu opens there in the same ways as in other workspaces. A long
  press on a phone opens it, but lifts no tab.
- An item that the place of a tab rules out, such as Move left on the
  first tab, still shows, but off. An item that a read-only workspace
  leaves out does not show.
- The usual tab menu with Rename session, Move left, and Move right off was
  rejected for a read-only workspace, because these rows never turn on
  there.
