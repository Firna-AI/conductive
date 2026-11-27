# Agent instructions

This doc holds the requirements and the decisions in force for the
instructions that the app gives each agent session. It covers the facts
and the guidance in them, and the skills of a message.
[Agent instructions: facts that change](agent-instructions-changes.md)
states the facts that can change during a session.
[Message lines](message-lines.md) states the sender line, the repository
line, and the branch line of each message.
[Session instructions](session-instructions.md) states how a session keeps
its instructions and how each agent gets them.
[Base prompts](base-prompts.md) states the base prompt of Claude
agents. [Agents and sessions](agents-and-sessions.md#agents) states the
agents and their sessions. [Agent tools](agent-tools.md) states the tools
of the agents. The other terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A secrets decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. A stop diagnostics decision number
names a decision of the change that adds the
[runner warnings](runner-warnings.md), as that doc says. A screenshot
decision number names a decision of the change that shows the screenshots
of agents as pictures in their answers, as
[File mentions: files in answers](file-mentions-answers.md) says. A
capability prompts decision number names a decision of the change that
tells each agent the capabilities of its session, as
[Capabilities: what agents learn](capabilities-agents.md) says. A code
colours decision number names a decision of the change that colours code
blocks by their fence labels, as [Chat code blocks](chat-code-blocks.md)
says.

## Terms

- **Agent instructions:** the text that the app gives each agent session
  apart from the messages. It holds the facts of the workspace and the
  guidance for the tools of the product.
- **System instructions:** the text that an agent takes before its
  conversation, apart from the messages.
- **Sender line:** one line at the end of each message to the agent. It
  names the member who sent that message.
- **Workspace branch:** the branch that the Worker's record of the
  workspace names. The app tracks this branch. Continue changes it after a
  merge, and a [repository change](repository-change.md) changes it too.
- **Target branch:** the base branch of the workspace, as
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  says. For a workspace that a member creates, it is the target that New
  workspace gives, as
  [The target choice](start-from-a-branch.md#the-target-choice) says.
- **Repository folder:** the folder of the workspace's repository in the
  sandbox, as [Repository folders](repository-folders.md) says. A
  repository change moves the workspace to the folder of another
  repository.
- **Repository line:** one line after the sender line of a message. It
  names the current repository folder.
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
  - The capabilities of the session, when it has some: the secrets that it
    uses with no request, as
    [The capabilities](agent-instructions-changes.md#the-capabilities)
    says.
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
  - When the agent designs or checks an interface in a browser, it saves a
    screenshot of the result as a PNG file in the context folder. It shows
    that screenshot in its reply as a Markdown image (screenshot decision
    1 B).
  - Every agent of the workspace runs inside the service
    `conductive-runner.service` of the cloud computer. A stop or a restart
    of that service ends each running turn of each session.
  - `sudo journalctl -u conductive-runner.service` shows the cause of a
    stop of that service.
  - A server that a member needs after the reply runs as a
    [service](services.md), outside `conductive-runner.service`. The agent
    ends each temporary check server before its reply, as
    [Agent guidance](services.md#agent-guidance) says.
  - The workspace tools create, list, get, rename, move, and archive the
    workspaces of the org. In each workspace of the org, they also start,
    list, get, rename, close, and stop sessions, send and get messages,
    read a chat, and list, open, and close previews. They also create and
    delete the sections of the org, and ask to run a command on the Mac of
    the sender of the turn. They also list the secrets of the org with
    `list_secrets`, and run a command with secrets with
    `run_with_secrets`, as [Secret requests](secret-requests.md) says
    (capability prompts decision 2 A).
  - Before the agent asks a member for a key, a token, or another
    credential, it calls `list_secrets` (capability prompts decision 2 A).
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
  - The workspace tools also watch one turn of a session of the org. The
    instructions give the guidance of
    [Tool descriptions and guidance](session-watches.md#tool-descriptions-and-guidance).
  - The agent names a file or a folder of the repository in a chat reply
    as `@` and its path inside the repository, such as `@src/app.ts` or
    `@src/app.ts:42`. The chat shows each one that names an entry of the
    file tree as a file chip, as
    [Files in answers](file-mentions-answers.md#files-in-answers) says
    (answer chip decision 1).
  - In commits, pull requests, issues, and files, the agent writes paths
    in backticks. Reason: GitHub reads `@` and a name as a mention of a
    person or a team, and notifies them.
  - In a reply, the agent writes the name of the language after the
    opening fence of each code block, such as `rust`, and `text` for
    command output (code colours decision 2 B, 26 November 2026). The
    chat colours the code by that name, as
    [Colours](chat-code-blocks.md#colours) says. Reason: a code block
    without a label shows plain text, so this guidance raises the share of
    coloured blocks. Instructions without this guidance were rejected for
    that reason.
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
- Reason for the screenshot guidance: no member watches the desktop, so
  the screenshot shows the member what the agent saw. The chat shows that
  Markdown image as a picture, as
  [Pictures in answers](file-mentions-answers.md#pictures-in-answers)
  says.
- An agent that reads the saved screenshot, so that an automatic preview
  shows it, was rejected (screenshot decision 1). The chat shows only the
  pictures that the agent picks. A second read also costs tokens.
- Screenshots that the runner takes by itself were rejected, because the
  sessions share one desktop. The screenshot guidance names no computer
  tool, for the reason of the desktop guidance.
- Reason for the secrets guidance: the session can often use the secret
  already, with no request. The agent then does not ask a member for it.
- An existing session keeps its saved instructions, and gets no later
  change of the instructions, as
  [The same text for the life of a session](session-instructions.md#the-same-text-for-the-life-of-a-session)
  says.
- When an older or manual runner start lacks the link or the depth of the
  workspace, the runner warns and continues. Its instructions then leave
  out the workspace ID, link, depth, parent, and deepest depth, and the
  guidance on sub-workspaces, also the cases of when to nest. They never call such a workspace top-level.
- The instructions never tell the agent to send a member to a tool that
  the app hides, such as Desktop. [Desktop](workspace-tools.md#desktop)
  says why the app hides it.
- The instructions hold no secret, such as the workspace token or an agent
  login.
- The instructions follow the naming rules of user-facing text, as
  [Names in the product](agents-and-sessions.md#names-in-the-product) and
  [The provider](workspaces-and-sandboxes.md#the-provider) say. So they
  never name a sandbox provider, and they never use "Claude Code" as a
  name of the product.
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
- A [repository change](repository-change.md) also moves the workspace to
  a new branch, in the folder of another repository. It is a change of
  the app too.

### The parent and the depth

[The parent and the depth](agent-instructions-changes.md#the-parent-and-the-depth)
states how the instructions hold the parent and the depth, which a move
can change.

## The sender line

[The sender line](message-lines.md#the-sender-line) holds the
requirements of the line that names the sender of each message, and
[Access](message-lines.md#access) states the access of a turn, which does
not depend on the sender line.

## The repository line

[The repository line](message-lines.md#the-repository-line) holds the
requirements of the line that names the current repository folder after
a repository change.

## The branch line

[The branch line](message-lines.md#the-branch-line) holds the
requirements of the line that names the current branches.

## Skills of a message

[Skills of a message](skill-input.md) states how each agent gets the
skills that a member names in a message.

## The same text for the life of a session

[Session instructions](session-instructions.md#the-same-text-for-the-life-of-a-session)
states how a session keeps its instructions across turns and changes.

## Session instructions

[Session instructions](session-instructions.md) states that a session
keeps the same agent instructions for its whole life.

## How each agent gets them

[How each agent gets them](agent-instructions-delivery.md) states how
Claude and Codex get the agent instructions, and the ways that were
rejected.

## Base prompts

[Base prompts](base-prompts.md) states the short base prompt of the app
that a Claude agent gets before the agent instructions, and the base
instructions of a Codex agent.
