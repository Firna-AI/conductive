# Workspace menu

This doc holds the requirements and the decisions in force for the menu
of a workspace row. The menu moves, reassigns, renames, and archives the
workspace of its row, and it copies the link of that workspace. It belongs
to
[Workspaces and sandboxes](workspaces-and-sandboxes.md). The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws the menu at
`app/workspace-menu`, on desktop and on a phone, and in the flow
`user-flows/archive-from-list`.

## The menu

- Each row of the workspace list has a menu with the actions that the
  person can use, as [Who sees each action](#who-sees-each-action) says.
  This holds in the sidebar and on the list page, in the desktop layout
  and in the phone layout.
- This includes routine run workspaces, as
  [A run is a workspace](routine-runs.md#a-run-is-a-workspace) says.
- The menu holds Move to section, Reassign to, Rename, Copy link, and
  Archive, in that order. A line comes before Archive.
- On 9 November 2026 the user chose the four actions that change the
  workspace. On 12 November 2026 the user added Copy link, as
  [Copy link](#copy-link) says.
- Other actions, such as Pin and Mark as unread, were rejected for the
  menu, because the user chose these five actions.
- Each action other than Copy link changes the workspace of its row, also
  while another workspace is open.
- Each such action changes only its own part of the workspace: the
  section, the owner, the name, or the archive state.
- Archive can also advance the activity time, as [Archive](#archive) says.
- The reply to an action does not bring back an older value of another
  part, such as an older state of the workspace.
- When the workspace of the row is open, its page shows the new name or
  the new owner. Its tabs and its view stay as they were.

## Opening and closing

- A right click on a row opens its menu at the pointer.
- On a focused row, Shift and F10, or the Menu key, opens the menu below
  the row. This holds on every system.
- The right click and the keys open the same menu. In the phone layout,
  the menu opens as a sheet.
- No row has a button for the menu, on any screen. A touch screen gets
  no other way to open it. A long press of a finger still only lifts the
  row for a drag.
- Reason: the user asked for no such button, for the Archive shortcut as
  it was, and for a right click that opens the menu. A More button on
  each row, or only on touch screens, was rejected for that reason.
- The menu changes neither the time nor the Archive shortcut of the row.
  [Sections](orgs-and-members.md#sections) gives the shortcut, which shows
  over the time only on hover.
- A right click starts no drag.
- Opening the menu does not open the workspace, start its cloud computer,
  or mark its output as read. The open workspace stays open.
- The menu stays inside the window. The sidebar does not cut it off, also
  when the list scrolls.
- A press outside the menu closes it.
- In the desktop layout, Escape closes the open choices first, then the
  menu.
- When Escape closes the menu, the focus goes back to the row.
- In the phone layout, closing the sheet goes back to the list.
- In the desktop layout, the palette key closes the menu and opens the
  command palette. While a change of the menu runs, the key does nothing.
- In the phone layout, the menu is a sheet, so the palette key does
  nothing while it is open.
- [Where the key goes](command-palette.md#where-the-key-goes) gives these
  rules of the palette key.
- The other ways to act on a row stay. They are drag and drop, the keys
  that move a row, a click with a modifier key, and the Archive shortcut.
  An archived row can have a Restore shortcut in the same place, as
  [Sections](orgs-and-members.md#sections) says.
- The app adds no keys that run an action of the menu directly.

## Who sees each action

- The menu shows only the actions that the person can use. An action that
  the person cannot use does not show.
- Every member sees Copy link on every row, also an archived row and a
  row of a suspended org. Reason: a copy changes nothing, as for the copy
  items of the
  [tab menu of a read-only workspace](agents-and-sessions.md#the-tab-row).
- So every row has a menu.
- Every member sees Move to section and Rename on a workspace that is not
  archived, as [Members and roles](orgs-and-members.md#members-and-roles)
  says.
- Only an admin sees Reassign to.
- Only the workspace owner and the admins see Archive.
- On an archived workspace, the menu of an admin holds only Reassign to
  and Copy link. The menu of another member holds only Copy link.
- The menu offers no Restore. Every member restores an archived row with
  its Restore shortcut, the bar, the toast after Archive, or the palette,
  as [Restore](workspace-life.md#restore) says.
- Restore in the menu was rejected, because these four ways already reach
  every member.
- In a suspended org, the menu of each row holds only Copy link, because
  nothing in the org can change, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says.
- Move to section shows only when the org has more than one section.
- A change of the role, the workspace, or the org can take an action away
  while the menu is open. The menu then drops that action and its choices.
  Copy link stays, so the menu stays open.

## Copy link

- Copy link copies the link of the workspace of its row. It is the link
  that the Copy link button of the workspace header copies, as
  [Copy link](workspace-links.md#copy-link) says. The copy holds no path
  of a tab.
- Copy link works also in the Mac app.
- The menu closes at the press. After the copy, a toast says "Link
  copied".
- When the copy fails, the toast says "The link didn't copy. Try again."
- Reason: the menu is closed, so a toast gives the result. The words are
  those of the note under the button of the header.
- Copy link sends no request. It does not open the workspace, start its
  cloud computer, or mark its output as read.

## Move to section

- Move to section opens the sections of the org, in the order of the
  list. The section of the workspace is marked.
- In the desktop layout, the sections open beside the menu. The pointer
  on Move to section opens them, and so does the Right arrow key. The Left
  arrow key closes them.
- In the phone layout, the sections take the place of the actions in the
  sheet, under the name of the workspace.
- A choice of another section moves the workspace to the top of that
  section. A choice of the section of the workspace changes nothing.
- When the move fails, the row goes back to its place, and a toast names
  the failure.

## Reassign to

- Reassign to opens the members of the org, as the owner picker of the
  workspace header does. The workspace owner is marked.
- In the desktop layout, the members open beside the menu, as the
  sections of Move to section do. In the phone layout, they take the
  place of the actions in the sheet.
- The choices show the same states as the owner picker of the header.
  This holds while the members load, while a change runs, and after a
  failed load or change.
- Reassigning to a suspended member fails, as
  [Owners and admins](operator-actions.md#owners-and-admins) says.

## Rename

- Rename puts a field in the row, in place of the name and the time. The
  field holds the name, and the name is selected.
- A double click on a row of the sidebar also opens this field, when the
  menu of the row offers Rename. A double click with a modifier key does
  not. The user asked for it on 12 November 2026.
- The first click of the double click opens the workspace, as a click
  does. The second click does not open it again, so the history gets one
  entry. The field then opens in the row.
- On the list page, the first click replaces the list with the
  workspace. So a double click there opens the workspace and no field.
- For a workspace without a name, the field is empty.
- Enter saves the name. A move of the focus out of the field saves it too.
  Escape closes the field and keeps the old name.
- The app removes the spaces at the start and at the end of the name. When
  the name is then empty, or the same as before, the field closes and
  nothing changes.
- When the save fails, the field keeps the typed name, so the person can
  save it again. A toast names the failure.
- A name from Rename is a name that a member gave. So no automatic name
  replaces it, as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says.
- Rename keeps the branch, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says.

## Archive

- A confirmed Archive advances the row's activity time to its acknowledged
  time. If the row already has a newer activity time, that newer time stays.
- Archive in the menu archives the workspace at once, with one write. It
  asks no question and runs no check, as
  [Archive](workspace-life.md#archive) says.
- Archive in the menu and the Archive shortcut of the row make the same
  write. One action archives the workspace once, also for the open
  workspace while it loads.
- Archive does not open the workspace, and it starts no cloud computer.
- While the write runs, the app shows that the Archive is pending. When the
  write fails, the row stays in its section, and a toast names the failure.
- After the archive, the current page stays, and the row moves to the
  Archived group. The toast after Archive offers Restore, as
  [Restore](workspace-life.md#restore) says.
