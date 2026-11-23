# Message lines

This doc holds the requirements and the decisions in force for the lines
that the app adds to each message before it reaches an agent: the sender
line, the repository line, and the branch line. It also states the app
header, which takes the place of a sender line for a change note. It
belongs to
[Agent instructions](agent-instructions.md), which defines these lines
and states the text that each session gets apart from the messages. The
other terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A secrets decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. A repository change decision
number names a decision of the change that added the
[repository change](repository-change.md).

## The sender line

- Each message that reaches the agent ends with a sender line. This holds
  also for each message during a turn, and for each message of the
  starter.
- The member's text comes first, then the lines of the attached files, an
  empty line, the sender line, and any repository line and branch line
  (skill list decision 3). Reason: a skill text at the start of the member's
  text then starts the message, so Claude runs it.
- Exception: when the text of a Claude message starts with `/` and a word
  that names no skill of the Claude list, the sender line and any
  repository line and branch line come first, then an empty line and the
  text. Reason: Claude reads such a word as a command. With the sender line at the end, Claude ran
  its built-in command `/context`. The app does not know the effects of a
  built-in command, such as `/clear`, so no message runs one.
- The instructions of an older session still say that each message starts
  with a sender line, because a session keeps its instructions for its
  whole life.
- The sender line gives the display name, the GitHub login, and the
  member ID of the member who sent the message (decision 283). For a
  member without a display name, it gives only the GitHub login and the
  member ID.
- Reason: several members can write in one session, on the org login or
  while the starter shares the login (decision 116). So the agent needs to
  know who sent each message.
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
- A [change note](capabilities-agents.md#the-change-note) of the
  capabilities is a line of the app too. The agent reads it under an app
  header, in place of a sender line. The app header says that the text
  comes from the app, and it names no member.
- Reason: no member sent the change note. Its text names the member who
  made the change, as the text of a late answer names the member who
  answered.
- The [wake](session-watches.md#the-wake-line) of a watch is a line of the
  app too, not a message of a member. It reaches the agent as a message,
  with its sender line under the rules above.
- That sender line names the member who set the watch. When the wake joins
  a running turn, it names the sender of that turn, as
  [Delivery](session-watches.md#delivery) says.
- The sender line exists only in the text that reaches the agent. The
  stored message, the chat, and the titles from messages never hold it.
- The chat never shows the sender line, the app header, or the agent
  instructions. Reason: they are for the agent.

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
  them. A change note that joins the turn changes none of them either.
- A turn that a late answer to a secret request starts has the sender of
  the turn that asked (secrets decision 10 B). So its Mac commands, its
  GitHub token, and its commits follow that sender, not the member who
  answered.
- A turn that a wake starts has the sender of the turn that set its watch.
  So its Mac commands, its GitHub token, and its commits follow that member.
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

## The repository line

- After a [repository change](repository-change.md), the workspace works
  in the folder of another repository of its sandbox.
- When the agent instructions of a session name an earlier repository
  folder, each message to the agent gets a repository line after its
  sender line. The line names the current repository and the absolute
  path of its folder, and says that the workspace now works there. It
  also names the context folder in that folder, because the instructions
  of the session name the context folder of the earlier folder.
- A repository change also gives the workspace a new branch and a new
  target branch. So such a message also gets the branch line, which names
  them.
- A session whose instructions name the current repository folder gets no
  repository line. This holds also after a change back to that
  repository. A new session gets the current folder in its instructions.
- The repository line exists only in the text that reaches the agent, as
  the sender line does. The chat never shows it.
- Reason: after a repository change, each session keeps its context and
  its instructions, as after Continue. The line reaches every session in
  each message, as the branch line does, for the reasons of decision 227
  below.
- New instructions for each session at the change were rejected for the
  reasons of decision 227. A line only in the note of the change was
  rejected too, because the note reaches no agent.

## The branch line

- The Worker sends the current workspace branch and the current target
  branch with each message (decision 227).
- When the agent instructions of a session name an earlier workspace
  branch or an earlier target branch, each message to the agent gets a
  branch line. It comes after the sender line, and after the repository
  line when the message has one. The line names the current branches.
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
