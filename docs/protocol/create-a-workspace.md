# Create a workspace

This doc holds the requirements and the decisions in force for the create
of a workspace. It covers New workspace, as a page or as a dialog, the
preference that chooses between them, the create, the branch, and a failed
first start. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script.
[Life of a workspace](workspace-life.md) covers the start steps and the
rest of the life of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## New workspace

- The New workspace page is an empty chat with a repository picker. The
  first message creates the workspace.
- New workspace opens as this page or as a dialog over the current screen.
  A preference of the user chooses which. Reason: the user asked for both
  ways.
- [The message field](workspace-links.md#the-message-field) says how the
  message field of the page and of the dialog shows a workspace link.

### The preference

- The Account page has two tabs, General and Preferences, each with its
  own address. Preferences holds the New workspaces section, with Model
  and effort and the choice of how New workspace opens (decision 142 of PR #73).
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
- Reason: links, a reload, and a new tab then keep working.
- On a computer, with the dialog chosen, New workspace opens the dialog
  from each of its places: the row at the top of the list, the button of
  an org without workspaces, the item in the menu of a section, and the
  command palette.
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

- A new workspace needs a good org image, because it starts from the org
  image (decision 13). While the org has no good image, such as during its
  [first build](org-image.md#the-first-build), New workspace
  shows a notice over the composer. Send and Create then stay off
  (decision 150 of PR #92).
- The notice shows the state of the newest build of the org:
  - While a build runs, it says that the cloud computer is being prepared,
    with the time since the build began.
  - After a failed build, it says that the cloud computer did not build.
  - With no build, it says that the cloud computer needs a build.
- After a failed build or with no build, an admin gets a link to the Cloud
  computer tab, which offers Try again or Build computer. A member who is
  not an admin gets no link, and the notice says that an admin can build.
  Reason: only an admin builds (decision 57).
- When a build succeeds, the notice goes, and Send and Create turn on.
- Once the org has a good image, New workspace shows no such notice, also
  during a later build or after a failed later build. New workspaces then
  start from the last good image (decision 9).
- A create that comes while the org has no good image, such as from an old
  tab, gets a refusal. While a build runs, the refusal says that the cloud
  computer is still being prepared. Otherwise, it says that the cloud
  computer needs a build. The composer keeps the message.
- Reason: the user learns the state before the send, in place of a refused
  create. A create that waits for the first build was left out for now
  (decision 152 of PR #92). Such a wait changes the start limit and the path that
  creates every workspace.

### Waiting repositories

- The repository picker lists each chosen repository, on the page and in
  the dialog (decision 240). A removed repository is not in the list.
- A [waiting repository](org-image.md#repository-changes) is off in the
  list, with a note that says when it is ready. The note follows the
  states of [The repository notice](org-image.md#the-repository-notice).
- Reason: the person learns of the wait before the send. A change of only
  the words of the refusal was rejected for that reason.
- The form picks the first ready repository. A kept draft keeps its
  repository, also when it waits. Reason: the form keeps the choice of the
  person.
- While the repository of the form waits, Send and Create stay off. A
  notice over the composer says when the repository is ready, and whether
  the person can choose another repository that is ready.
- When no build runs, an admin gets a link in that notice to the Cloud
  computer tab, which offers Try again or Build computer. While a build
  runs, the notice shows that build with no link, because the admin has
  nothing to do on that tab.
- A member who is not an admin gets no link. When an admin can act, the
  notice tells the member so. Reason: only an admin builds (decision 57).
- When a build that holds the repository succeeds, the repository turns
  on in the picker. Its notice goes, and Send and Create turn on.
- A create in a waiting repository, such as from an old tab, gets a
  refusal that says that the repository is ready after the next build. A
  create in another repository that the org image lacks gets a refusal
  that says that the repository is not available.
- Both refusals have HTTP 404 and the code `repository_not_found`. The
  composer keeps the message.
- A create that waits for the build of its repository was rejected.
  Reason: such a wait changes the start limit and the path that creates
  every workspace, as for decision 152.
- A start that clones a waiting repository after the start from the org
  image was rejected, because the install script never prepares that
  repository.

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

## The branch and the name

- A new workspace starts from the newest good org image. It then creates
  its branch in the folder of its repository.
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
