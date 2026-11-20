# Create a workspace

This doc holds the requirements and the decisions in force for the create
of a workspace. It covers New workspace, as a page or as a dialog, the
preference that chooses between them, its Capabilities icon, the create,
the branch, and a failed first start. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script.
[New workspace notices](new-workspace-notices.md) covers the notices that
keep Send and Create off.
[The New workspace dialog](new-workspace-dialog.md) covers when the dialog
opens, and the dialog.
[Life of a workspace](workspace-life.md) covers the start steps and the
rest of the life of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. A branch-name decision number
names a decision of the change that names a branch after its workspace.
The pull request of that change keeps its record.

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

- The Account page has five tabs, General, Agents, Preferences, Keyboard
  shortcuts, and Stats, each with its own address. Agents holds the logins
  of Claude and Codex (the user asked on 13 November 2026). General holds
  the other sections of the account.
  [Keyboard shortcuts: the settings tab](keyboard-shortcuts-tab.md) gives
  the fourth tab. [Account stats](account-stats.md) gives the fifth tab.
  The Mac app adds [This Mac](desktop-commands.md#saved-choices) as the
  sixth tab.
- Preferences starts with the Favourites section, which
  [Model favourites](model-favourites.md#the-favourites-section) states.
  The New workspaces section follows, with Model and effort and the choice
  of how New workspace opens (decision 142 of PR #73).
- Reason: all the settings of new workspaces then sit together. The
  section on General, with only the new choice on Preferences, was
  rejected, because the user then looks in two places.
- Model and effort also saves fast mode, with the Fast switch of its menu.
  New workspace starts from the saved choice with its fast mode, as
  [Fast mode](fast-mode.md#saved-defaults-new-workspaces-and-automations)
  says.
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

- [Page or dialog](new-workspace-dialog.md#page-or-dialog) states when New
  workspace opens the page, and when it opens the dialog.

### The dialog

- [The dialog](new-workspace-dialog.md#the-dialog) states the parts of the
  dialog, its draft, its close, and its create.

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
  new workspace pre-approves no secret, and its Mac access is off
  (secrets decision 18 A).

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
