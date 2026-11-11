# Agent instructions

This doc holds the requirements and the decisions in force for the
instructions that the app gives each agent session. It covers the facts
and the guidance in them, and the sender line and the branch line of each
message. [Base prompts](base-prompts.md) states the base prompt of Claude
agents. [Agents and sessions](agents-and-sessions.md#agents) states the agents and
their sessions. [Agent tools](agent-tools.md) states the tools of the
agents. The other terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

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
  - The workspace tools create and list the workspaces of the org. They
    also start a session, list the sessions, send a message, and read a
    chat, in each workspace of the org. They
    also ask to run a command on the Mac of the sender of the turn.
  - A message that ends with a `Sent by:` line comes from an agent of the
    session that the line links to, through the workspace tools.
  - Several members can write in one session. The sender line of each
    message names its sender.
- Reason for the desktop guidance: the computer tools follow the rules of
  a person's own computer, and these rules ask the user before foreground
  input. No member watches this desktop, because the app hides Desktop.
  Agents that decide from each refusal of a tool were rejected, because
  they spend calls on background input or ask a member. A guide that names
  each computer tool was rejected, because the provider can change them.
- The instructions never tell the agent to send a member to a tool that
  the app hides, such as Desktop. [Desktop](workspace-tools.md#desktop)
  says why the app hides it.
- The instructions do not ask the agent to show a screenshot in a reply.
  Reason: the chat shows the Markdown of an image as text, as
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

## The sender line

- Each message that reaches the agent starts with a sender line. This
  holds also for each message during a turn, and for each message of the
  starter.
- The sender line gives the display name and the GitHub login of the
  member who sent the message. For a member without a display name, it
  gives only the GitHub login.
- Reason: several members can write in one session while the starter
  shares the login (decision 116). So the agent needs to know who sent
  each message.
- The sender line of a message from the workspace tools names the sender
  of the turn that made the call, as
  [The sender](session-calls.md#the-sender) says.
- The sender line exists only in the text that reaches the agent. The
  stored message, the chat, and the titles from messages never hold it.
- The chat never shows the sender line or the agent instructions. Reason:
  they are for the agent.

### Access

- The sender line informs the agent only. No access depends on it. The
  same holds for a `Sent by:` line, as
  [The `Sent by:` line](session-calls.md#the-sent-by-line) says.
- A Mac command of a turn goes to the Mac of the sender of the turn, the
  member whose message started the turn. The GitHub token of the turn also
  belongs to that member, as
  [GitHub tokens](github-tokens.md) says. The commits of the turn name that
  member too, as [Commit author](github-tokens.md#commit-author) says.
- A message that another member sends during the turn changes none of
  them.
- Reason: the Worker takes the sender of a Mac command or a Git operation
  from its own record of the turn.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  this rule. Agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- Risk: a member can type a false sender line in a message. The agent can
  then name the wrong member, but no access changes.

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
- A session that started without agent instructions can get them once, at
  a later turn. It then keeps that text.
- Apart from the branches, the instructions hold no fact that changes
  during the work, such as the date, the Git state, or the pull request
  state. The agent reads such facts with its tools.
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

- Claude and Codex get the same agent instructions, each as its own system
  instructions. Reason: the app offers both agents (decision 19), and each
  agent takes system instructions.
- An agent without system instructions gets the agent instructions at the
  start of its first message.
- Reason: system instructions keep their weight for the whole session,
  also after the agent summarizes a long conversation.
- The agent runner in the sandbox builds the agent instructions.
- These ways were rejected:
  - A block in the first message of each session. A summary of a long
    conversation can shorten or drop it, and it has less weight than
    system instructions.
  - Instruction files in the home folder of the agents. They have less
    weight than system instructions, and Claude must then load the user
    settings.
  - An instruction file in the repository folder. Codex reads one such
    file in each folder, so the file would hide the repository's own agent
    rules.
  - Hooks that add the text at the start of a session and after a summary.
    The agent gives such text the weight of a user message, and each hook
    must skip the resume at each turn.
  - Instructions that the Worker builds and sends with each turn. The text
    of a session would then change with each fact. Each message carries
    only the current branches, for the branch line.
  - Text that a model gateway adds to each model request. No such gateway
    exists yet.
  - Text for Claude only. It leaves out Codex, which also takes system
    instructions.
- A subagent of a Claude agent gets neither the base prompt nor the agent
  instructions. Reason: the agent SDK sets the system instructions of the
  main agent only.
- Risk: such a subagent does not know the rule that keeps the branch name.

## Base prompts

[Base prompts](base-prompts.md) states the base prompt that a Claude
agent gets before the agent instructions, and the base instructions of
a Codex agent.
