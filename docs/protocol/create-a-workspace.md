# Create a workspace

This doc holds the requirements and the decisions in force for the create
of a workspace. It covers New workspace, as a page or as a dialog, the
preference that chooses between them, the create, the branch, and a failed
first start. This doc belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script.
[Continue a branch](continue-a-branch.md) covers a new workspace on an
existing branch. [Life of a workspace](workspace-life.md) covers the start
steps and the rest of the life of a workspace. The terms are those of the
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

[New workspace as a dialog](new-workspace-dialog.md) gives the parts of the
dialog, its notices, its close, its draft, the create, and its focus.

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

[New workspace build notices](new-workspace-build-notices.md#before-the-first-good-build)
gives the notice while the org has no good image, its link for an admin,
and the refused create.

### Waiting repositories

[New workspace build notices](new-workspace-build-notices.md#waiting-repositories)
gives the waiting repositories in the picker, their notice, its link for an
admin, and the refused creates.

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
- New branch is the default. The person can choose an existing branch or
  an open pull request instead, as [Continue a branch](continue-a-branch.md)
  says (import decision 1). The workspace then continues that branch,
  with the name that the branch has on GitHub.
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
- The name of a new branch starts with the GitHub login that the workspace
  owner has at the create (decision 53).
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

## Imported workspaces

- An import from Conductor creates a workspace with no first message and
  no cloud computer. Its first start is its activation, as
  [Imported workspaces](imported-workspaces.md) says.
