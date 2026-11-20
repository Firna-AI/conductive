# The New workspace dialog

This doc holds the requirements and the decisions in force for the New
workspace dialog. It covers when New workspace opens the page or the
dialog, and the parts, the draft, the close, and the create of the dialog.
It belongs to [Create a workspace](create-a-workspace.md), which covers New
workspace, the preference that chooses between the page and the dialog,
the create, the branch, and a failed first start. The terms are those of
the [architecture doc](../architecture.md#terms).

## Page or dialog

- A phone always opens the page. A window narrower than 640 px shows the
  phone layout, so it opens the page too.
- The choice says that a phone always opens the page.
- Reason: on a phone, a dialog is a sheet that fills the screen, the same
  as the page, and only the page has an address.
- The dialog has no address. The address of New workspace always shows
  the page.
- Reason: links, a reload, and a new tab then keep working.
- On a computer, when the choice is the dialog, New workspace opens the
  dialog from each of its places: the row at the top of the list, the
  button of an org without workspaces, the item in the menu of a section,
  and the command palette.
- A click with a modifier key on the row at the top of the list opens the
  page in a new tab, as a click on a link does.
- While the screen shows a New workspace form, New workspace opens the
  page, as without the dialog. Reason: a dialog over a form would show a
  second message field on one screen.
- The dialog puts the workspace in the section that
  [Sections](orgs-and-members.md#sections) gives.

## The dialog

- The dialog holds the parts of the page: the repository picker, the
  message and its files, the model picker, and the Capabilities icon.
- The dialog always names the org and the section of the new workspace,
  also General.
- The org and the section are a menu of the sections of the org, in the
  order of the list, with the current section checked. A pick puts the
  new workspace in that section. The menu has no Archived item, because
  Archived is a group of the list and not a section. The user asked for
  the menu on 12 November 2026.
- The pick belongs to the draft. So a close keeps it with the message,
  and the page of the same org and section names the picked section. A
  create ends the pick, so the next draft starts in the section that
  opened it.
- The button of the dialog is Create. The button of the page is Send,
  because the page looks like the chat that it becomes.
- The dialog shows the notices of the page: the first build, a waiting
  repository, a missing agent login, a failed create with Try again, and an
  org without chosen repositories.
- In an org without chosen repositories, the dialog and the page tell a
  member who is not an admin that an admin chooses them. An admin gets
  Choose repositories. Reason: only an admin can choose them.
- Escape and a press outside close the dialog, except while the create
  runs.
- An action of the dialog that opens another page, such as Connect Claude
  or Choose repositories, closes the dialog first. The dialog also closes
  when the address changes, such as with Back in the browser, also while
  the create runs.
- The dialog and the page of the same org and section share one draft.
- A close of the dialog keeps the draft, with its message and its files,
  as a move away from the page does. So no close loses a message.
- When the page or the dialog shows a kept message again, the cursor
  starts at the end of the message. After that, each click and key moves
  the cursor as usual.
- When the server accepts the create, the dialog closes, and the app opens
  the new workspace, as after a create from the page. This holds also
  when the dialog closed while the create ran.
- A create in the background was rejected, because it needs a new notice
  for a create that finished.
- The dialog shows a failed create only when the create request fails.
  When the sandbox of the new workspace then does not start, the workspace
  keeps its queued messages and shows Try again, as
  [A failed first start](create-a-workspace.md#a-failed-first-start) says.
- When the dialog opens, the message field gets the focus. When the dialog
  closes and the screen stays, the focus goes back to the control that
  opened it. When another screen opens, that screen takes the focus.
