# Agent instructions

This doc holds the requirements and the decisions in force for the
instructions that the app gives each agent session. It covers the facts
and the guidance in them, the sender line and the branch line of each
message, and the skills of a message.
[Session instructions](session-instructions.md) states how a session keeps
its instructions and how each agent gets them.
[Base prompts](base-prompts.md) states the base prompt of Claude
agents. [Agents and sessions](agents-and-sessions.md#agents) states the
agents and their sessions. [Agent tools](agent-tools.md) states the tools
of the agents. The other terms are those of the
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
  - The workspace tools create, list, get, rename, move, and archive the
    workspaces of the org. In each workspace of the org, they also start,
    list, get, rename, close, and stop sessions, send and get messages,
    read a chat, and list, open, and close previews. They also create and
    delete the sections of the org, and ask to run a command on the Mac of
    the sender of the turn.
  - A message that ends with a `Sent by:` line comes from an agent of the
    session that the line links to, through the workspace tools.
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
- The sender line gives the display name, the GitHub login, and the
  member ID of the member who sent the message (decision 283). For a
  member without a display name, it gives only the GitHub login and the
  member ID.
- Reason: several members can write in one session while the starter
  shares the login (decision 116). So the agent needs to know who sent
  each message.
- A message that joins a running turn gives its own sender, who can
  differ from the sender of the turn.
- Reason for the member ID: the owner filter of the
  [workspace list](workspace-calls.md#list-the-workspaces) takes a member
  ID, and a GitHub login can name two members after a GitHub rename.
- The sender line of a message from the workspace tools names the sender
  of the turn that made the call, as
  [The sender](session-calls.md#the-sender) says.
- The sender line exists only in the text that reaches the agent. The
  stored message, the chat, and the titles from messages never hold it.
- The chat never shows the sender line or the agent instructions. Reason:
  they are for the agent.

### Access

- The sender line informs the agent only. No access depends on it, also
  not on its member ID. The same holds for a `Sent by:` line, as
  [The `Sent by:` line](session-calls.md#the-sent-by-line) says.
- A Mac command of a turn goes to the Mac of the sender of the turn, the
  member whose message started the turn. The GitHub token of the turn also
  belongs to that member, as
  [GitHub tokens](github-tokens.md) says. The commits of the turn name that
  member too, as [Commit author](github-tokens.md#commit-author) says.
- A message that another member sends during the turn changes none of
  them.
- Each write of the workspace tools acts for the sender of the turn too,
  also while the agent answers a message of another member, as
  [The sender](agent-tool-access.md#the-sender) says.
- Reason: the Worker takes the sender of a Mac command, a Git operation,
  or a write of the tools from its own record of the turn.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  this rule. Agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- Risk: a member can type a false sender line in a message, also with a
  false member ID. The agent can then name the wrong member, or list the
  workspaces of another member. No access changes, because each write
  keeps the rights of the sender of the turn.

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

## Skills of a message

- A message can hold skill texts, such as `/plans`, as
  [The stored text](skill-mentions.md#the-stored-text) says. The runner
  gives each skill of the message in the form of the agent that runs the
  message (skill list decision 2).
- A skill of the message is a skill text that names a skill of the list of
  that agent. Every other `/` text, and a skill text in inline code or in
  a code block, reaches the agent as text only.
- Claude gets the text of the message unchanged. Claude runs a skill that
  the text names as `/name`, also after the sender line and the branch
  line.
- Codex gets the text of the message unchanged too. Beside the text, it
  gets one skill input for each skill of the message. The skill input
  gives the name of the skill and the absolute path of its `SKILL.md`, as
  the Codex list of the runner gives it.
- Reason: the skill input names the exact skill, and the text of each
  agent stays the stored text. The text `$name` for Codex was not chosen,
  because the text that Codex gets would then differ from the stored text.
- A skill chip whose skill is not in the list of the agent of the send
  reaches that agent as the text `/name`, with no skill input.
- Risk: Codex drops a skill input whose path names no skill, with no
  error. So a skill that moves after the latest list does not run.
- How Claude runs a manual-only skill, whose `SKILL.md` sets
  `disable-model-invocation: true`, is not decided yet.
- The skill inputs exist only in the input of the agent, as the sender
  line does. The stored message, the chat, and the titles from messages
  hold the stored text.

## Session instructions

[Session instructions](session-instructions.md) states that a session
keeps the same agent instructions for its whole life, and how Claude and
Codex each get them.

## Base prompts

[Base prompts](base-prompts.md) states the short base prompt of the app
that a Claude agent gets before the agent instructions, and the base
instructions of a Codex agent.
