# Agent instructions

This doc holds the requirements and the decisions in force for the
instructions that the app gives each agent session. It covers the facts
and the guidance in them, and the sender line and the branch line of each
message. [Base prompts](base-prompts.md) states the base prompt of Claude
agents. [Agents and sessions](agents-and-sessions.md#agents) states the
agents and their sessions. [Agent tools](agent-tools.md) states the tools
of the agents. The other terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A secrets decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. A stop diagnostics decision number
names a decision of the change that adds the
[runner warnings](runner-warnings.md), as that doc says. A parent-move
decision number names a decision of the change that adds
[parent changes](parent-changes.md), as that doc says.

## Terms

- **Agent instructions:** the text that the app gives each agent session
  apart from the messages. It holds the facts of the workspace and the
  guidance for the tools of the product.
- **System instructions:** the text that an agent takes before its
  conversation, apart from the messages.
- **Sender line:** one line at the start of each message to the agent. It
  names the member who sent that message.
- **Workspace branch:** the branch that the Worker's record of the
  workspace names. The app tracks this branch. Continue changes it after a
  merge.
- **Target branch:** the base branch of the workspace, as
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  says. For a workspace that a member creates, it is the default branch of
  the repository.
- **Branch line:** one line after the sender line of a message. It names
  the current workspace branch and the current target branch.
- **Base prompt:** the general rules for work that a Claude agent gets
  before the agent instructions.

## What the instructions hold

- The agent instructions hold these facts:
  - The agent works in a workspace of Conductive. A workspace has its own
    cloud computer and one branch at a time. It can hold one task after
    another.
  - The folder of the workspace's repository, and the folder of each other
    repository in the cloud computer, as
    [Repository folders](repository-folders.md) says.
  - The absolute path of the context folder (decision 243). Git ignores
    this folder, and attached files arrive in its attachments folder, as
    [The context folder](repository-folders.md#the-context-folder) says.
  - The workspace branch and the target branch.
  - The ID and the link of the workspace.
  - Whether the workspace is a [top-level workspace](sub-workspaces.md#terms)
    or a sub-workspace. For a sub-workspace, its depth, and the ID and the
    link of its parent.
  - The [deepest depth](sub-workspaces.md#the-depth-limit) of a sub-workspace.
- The instructions also give this guidance:
  - The agent keeps notes, screenshots, and files for other sessions of the
    workspace in the context folder.
  - The agent keeps the name of the workspace branch, unless a member asks
    for a rename.
  - The target branch is the base of the diffs and the pull requests of
    the workspace.
  - The computer tools do browser work on the desktop of the cloud
    computer, when the agent has them.
  - No person uses that desktop. So the agent may bring a window to the
    front and use foreground input without asking.
  - Other sessions of the workspace share that desktop.
  - A member opens a port preview in the app by its port number.
  - Every agent of the workspace runs inside the service
    `conductive-runner.service` of the cloud computer. A stop or a restart
    of that service ends each running turn of each session.
  - `sudo journalctl -u conductive-runner.service` shows the cause of a
    stop of that service.
  - The workspace tools create, list, get, rename, move, and archive the
    workspaces of the org. In each workspace of the org, they also start,
    list, get, rename, close, and stop sessions, send and get messages,
    read a chat, and list, open, and close previews. They also create and
    delete the sections of the org, and ask to run a command on the Mac of
    the sender of the turn. They also list the secrets of the org, and run
    a command with secrets, as [Secret requests](secret-requests.md) says.
  - The agent nests a new workspace under this workspace when the work
    belongs to the task of this workspace. It makes a top-level workspace
    for other work. [When to nest](sub-workspaces.md#when-to-nest) gives
    the cases.
  - To nest a new workspace under this workspace, the agent passes the ID
    of this workspace as the parent of the create call.
  - At the deepest depth, the agent creates a sibling in place of a
    sub-workspace, with the [sibling advice](sub-workspaces.md#the-sibling-advice).
  - `get_workspace` gives the parent and the sub-workspaces of a
    workspace. `list_workspaces` with a parent lists the sub-workspaces of
    one workspace.
  - `move_workspace` with a target changes the parent of a workspace. A
    move can change the parent and the depth of this workspace, and
    `get_workspace` gives the current ones.
  - A message that ends with a `Sent by:` line comes from an agent of the
    session that the line links to, through the workspace tools.
  - The agent names a file or a folder of the repository in a chat reply
    as `@` and its path inside the repository, such as `@src/app.ts` or
    `@src/app.ts:42`. The chat shows each one as a file chip, as
    [Files in answers](file-mentions.md#files-in-answers) says (answer
    chip decision 1).
  - In commits, pull requests, issues, and files, the agent writes paths
    in backticks. Reason: GitHub reads `@` and a name as a mention of a
    person or a team, and notifies them.
  - Several members can write in one session. The sender line of each
    message names its sender, with the member ID of that member.
  - The agent gives the member ID of a sender to the owner filter of the
    workspace list, for the workspaces of that member. Member IDs are for
    the arguments of the tools. An answer to a member names a member by
    name, not by member ID.
- Reason for the desktop guidance: the computer tools follow the rules of
  a person's own computer, and these rules ask the user before foreground
  input. No member watches this desktop, because the app hides Desktop.
  Agents that decide from each refusal of a tool were rejected, because
  they spend calls on background input or ask a member. A guide that names
  each computer tool was rejected, because the provider can change them.
- Reason for the service guidance: work of one agent can stop or restart
  that service, and so end the turns of every session. The chat then shows
  "The agent stopped" with no cause, as
  [Messages](messages-and-attachments.md#messages) says. The journal gives
  the agent that cause (stop diagnostics decision 4 A).
- An existing session keeps its saved instructions, and gets no later
  change of the instructions, as
  [The same text for the life of a session](#the-same-text-for-the-life-of-a-session)
  says.
- When an older or manual runner start lacks the link or the depth of the
  workspace, the runner warns and continues. Its instructions then leave
  out the workspace ID, link, depth, parent, and deepest depth, and the
  guidance on sub-workspaces, also the cases of when to nest. They never call such a workspace top-level.
- The instructions never tell the agent to send a member to a tool that
  the app hides, such as Desktop. [Desktop](workspace-tools.md#desktop)
  says why the app hides it.
- The instructions do not ask the agent to show a screenshot in a reply.
  Reason: the chat shows no picture in an answer. The Markdown of an image
  of a file of the workspace shows as a link that opens the file, as
  [Chat Markdown](chat-markdown.md#formatting) says.
- The instructions hold no secret, such as the workspace token or an agent
  login.
- The instructions follow the naming rules of user-facing text, as
  [Names in the product](agents-and-sessions.md#names-in-the-product) and
  [The provider](workspaces-and-sandboxes.md#the-provider) say. So they
  never name Boat, and they never use "Claude Code" as a name of the
  product.
- Reason: the agent can repeat the instructions in the chat.

### The branches

- The instructions take the workspace branch from the Worker's record of
  the workspace. They do not take the current branch in the cloud
  computer.
- Reason: the app tracks the branch of its record, and the Git branch in
  the cloud computer can change.
- When an older or manual runner start has no workspace branch, the
  runner warns and continues. Its instructions name no workspace branch.
  They never substitute the current Git branch for the missing fact.
- The app finds the pull request of a workspace by the name of its branch.
  It also routes the GitHub events of the workspace by that name, as
  [State of a branch](github-banner.md#state-of-a-branch) says. After a
  rename, the pull request bar no longer follows the work. This is the
  reason for the rule that keeps the branch name.
- A Git guard that refuses a rename of the branch was rejected. It covers
  one fact only, and it adds a refusal that no user asked for.
- After a merge, [Continue](continue.md) moves the workspace to a new
  branch. The Worker's record then names the new branch, and the pull
  request bar follows it. Continue is a branch change of the app, not a
  rename by the agent.

### The parent and the depth

- A [parent change](parent-changes.md) changes the parent and the depth of
  a workspace, and the depth of each workspace under it.
- The instructions still hold the parent and the depth (parent-move
  decision 2 A). They also say that a move can change them, and that
  `get_workspace` gives the current ones. The sub-workspaces change too,
  so the instructions name the calls that list them.
- Accepted cost: a running session keeps the parent and the depth of its
  instructions. A new session gets the parent and the depth of the last
  start of the cloud computer.
- These ways were rejected (parent-move decision 2), because the user
  chose the smallest change:
  - A tree line in each message with the current parent and depth, as
    [the branch line](#the-branch-line) of decision 227.
  - Instructions without the parent and the depth, so that each agent
    reads them with `get_workspace`.

## The sender line

[The sender line](agent-instructions-sender-line.md#the-sender-line)
states the sender line of each message to the agent.

### Access

[Access](agent-instructions-sender-line.md#access) states the access of a
turn, which does not depend on the sender line.

## The branch line

- The Worker sends the current workspace branch and the current target
  branch with each message (decision 227).
- When the agent instructions of a session name an earlier workspace
  branch or an earlier target branch, each message to the agent gets a
  branch line after its sender line. The line names the current branches.
- A session whose instructions name the current branches gets no branch
  line. A new session gets the current branches in its instructions.
- The branch line exists only in the text that reaches the agent, as the
  sender line does. The chat never shows it.
- Reason: after Continue, each session keeps its context and its
  instructions. The line reaches every session in each message, also after
  a summary and in a session that starts later, and the instructions keep
  their text and their prompt cache.
- These ways were rejected (decision 227):
  - One line only in the next message of each session. A later summary can
    drop it.
  - New instructions for each session at Continue. They rewrite the prompt
    cache, and each agent must restart to read them.
  - Only the note of Continue in the chat. The instructions then keep the
    earlier branch.

## The same text for the life of a session

- A session keeps the same agent instructions for its whole life. A Claude
  session also keeps the same base prompt.
- This holds across each turn, each stop and resume of the sandbox, and
  each restart of the agent runner.
- This holds also when a fact, the wording of the instructions, or the
  base prompt changes later. An example is a new default branch of the
  repository at a later resume.
- A new session gets the instructions with the current facts and wording.
  The parent and the depth are the exception, as
  [The parent and the depth](#the-parent-and-the-depth) says.
- A session that started without agent instructions can get them once, at
  a later turn. It then keeps that text.
- Apart from the branches, the parent, and the depth, the instructions
  hold no fact that changes during the work, such as the date, the Git
  state, or the pull request state. The agent reads such facts with its
  tools.
- Reason: a change of the text rewrites the prompt cache of the
  conversation. An agent can also keep the first instructions of a session
  until it summarizes the conversation.
- The workspace branch and the target branch can change, by Continue or
  by a new default branch. The instructions keep the branches of the start
  of the session, and [the branch line](#the-branch-line) names the
  current branches.
- A tool that returns facts that change, such as the pull request state,
  was rejected. It widens what the workspace token allows, and agents still
  need instructions to call it.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.

## How each agent gets them

[How each agent gets them](agent-instructions-delivery.md) states how
Claude and Codex get the agent instructions, and the ways that were
rejected.

## Base prompts

[Base prompts](base-prompts.md) states the short base prompt of the app
that a Claude agent gets before the agent instructions, and the base
instructions of a Codex agent.
