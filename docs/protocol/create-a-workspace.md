# Create a workspace

This doc holds the requirements and the decisions in force for the create
of a workspace. It covers New workspace, as a page or as a dialog, the
preference that chooses between them, its Capabilities icon, the create,
the branch, and a failed first start. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script.
[New workspace notices](new-workspace-notices.md) covers the notices that
keep Send and Create off.
[Life of a workspace](workspace-life.md) covers the start steps and the
rest of the life of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## New workspace

- The New workspace page is an empty chat with a repository picker. The
  first message creates the workspace.
- New workspace opens as this page or as a dialog over the current screen.
  A preference of the user chooses which. Reason: the user asked for both
  ways.
- [The message field](workspace-links.md#the-message-field) says how the
  message field of the page and of the dialog shows a workspace link.
- The page and the dialog have a small Capabilities icon, with its label
  on hover (secrets decision 6 G). Its control chooses the secrets that
  the new workspace pre-approves, and its Mac access.
  [Capabilities](secrets.md#capabilities) states the control.

### The preference

- The Account page has three tabs, General, Preferences, and Keyboard
  shortcuts, each with its own address. Preferences holds the New
  workspaces section, with Model and effort and the choice of how New
  workspace opens (decision 142 of PR #73). General holds the other
  sections of the account.
  [Keyboard shortcuts: the settings tab](keyboard-shortcuts-tab.md) gives
  the third tab.
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
  as the dialog. The user asked for the dialog as the default for new
  users on 12 November 2026.
- Each account that existed before that change keeps the page, as its
  saved choice. Reason: the user asked for the new default for new users
  only. A default that also moved the existing accounts to the dialog was
  rejected, because their New workspace would change without their choice.
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

### The dialog

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
  [A failed first start](#a-failed-first-start) says.
- When the dialog opens, the message field gets the focus. When the dialog
  closes and the screen stays, the focus goes back to the control that
  opened it. When another screen opens, that screen takes the focus.

### The send key

- On a computer, Enter sends the message from every composer, and
  Shift+Enter adds a line (decision 143 of PR #73). The composers are the
  chat of a workspace, the New workspace page, and the dialog. The message
  box of the [Feedback dialog](feedback.md#the-dialog) is a composer too.
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

### Before the first good build

- [Before the first good build](new-workspace-notices.md#before-the-first-good-build)
  states the notice of New workspace while the org has no good image.

### Waiting repositories

- [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  states the picker and the notice of a repository that waits for its
  build.

## The create

- The app accepts the first message before the sandbox is ready, as
  [Chat and events](messages-and-attachments.md#messages) says.
- The create answers when the workspace and its first message are stored,
  before the sandbox starts (decision 91). The answer holds the workspace,
  its session ID, and the queued first message, so that the new workspace
  can show the live start steps.
- Reason: the new workspace then follows its start steps on its own
  events, as a resume does. A stream of the progress in the create request
  was rejected, because it is a larger build.
- The create takes the choices of the Capabilities control with the first
  message: the pre-approved secrets and Mac access. Without a choice, the
  new workspace pre-approves no secret, and its Mac access is on
  (secrets decision 9 A).

## The branch and the name

- A new workspace starts from the newest good org image. It then creates
  its branch in the folder of its repository.
- The run of a pull request creates its branch from that pull request, as
  [The branch of a pull request run](base-branches.md#the-branch-of-a-pull-request-run)
  says (decision 505 A).
- When the GitHub repository has no refs, such as branches or tags, the
  start first pushes an empty first commit to the default branch of the
  repository (decision 89). It then fetches that branch and creates the
  workspace branch from it.
- The push uses the GitHub user token of the sender of the current turn,
  as [GitHub tokens](tokens-and-secrets.md#github-tokens) says. No
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
  `calummoore/lisbon-7k2q`. The branch keeps the city name when the
  workspace gets a name.
- Reason: a GitHub login is unique, so the branches of each person stay
  together. A first name was rejected, because two people can share one.
- The new branch of [Continue](continue.md#the-base-and-the-new-branch)
  follows the same rule, with the GitHub login that the workspace owner has
  at the Continue.
- A new workspace has no name, and the app shows "Untitled" in its place,
  as [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says (decision 182).
- A create call of an agent can give the workspace a name, as
  [Create and list calls](agent-tools.md#create-and-list-calls) says.
- [Messages](messages-and-attachments.md#messages) says how a title from
  the first message then names the workspace.

## A failed first start

- When the sandbox of a new workspace does not start, the workspace stays
  in the error state with Try again (decision 130).
- Every member of the org sees the failed workspace, the cause of the
  failure, its chat, and its queued messages. No failure loses an accepted
  message or its attachments.
- Reason: every member then keeps the cause and each accepted message. A
  removal of the failed workspace was rejected, because it gave back only
  the first message, and only to the tab that sent it.
- When the start fails, its workspace token stops working. The app deletes
  the sandbox of the failed start.
- Try again starts a new sandbox for the same workspace and branch, with a
  new workspace token (decision 130). The sandbox starts from the newest
  good org image, with the current startup script and env vars.
- When that sandbox is ready, the agent gets the queued messages, as
  [Messages](messages-and-attachments.md#messages) says.
- A routine run keeps its failed workspace and its cause, as
  [Failed runs](routine-runs.md#failed-runs) says (decision 512 B).
