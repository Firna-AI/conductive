# Sections

This doc holds the requirements and the decisions in force for the
sections of an org and the rows of its workspace list. It covers the menu
and the order of the sections, the moves of workspaces between them, the
Archived group and its counts, and the Archive, Restore, and open of a
row. It belongs to [Orgs and members](orgs-and-members.md). The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Sections

- Sections are groupings of workspaces that the people of the org define.
  A section is not tied to a repository.
- A section can hold trees of workspaces. Each sub-workspace shows nested
  under the row of its parent, as [The list](sub-workspaces.md#the-list)
  says.
- Each section collapses, and has a menu with New workspace, Rename section,
  Move section up, Move section down, New section, and Delete section, in
  that order. The first section has no Move section up, and the last
  section has no Move section down.
- A collapsed section shows only its header and its count, with one
  exception: when it holds the open workspace, it still shows the row of
  that workspace. Reason: the user asked on 24 November 2026 that the open
  workspace stay in sight when its section is closed.
- New section opens the New section dialog, which asks for the name of
  the section. New section in the menu of a section puts the new section
  directly below that section. New section in the command palette puts
  it at the end of the list. When the section of the menu is gone at the
  create, the new section goes at the end. Reason: the user asked on 16
  November 2026 that a new section show where the user made it, because
  a field at the end of the list was far from the menu.
- The order of the sections is the same for each member of the org. A
  collapse is for the member only. Reason: a section is a grouping that
  the people of the org define, as its name is.
- A section moves to another place in the list by a drag of its header,
  or by Move section up and Move section down. On a phone, a long press
  lifts the header. A click on the header that drags nothing still
  collapses the section. General moves like any other section. The
  Archived group stays at the end of the list.
- A member sees the order that another member changed at the next read
  of the list, as for a rename.
- New workspace at the top of the list puts the workspace in General, the
  default section. New workspace in the menu of a section puts it in that
  section. The New workspace dialog can pick another section, as
  [The dialog](create-a-workspace-dialog.md#the-parts-and-the-section) says.
- A workspace moves to another section by drag and drop. On a phone, a
  long press lifts the row.
- A focused row also moves by keys.
  [Fixed keys](keyboard-shortcuts-fixed-keys.md#fixed-keys) gives the keys.
- Move to section in the
  [menu of a workspace row](workspace-menu.md#move-to-section) moves it too.
- Each of these moves of a row also moves each workspace nested under it.
  A nested row has none of these moves, as
  [Moves](sub-workspaces.md#moves) says.
- Deleting a section moves its workspaces to General, also the archived
  ones. Reason: no workspace gets lost, and a Restore always has a section
  to go back to.
- The app keeps each archived workspace in the Archived group at the end
  of the list until its Restore ends (decision 518). The users do not edit
  that group. [Removed workspaces](workspace-life.md#removed-workspaces)
  says what happens then.
- Each count of workspaces on the screens of an org leaves out the removed
  workspaces. These are the count of the Archived group and the count of
  each member on the Members tab. They are also the counts in the
  questions of Remove member and Leave org.
- Reason: a count then matches the rows in the list.
- The page of an org with an empty list asks for a first workspace, also
  when the org has removed workspaces.

## Workspace rows

- A workspace row offers Archive only to its owner and the org's admins.
  Only hover reveals its archive icon over the time without moving the row
  content. Selection and keyboard focus alone keep the time visible.
  The workspace header has no archive control.
- A touch screen without hover, such as a phone, never shows the Archive
  or the Restore icon of a row. One tap on a row opens its workspace.
  Reason: iOS Safari takes the first tap on an element whose hover shows
  content as a hover, so a person had to tap twice. On 16 November 2026
  the user chose this, although a phone then has no Archive in the list.
- A row of the Archived group offers Restore in the same way, to every
  member, until Restore of its workspace ends, as
  [Restore](workspace-life.md#restore) says.
- A click on a workspace row in the sidebar opens the workspace with the
  focus in its message box, so that the user can type at once. This holds
  also for the row of the open workspace. The message box takes the focus
  when it shows, unless the focus moved to another element before then.
  Reason: the message box never takes the focus from a later choice of the
  user. The list page of a phone opens a workspace without that focus, so
  that no keyboard opens on its own.
- When the message box of a workspace takes the focus without a press of
  the pointer, the caret goes back where it was in that box. Without such
  a caret, as for a kept draft, it goes to the end of the text, not to the
  start. Reason: a person who comes back to a draft most often adds to its
  end, as in the message box of New workspace.
