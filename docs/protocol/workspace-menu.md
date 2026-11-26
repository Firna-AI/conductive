# Workspace menu

This doc holds the requirements and the decisions in force for the menu
of a workspace row, which the header of the open workspace also opens.
The menu moves, reassigns, renames, and archives the
workspace of its row, and it copies the link of that workspace. It also
adds the workspace to the merge queue, or removes it. It belongs
to
[Workspaces and sandboxes](workspaces-and-sandboxes.md). The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws the menu at
`app/workspace-menu`, on desktop and on a phone, and in the flow
`user-flows/archive-from-list`. It draws the menu of a nested row at
`app/sub-workspaces/menu`, and the menu of the header at
`app/workspace-menu/header`.

## The menu

- Each row of the workspace list has a menu with the actions that the
  person can use, as [Who sees each action](#who-sees-each-action) says.
  This holds in the sidebar and on the list page, in the desktop layout
  and in the phone layout.
- This includes automation run workspaces, as
  [A run is a workspace](automation-runs.md#a-run-is-a-workspace) says.
- The header of the open workspace has the same menu, as
  [The menu in the header](#the-menu-in-the-header) says.
- The menu holds Move to section, Reassign to, Rename, Copy link, Add to
  merge queue, and Archive, in that order. A line comes before Add to
  merge queue and Archive, when the menu shows either of them.
- On a queued row, Remove from queue takes the place of Add to merge
  queue. [Merge queue in the app](merge-queue-in-the-app.md) gives both.
- On 9 November 2026 the user chose the four actions that change the
  workspace. On 12 November 2026 the user added Copy link, as
  [Copy link](#copy-link) says. On 22 November 2026 the user added Add to
  merge queue (decision 317).
- Other actions, such as Pin and Mark as unread, were rejected for the
  menu, because the user chose these actions.
- Each action other than Copy link changes the workspace of its row, also
  while another workspace is open.
- Each such action changes only its own part of the workspace: the
  section, the owner, the name, the archive state, or its entry in the
  merge queue.
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
  row for a drag. On a nested row, it does nothing, as
  [Moves](sub-workspaces.md#moves) says.
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

## The menu in the header

- The name of the open workspace in its header is a button. A press on it
  opens the menu of its row below the name. In the phone layout, the menu
  opens as a sheet. A second press on the name closes the menu.
- The name shows no caret. It looks like the name, and only a hover or a
  press shows that it is a button.
- The user asked on 17 November 2026 for the menu in the header, and then
  chose a press on the name.
- A right click on the header bar was rejected. In the Mac app the bar
  moves the window, so macOS takes its presses and the page never hears a
  right click there. The name is a button, so it takes its press in the
  Mac app too, as [the Mac app](desktop-app.md) says of the controls of a
  top bar.
- A right click on the header opens the menu of the browser, as before.
- The menu has the same actions, for the same people, as the menu of the
  row, as [Who sees each action](#who-sees-each-action) says. It shows
  only when the list of the org has loaded and shows the workspace,
  because the list gives the section and the tree of the workspace.
  Otherwise the name is plain text.
- Each action works as in the menu of the row, with one exception: Rename
  puts its field in the header, in place of the name, as
  [Rename](#rename) says.
- The rules of [Opening and closing](#opening-and-closing) hold for the
  menu in the header too. When the menu closes, the focus goes back to the
  name.
- The name takes the focus as other buttons do. Enter or Space on it opens
  the menu.

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
- A nested row has no Move to section, as
  [Moves](sub-workspace-list.md#moves) says. A queued row has none either,
  because it shows in no section.
- Add to merge queue and Remove from queue show only to a member with
  write access or more to the repository. Add to merge queue shows only
  for a workspace that can join.
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
- The move also moves each workspace nested under the row, as
  [Moves](sub-workspaces.md#moves) says.
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
- Rename in the menu of the header puts the field in the header, in place
  of the name. The field works as the field of the row.
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
- Rename changes the branch only before the start creates the branch in
  the sandbox. After that, Rename keeps the branch, as
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
- Archive shows as done at once, before its write gets a reply: the row
  moves to the Archived group, and the open workspace shows as archived.
  No control shows a busy state for it.
- When the write fails, the row goes back to its section, the open
  workspace shows as it was before, and a toast names the failure.
- The toast after a done Archive comes with the reply of its write.
- After the archive, the current page stays, and the row moves to the
  Archived group. The toast after Archive offers Restore, as
  [Restore](workspace-life.md#restore) says.
