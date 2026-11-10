# Workspace menu

This doc holds the requirements and the decisions in force for the menu
of a workspace row. The menu moves, reassigns, renames, and archives the
workspace of its row. It belongs to
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
- The menu holds Move to section, Reassign to, Rename, and Archive, in
  that order.
- Copy link and other actions, such as Pin and Mark as unread, were
  rejected for the menu, because the user chose these four actions.
- The workspace header keeps Copy link, as
  [Copy link](workspace-links.md#copy-link) says.
- Each action changes the workspace of its row, also while another
  workspace is open.
- Each action changes only its own part of the workspace: the section,
  the owner, the name, or the archive state.
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
- The app adds no keys that run an action of the menu directly.

## Who sees each action

- The menu shows only the actions that the person can use. An action that
  the person cannot use does not show.
- Every member sees Move to section and Rename on a workspace that is not
  archived, as [Members and roles](orgs-and-members.md#members-and-roles)
  says.
- Only an admin sees Reassign to.
- Only the workspace owner and the admins see Archive.
- On an archived workspace, the menu of an admin holds only Reassign to.
  Other members get no menu on an archived row.
- In a suspended org, no row has a menu, because nothing in the org can
  change, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says.
- Move to section shows only when the org has more than one section.
- The app leaves the right click of a row without an action to the
  browser.
- A change of the role, the workspace, or the org can take an action away
  while the menu is open. The menu then drops that action and its choices.
  When no action remains, the menu closes.

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
- Archive asks the Archive question over the current page, with its check
  for work that is not pushed, as
  [Archive](workspace-life.md#archive) says.
- Archive in the menu and the Archive shortcut of the row ask the same
  question, with the same check. One action shows one question, also for
  the open workspace while it loads.
- Cancel keeps the current page as it was. After the archive, the current
  page stays, and the row moves to the Archived group.
- The check does not start a stopped cloud computer. When the check does
  not finish, the question says so, as
  [Archive](workspace-life.md#archive) says.
- An imported workspace with no successful activation gets the question of
  [Archive before the activation](imported-workspaces.md#archive-before-the-activation),
  with no check.
