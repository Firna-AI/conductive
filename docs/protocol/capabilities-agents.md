# Capabilities: what agents learn

This page belongs to [Capabilities](capabilities.md), which covers the
Capabilities control and Mac access. It states the facts of a session that
its agent learns, a change of these facts, the change note of a change,
where the note goes, what the chat shows, and older runners.
[The capabilities](agent-instructions-changes.md#the-capabilities) states
the text of the agent instructions on these facts. The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the change note
at `app/capabilities/changed`. The terms are those of
[Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A capability
prompts decision number, such as capability prompts decision 1, names the
dated record of one decision of the change that tells each agent the
capabilities of its session. Its plan keeps these records while the change
is open. Its pull request keeps them after the merge. A Mac access decision
names a decision of the change that makes Mac access allow all commands, as
[Mac access](mac-access.md) says.

## The facts of a session

- The facts of a session are the secrets that it uses with no request.
- Mac access is not a fact (Mac access decision 7).
- Reason: agents can always ask for a command on a Mac, and the stored Mac
  access value of a workspace allows and refuses no request, as
  [Agents can always ask](mac-access.md#agents-can-always-ask) says.
- The secrets come from the mark for all agents, the pre-approvals of the
  workspace, the session approvals of the session, and the values for this
  workspace. A value for 15 minutes is not a fact, because it ends by
  itself.
- The facts name each secret by its name only. They never hold a value or
  a description.
- The agent instructions of a new session give its facts, only when it has
  some, as [The capabilities](agent-instructions-changes.md#the-capabilities)
  says. A [change note](#the-change-note) gives each later change of the
  facts (capability prompts decision 1 A).
- Reason: an agent that does not know its facts asks the members for keys
  that it can use already.
- These ways were rejected (capability prompts decision 1):
  - A line with the facts in each message. It costs tokens in each message.
  - New instructions after each change. They make each session read its
    whole conversation again.
  - The start facts, and a line in each message while the facts differ.
    This adds state to the runner.
  - The facts in the tool descriptions. Each change then reloads the
    prompt cache, and each turn needs a call to the Worker.
- The help of the CLI and the descriptions of the MCP tools say when to
  use the secret calls and the Mac command call. The text of the Mac
  command call also says whose Mac gets the request, and that the Mac app
  asks first unless a choice of its user covers the command, as
  [The choices](desktop-commands.md#the-choices) says.
- Reason: a session keeps the instructions of its start, and a subagent of
  a Claude agent gets no instructions. The tool text reaches both.
- A fact that is out of date fails safe. The Worker checks each grant at
  each use, as [Grants](secrets.md#grants) says.
- Risk: when an agent summarizes a long conversation, the summary can drop
  a change note. The agent then knows only the facts of its instructions,
  and they can be out of date.

## A change

- A change is a difference in the facts of a session that one write makes.
  These writes can make a change:
  - an edit in the Capabilities control of the workspace, also a Remove of
    a session approval or of a value for this workspace
  - an answer to a request that gives a value for this workspace
- Each session gets only its own difference. So the removal of a
  pre-approval is no change for a session that the mark for all agents
  still covers.
- A session gets no change note for a write that makes no change in its
  facts.
- An answer that gives a value for this workspace is a change for each
  session of the workspace.
- A session that its own request already told gets no change note, in its
  chat or for its agent. That is the session that asked, and each session
  with a [covered request](secret-requests.md#covered-requests) that the
  same answer settles.
- Reason: the result of its call or its late answer tells such a session,
  as [Late answers](secret-late-answers.md#late-answers) says. So one
  answer tells each session once.
- These writes give no change note: the mark for all agents that an admin
  sets or clears, a new secret with that mark, and a deleted secret.
  Reason: they change each workspace of the org at once. A new session
  gets the facts that hold at its first turn, and a fact that is out of
  date fails safe.
- Each write gives its own change note, also when a member makes several
  writes in a row. The control saves each click, so three clicks give
  three notes.
- One note for the writes of one member in a short time was rejected. It
  needs a time window, and a rule for a click that undoes an earlier one.
  Three short notes stay readable.
- Each change note names the member who made its write, also when two
  members change the capabilities at the same time.
- When the app saves a change but cannot keep its change notes, the change
  still holds, and the control shows the saved capabilities.
- Risk: the sessions then get no change note of that change.

## The change note

- A change note names the member who made the change, then each change of
  the write, in one sentence (capability prompts decision 4 B). An example
  is "Priya Raman pre-approved `VERCEL_TOKEN`."
- The changes keep this order: pre-approvals added, pre-approvals removed,
  session approvals removed, values given, then values removed. An example
  is "Priya Raman pre-approved `VERCEL_TOKEN`, removed the pre-approval of
  `FIGMA_TOKEN`, and removed the approval of `PROD_DATABASE_URL` for this
  session."
- Reason: one sentence keeps the note short.
- A change note names secrets only. It never holds a value.
- The agent gets the words of the chat, with the name of the member. To
  the member who made the change, the chat says "You", such as "You
  pre-approved `VERCEL_TOKEN`."
- A line that only the agent gets was rejected (capability prompts
  decision 4). Members could then not see what the agent was told, or who
  made the change.
- Risk: the name of a value for this workspace comes from the request of
  an agent. So text that steers one agent can choose a name that reaches
  the instructions and the change notes of the other sessions of the
  workspace. The member who gives the value sees that name first.

## Where the note goes

- While a turn of the session runs, the change note joins that turn, as a
  message during a turn does (capability prompts decision 1 A). The turn
  keeps its sender, as [Access](message-lines.md#access) says.
- In an idle session, the change note waits (capability prompts decision
  3 A). The agent gets it with the next turn of the session, in the same
  prompt as the message that starts that turn. The notes come after the
  sender lines of that message.
- Reason: the agent reads the whole prompt before it acts. A skill text at
  the start of the member's text still starts the prompt, as
  [Skills of a message](skill-input.md) says.
- No turn starts for a change note.
- A change note that the agent did not get before the end of its turn
  waits for the next turn.
- The agent gets the change notes of a session in the order of their
  changes.
- The change notes of a closed session wait too, because a closed session
  can open again.
- A session that has not started a turn gets no change note, in its chat
  or for its agent. Reason: its instructions give the facts that hold at
  its first turn.
- A change while the first turn of a session starts reaches the agent
  once: in its instructions, or in a change note.
- The agent reads each change note under an app header, in place of a
  sender line, as [The sender line](message-lines.md#the-sender-line)
  says. A change note never reaches the agent as a message of a member.
- A turn for each change, as a late answer starts one, was rejected
  (capability prompts decision 3). Each open session would then wake, use
  tokens, and act for the member who changed the control.
- Change notes only for running turns were rejected, because an idle
  session would then never learn of the change.

## In the chat

- Each change note shows in the chat of its session at the time of the
  change (capability prompts decision 4 B). It shows as a centred, muted
  line, as the note of Continue does, with the Capabilities icon.
- A change note belongs to no turn. It is not part of the work of a turn,
  and it never folds. Reason: members still see what the agent was told
  after the turn ends.
- A copy of the session gives each change note at its place, with the name
  of the member, as [The text](session-transcripts.md#the-text) says. So
  does `read_session`.
- An open tab of an older app, and an older copy of the Mac app, skip a
  change note. They show the other events of the chat as before.

## Older runners

- The Worker sends change notes only to a runner that announces them in
  its hello, as [The agent runner](agent-runner.md#the-agent-runner) says.
- With an older runner, the change notes of each session wait, and the
  chat shows them. The agent gets them after the runner of its cloud
  computer updates.
- Risk: until that update, an agent can act on facts that are out of
  date. Such a fact fails safe, because the Worker checks each grant at
  each use.
