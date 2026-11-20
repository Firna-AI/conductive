# Agent instructions: the same text for the life of a session

This doc holds the requirements and the decisions in force for the agent
instructions that a session keeps for its whole life, and for the facts
that the messages give in their place. It belongs to
[Agent instructions](agent-instructions.md), which states what the
instructions hold and gives the terms. A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

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
  [The parent and the depth](agent-instructions.md#the-parent-and-the-depth) says.
- A session that started without agent instructions can get them once, at
  a later turn. It then keeps that text.
- Apart from the branches, the repository folder, the parent, and the
  depth, the instructions hold no fact that changes during the work, such
  as the date, the Git state, or the pull request state. The agent reads
  such facts with its tools.
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
- A tool that returns facts that change, such as the pull request state,
  was rejected. It widens what the workspace token allows, and agents still
  need instructions to call it.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.
