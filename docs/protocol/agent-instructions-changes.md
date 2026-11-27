# Agent instructions: facts that change

This page belongs to [Agent instructions](agent-instructions.md), which
states what the instructions hold and gives the terms. It states how the
instructions hold three kinds of fact that can change during a session:
the branches, the parent and the depth, and the capabilities.
[Session instructions](session-instructions.md) states that a session
keeps the same text for its whole life.
[Message lines](message-lines.md) states the lines that name the current
branches and the current repository folder. The other terms are those of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A parent-move decision number names a decision of the change that
adds [parent changes](parent-changes.md), as that doc says. A capability
prompts decision number names a decision of the change that tells each
agent the capabilities of its session, as
[Capabilities: what agents learn](capabilities-agents.md) says.

## The branches

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
  reason for the rule of the
  [agent instructions](agent-instructions.md#what-the-instructions-hold)
  that keeps the branch name.
- A Git guard that refuses a rename of the branch was rejected. It covers
  one fact only, and it adds a refusal that no user asked for.
- After a merge, [Continue](continue.md) moves the workspace to a new
  branch. The Worker's record then names the new branch, and the pull
  request bar follows it. Continue is a branch change of the app, not a
  rename by the agent.
- A [repository change](repository-change.md) also moves the workspace to
  a new branch, in the folder of another repository. It is a change of
  the app too.

## The parent and the depth

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
    [the branch line](message-lines.md#the-branch-line) of decision 227.
  - Instructions without the parent and the depth, so that each agent
    reads them with `get_workspace`.

## The capabilities

- The instructions of a session name its capabilities only when it uses a
  secret with no request (capability prompts decision 1 A).
  [The facts of a session](capabilities-agents.md#the-facts-of-a-session)
  states these facts.
- A session with no such secret gets no capability text. Reason: the user
  asked for this text only for a session that has capabilities.
- The text names at most 10 secrets, sorted by name. When the session has
  more, the text then gives the count of the others, such as "and 3 more".
- Reason: the secrets for all agents count, because an admin marks them
  so that each agent uses them with no request. The limit keeps a large
  org from filling the instructions.
- The text gives each name as a JSON string. Reason: a name of a value for
  this workspace comes from an agent, and the quotes keep each name apart
  from the text around it.
- The text says that `run_with_secrets` uses these secrets with no
  request.
- It ends by saying that members can change the capabilities, and that
  the app then tells the agent of each change.
- A turn that brings no capabilities, such as a turn from an older Worker,
  gives no capability text.
- A session keeps the capabilities of its start in its instructions, as
  [The same text for the life of a session](session-instructions.md#the-same-text-for-the-life-of-a-session)
  says. [Where the note goes](capabilities-agents.md#where-the-note-goes)
  states how the agent learns of each later change.
