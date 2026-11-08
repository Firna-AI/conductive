# Create a workspace

This doc holds the requirements and the decisions in force for the create
of a workspace. It covers New workspace, as a page or as a dialog, the
preference that chooses between them, the create, the branch, and a failed
first start. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
org image, the start steps, and the rest of the life of a workspace. The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## New workspace

- The New workspace page is an empty chat with a repository picker. The
  first message creates the workspace.
- New workspace opens as this page or as a dialog over the current screen.
  A preference of the user chooses which. Reason: the user asked for both
  ways.

### The preference

- The Account page has two tabs, General and Preferences, each with its
  own address. Preferences holds the New workspaces section, with Model
  and effort and the choice of how New workspace opens (decision 142).
  General holds the other sections of the account.
- Reason: all the settings of new workspaces then sit together. The
  section on General, with only the new choice on Preferences, was
  rejected, because the user then looks in two places.
- The choice offers the page and the dialog. Each change saves at once, as
  a change of Model and effort does.
- When a save fails, the choice keeps the saved value, and an error shows
  under it. A toast was rejected, because the error under the choice is
  closer to it.
- The choice belongs to the account. So it applies in each browser and in
  the Mac app.
- Reason: a setting of the Account page that holds in one browser only
  would surprise the user. A choice in the storage of the browser was
  rejected for that reason.
- Without a saved choice, such as for a new account, New workspace opens
  as the page. Reason: the user asked for the dialog as an option beside
  the page.
- A save of the choice saves no model. A user who never chose Model and
  effort keeps the default model and effort of the app.
- An open app uses a choice that the user saved in another browser or in
  the Mac app after its next start, as for Model and effort.
- Reason: a saved copy of that default would hold the model for the user
  when the app changes its default.

### Page or dialog

- A phone always opens the page. A window narrower than 640 px shows the
  phone layout, so it opens the page too.
- The choice says that a phone always opens the page.
- Reason: on a phone, a dialog is a sheet that fills the screen, the same
  as the page, and only the page has an address.
- The dialog has no address. The address of New workspace always shows
  the page.
- Reason: links, a reload, a new tab, and the return of the message after
  a failed start then keep working.
- On a computer, with the dialog chosen, New workspace opens the dialog
  from each of its places: the row at the top of the list, the button of
  an org without workspaces, and the item in the menu of a section.
- A click with a modifier key on the row at the top of the list opens the
  page in a new tab, as a click on a link does.
- While the screen shows a New workspace form, New workspace opens the
  page, as without the dialog. Reason: a dialog over a form would show a
  second message field on one screen.
- The dialog puts the workspace in the section that
  [Sections](orgs-and-members.md#sections) gives.

### The dialog

- The dialog holds the parts of the page: the repository picker, the
  message and its files, and the model picker.
- The dialog always names the org and the section of the new workspace,
  also General.
- The button of the dialog is Create. The button of the page is Send,
  because the page looks like the chat that it becomes.
- The dialog shows the notices of the page: a missing agent login, a
  failed create with Try again, and an org without chosen repositories.
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
- When the server accepts the create, the dialog closes, and the app opens
  the new workspace, as after a create from the page. This holds also
  when the dialog closed while the create ran.
- A create in the background was rejected, because it needs a new notice
  for a create that finished.
- The dialog shows a failed create only when the create request fails.
  When the sandbox of the new workspace then does not start, the first
  message goes back to the composer of the page, not to the dialog, as
  [A failed first start](#a-failed-first-start) says.
- When the dialog opens, the message field gets the focus. When the dialog
  closes and the screen stays, the focus goes back to the control that
  opened it. When another screen opens, that screen takes the focus.

### The send key

- On a computer, Enter sends the message from every composer, and
  Shift+Enter adds a line (decision 143). The composers are the chat of a
  workspace, the New workspace page, and the dialog.
- So Enter creates the workspace from the page and from the dialog.
- On a phone, and in every window with the phone layout, Enter adds a
  line in every composer.
- While the message cannot go, Enter does nothing. While an input method
  composes a word, Enter belongs to the input method.
- Reason: one key rule in every composer is easier to learn, and the chat
  already uses it.
- A different key rule on the page or in the dialog was rejected for that
  reason. Cmd+Enter or Ctrl+Enter in every composer was rejected, because
  it changes the key that users know from the chat.

## The create

- The app accepts the first message before the sandbox is ready, as
  [Chat and events](chat-and-events.md#messages) says.
- The create answers when the workspace and its first message are stored,
  before the sandbox starts (decision 91). The answer holds the workspace,
  its session ID, and the queued first message, so that the new workspace
  can show the live start steps.
- Reason: the new workspace then follows its start steps on its own
  events, as a resume does. A stream of the progress in the create request
  was rejected, and so was a failed create that stays as a workspace in
  the error state, because each is a larger build.

## The branch and the name

- A new workspace starts from the newest good org image. It then creates
  its branch in the folder of its repository.
- When the GitHub repository has no refs, such as branches or tags, the
  start first pushes an empty first commit to the default branch of the
  repository (decision 89). It then fetches that branch and creates the
  workspace branch from it.
- The push uses the GitHub user token of the sender of the current turn,
  as [GitHub tokens](access-and-security.md#github-tokens) says. No
  command and no Git config holds the token.
- A repository with any ref gets no first commit from the app.
- When another push reaches the repository first, the start keeps that
  push and fetches the default branch. The app never force-pushes.
- When the app cannot read the refs of the repository, or when the push
  fails and the repository stays empty, the start fails.
- Reason: the workspace branch starts from the default branch, and the
  Changes list compares with it, so that branch must exist on GitHub. A
  branch or a first commit only in the sandbox was rejected for that
  reason, and a refused start because it blocks work in a new repository.
- The branch name starts with the GitHub login that the workspace owner has
  at the create (decision 53).
- A city name and four random characters follow, such as
  `calummoore/lisbon-7k2q`.
- Reason: a GitHub login is unique, so the branches of each person stay
  together. A first name was rejected, because two people can share one.
- The workspace name starts as the city name.
  [Chat and events](chat-and-events.md#messages) says how the agent's title
  then renames it.

## A failed first start

- When the sandbox of a new workspace does not start, the workspace does
  not stay. The events of the workspace first show the failed start and
  the error state. The app then removes the workspace and its token.
- The first message then goes back to the composer of the tab that sent
  it, and Try again sends it again. No failure loses the message or its
  attachments.
- Try again creates the workspace with a new workspace ID. The message
  keeps its message ID.
- The first message is the only message that a new workspace accepts
  before its first start succeeds, as
  [Messages](chat-and-events.md#messages) says (decision 130). So the
  removal of a failed workspace loses no accepted message.
- After the removal, only the member who sent the first message can still
  get the events of the failed workspace. That member gets the stored
  events once, and the connection then closes.
