# Session instructions

This page belongs to [Agent instructions](agent-instructions.md). It
states how a session keeps its agent instructions for its whole life, and
how each agent gets them. The terms are those of
[Agent instructions](agent-instructions.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

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
  [The parent and the depth](agent-instructions-changes.md#the-parent-and-the-depth)
  says.
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
  a repository change, or by a new default branch. The target branch also
  changes when GitHub deletes it, as
  [A base branch that GitHub deleted](base-branches.md#a-base-branch-that-github-deleted)
  says. The instructions keep the branches of the start of the session,
  and [the branch line](message-lines.md#the-branch-line) names the
  current branches.
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

## How each agent gets them

[How each agent gets them](agent-instructions-delivery.md) states how
Claude and Codex get the agent instructions, and the ways that were
rejected.
