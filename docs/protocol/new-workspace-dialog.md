# New workspace as a dialog

This doc holds the requirements and the decisions in force for New
workspace as a dialog. It belongs to
[Create a workspace](create-a-workspace.md#the-dialog), which covers New
workspace as a page, the choice between the page and the dialog, the
create, the branch, and a failed first start. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The dialog

- The dialog holds the parts of the page: the repository picker, the
  message and its files, and the model picker.
- The dialog always names the org and the section of the new workspace,
  also General.
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
