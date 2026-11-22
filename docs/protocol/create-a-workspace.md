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
[secrets](secrets.md), as that doc says. A branch-name decision number
names a decision of the change that names a branch after its workspace.
The pull request of that change keeps its record.

Three linked pages belong to this doc.
[Create a workspace: the preference](create-a-workspace-preference.md)
holds the preference that chooses between the page and the dialog.
[Create a workspace: the dialog](create-a-workspace-dialog.md) holds the
dialog. [Start from a branch](start-from-a-branch.md) holds a start from a
branch that is not the default branch.

## New workspace

- The New workspace page is an empty chat with a repository picker and a
  branch control. The first message creates the workspace.
- New workspace opens as this page or as a dialog over the current screen.
  A preference of the user chooses which. Reason: the user asked for both
  ways.
- [The message field](workspace-links.md#the-message-field) says how the
  message field of the page and of the dialog shows a workspace link.
- The page and the dialog have a small Capabilities icon, with its label
  on hover (secrets decision 6 G). Its control chooses the secrets that
  the new workspace pre-approves. In the Mac app, it also has the Mac
  access switch of this Mac. [Capabilities](secrets.md#capabilities)
  states the control.

### The preference

- [Create a workspace: the preference](create-a-workspace-preference.md)
  holds the requirements of the preference that chooses between the page
  and the dialog: the tabs of the Account page, the save of the choice,
  and its default.

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

- [Create a workspace: the dialog](create-a-workspace-dialog.md) holds the
  requirements of the dialog: its parts, its section, its notices, its
  close, and its draft.

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
- The create takes the pre-approved secrets of the Capabilities control
  with the first message. Without a choice, the new workspace pre-approves
  no secret. In the Mac app, the Mac access switch starts the grant of the
  new workspace after the create, as
  [In New workspace](mac-access.md#in-new-workspace) says.

## Start from a branch

- New workspace can start a workspace from a branch that is not the
  default branch. The workspace then makes its own branch from the picked
  branch (decision 298), and the member chooses its target (decision 301).
- [Start from a branch](start-from-a-branch.md) holds the requirements of
  the branch control, its dropdown, and the target choice (decision 305). It
  also holds the branch check of a create and its refusals (decision 303).

## The branch and the name

- A new workspace starts from the newest good org image. It then creates
  its branch in the folder of its repository, from the newest commit of
  its start branch on GitHub.
- The start branch is the default branch of the repository, unless the
  create names another branch, as
  [Start from a branch](start-from-a-branch.md) says.
- The run of a pull request creates its branch from that pull request, as
  [The branch of a pull request run](base-branches.md#the-branch-of-a-pull-request-run)
  says (decision 505 A).
- When the GitHub repository has no refs, such as branches or tags, the
  start first pushes an empty first commit to the default branch of the
  repository (decision 89). It then fetches that branch and creates the
  workspace branch from it.
- The start pushes no first commit to a branch that is not the default
  branch. Reason: a typo must not make a branch on GitHub.
- The push uses the GitHub user token of the sender of the current turn,
  as [GitHub tokens](tokens-and-secrets.md#github-tokens) says. No
  command and no Git config holds the token.
- A repository with any ref gets no first commit from the app.
- When another push reaches the repository first, the start keeps that
  push and fetches the default branch. The app never force-pushes.
- When the app cannot read the refs of the repository, or when the push
  fails and the repository stays empty, the start fails.
- Reason: in an empty repository, the workspace branch starts from the
  default branch. The Changes list compares with it, so that branch must
  exist on GitHub. A branch or a first commit only in the sandbox was
  rejected for that reason, and a refused start because it blocks work in
  a new repository.
- The branch name starts with the GitHub login that the workspace owner has
  at the create (decision 53).
- A city name and four random characters follow, such as
  `calummoore/lisbon-7k2q`. This is the placeholder branch.
- Reason: a GitHub login is unique, so the branches of each person stay
  together. A first name was rejected, because two people can share one.
- When the workspace gets a name before the start creates the branch in
  the sandbox, the branch takes the name (branch-name decision 1 A). The
  name can be the automatic title, a name from Rename, or a name from a
  create call. The branch keeps its GitHub login and its four random
  characters, such as `calummoore/saved-carts-7k2q` (branch-name decision
  2 A).
- After the start creates the branch, a new name never changes the
  branch.
- Reason: the branch then gets a name that says what the work is, with no
  Git rename, no GitHub rename, and no change under a running agent. A
  rename of an existing branch was rejected. It must wait for each turn,
  and GitHub closes an open pull request when its head branch gets a new
  name.
- A title that comes after the start created the branch names only the
  workspace. The branch keeps the city name. This happens when the model
  is slow or fails, or when the first message has no text.
- Reason: the start does not wait for the title.
- The name part of the branch has only the letters `a` to `z`, the digits,
  and single hyphens. The app removes accents and makes letters
  lowercase. Each other run of characters becomes one hyphen. The part
  has no hyphen at its start or at its end, and at most 40 characters. A
  longer part ends at its last hyphen within the limit.
- When no letter or digit remains, the branch keeps the city name.
- Reason: Git limits the characters of a branch name, and a short name
  fits the pull request bar.
- Two workspaces with the same name get two branches, because the random
  characters differ.
- Reason: the app finds the pull request of a workspace and routes its
  GitHub events by the name of its branch. A clean name with a check for a
  clash was rejected. It needs a read from GitHub, and two creates can
  race.
- A workspace keeps its branch from before branch-name decision 1.
- The new branch of [Continue](continue.md#the-base-and-the-new-branch)
  starts with the GitHub login that the workspace owner has at the
  Continue. It takes the workspace name and a version, as that section
  says.
- A new workspace has no name, and the app shows "Untitled" in its place,
  as [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says (decision 182).
- A create call of an agent can give the workspace a name, as
  [Create and list calls](agent-tools.md#create-and-list-calls) says.
- [The title of a new workspace](workspace-and-session-names.md#the-title-of-a-new-workspace)
  says how a title from the first message then names the workspace.

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
- An automation run keeps its failed workspace and its cause, as
  [Failed runs](automation-runs.md#failed-runs) says (decision 512 B).
