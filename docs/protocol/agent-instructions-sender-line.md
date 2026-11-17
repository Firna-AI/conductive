# Agent instructions: the sender line

This page belongs to [Agent instructions](agent-instructions.md), which
states what the instructions hold and gives the terms. It states the
sender line of each message to the agent, and the access of a turn, which
does not depend on that line. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

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
- The line of the app that a late answer to a secret request sends is not
  a message of a member. Its text names the member who answered, in place
  of a sender line, as [Late answers](secret-requests.md#late-answers)
  says.
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
- A turn that a late answer to a secret request starts has the sender of
  the turn that asked (secrets decision 10 B). So its Mac commands, its
  GitHub token, and its commits follow that sender, not the member who
  answered.
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
