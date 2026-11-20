# Agent instructions: facts that change

This page belongs to [Agent instructions](agent-instructions.md), which
states what the instructions hold and gives the terms. It states that a
session keeps the same text for its whole life. It also states how the
instructions hold two kinds of fact that can change during a session: the
parent and the depth, and the capabilities.
[Message lines](message-lines.md) states the lines that name the current
branches and the current repository folder. The other terms are those of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A parent-move decision number names a decision of the change that
adds [parent changes](parent-changes.md), as that doc says. A capability
prompts decision number names a decision of the change that tells each
agent the capabilities of its session, as
[Capabilities: what agents learn](capabilities-agents.md) says.

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
- Apart from the branches, the repository folder, the parent, the depth,
  and the capabilities, the instructions hold no fact that changes during
  the work, such as the date, the Git state, or the pull request state.
  The agent reads such facts with its tools.
- Reason: a change of the text rewrites the prompt cache of the
  conversation. An agent can also keep the first instructions of a session
  until it summarizes the conversation.
- The workspace branch and the target branch can change, by Continue, by
  a repository change, or by a new default branch. The instructions keep
  the branches of the start of the session, and
  [the branch line](message-lines.md#the-branch-line) names the current
  branches.
- The repository folder can change by a repository change. The
  instructions keep the folder of the start of the session, and
  [the repository line](message-lines.md#the-repository-line) names the
  current folder.
- The capabilities can change, as
  [A change](capabilities-agents.md#a-change) says. The instructions keep
  the capabilities of the start of the session, and a
  [change note](capabilities-agents.md#the-change-note) tells the agent of
  each later change.
- A tool that returns facts that change, such as the pull request state,
  was rejected. It widens what the workspace token allows, and agents still
  need instructions to call it.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.

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
  secret with no request, or when Mac access is on (capability prompts
  decision 1 A).
  [The facts of a session](capabilities-agents.md#the-facts-of-a-session)
  states these facts.
- A session with no such fact gets no capability text. Reason: the user
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
- It says whether Mac access is on. When Mac access is on, it gives the
  rules of a Mac command that the
  [change note](capabilities-agents.md#the-change-note) gives too. A
  request goes to the Mac of the member whose message started the turn.
  The Mac app still asks before each command that its user did not always
  allow.
- It ends by saying that members can change the capabilities, and that
  the app then tells the agent of each change.
- A turn that brings no capabilities, such as a turn from an older Worker,
  gives no capability text.
- A session keeps the capabilities of its start in its instructions, as
  [The same text for the life of a session](#the-same-text-for-the-life-of-a-session)
  says. [Where the note goes](capabilities-agents.md#where-the-note-goes)
  states how the agent learns of each later change.
