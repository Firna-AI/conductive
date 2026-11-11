# Session calls

This doc holds the requirements and the decisions in force for the
session calls of the workspace tools. With these calls, an agent starts a
session, lists the sessions of a workspace, sends a message to a session,
and reads a session. It belongs to
[Agent tools](agent-tools.md), which covers the workspace tools, their
other calls, and Mac commands. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws a message of
these calls at `app/workspace-links/sent-by`.

## Terms

- **Calling workspace:** the workspace whose sandbox makes a call.
- **Calling turn:** the agent turn that makes a call. Its sender is the
  member whose message started the turn.
- **Tool message:** a message that `send_message` sends, or the first
  message of a `create_session` call or of a `create_workspace` call.
- **Live workspace:** a workspace that is not archived.

## The calls

| Call | MCP tool | CLI command | Route | Needs |
| --- | --- | --- | --- | --- |
| List the sessions of a workspace | `list_sessions` | `conductive sessions list` | `GET /v1/tools/workspaces/{workspaceId}/sessions` | The workspace token |
| Read a session | `read_session` | `conductive sessions read` | `GET /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/transcript` | The workspace token |
| Start a session | `create_session` | `conductive sessions create` | `POST /v1/tools/workspaces/{workspaceId}/sessions` | An active turn |
| Send a message | `send_message` | `conductive sessions send` | `POST /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/messages` | An active turn |

- Both workspace tools give the four calls. Their routes are on
  `api.conductive.build`, as the routes of the other calls are.
- Each call takes a workspace ID. A call without one names the calling
  workspace.
- `read_session` and `send_message` also take a session ID. A
  [session link](agents-and-sessions.md#session-links) holds both IDs.
- Reason: a `Sent by:` line gives a session link, and the lists give the
  IDs.
- Each reply gives the session link of each session that it names, as the
  workspace replies give workspace links. Reason: an agent can then point
  to a session that it started.
- The two reads also reach an archived workspace, as a copy of a
  transcript does. The two writes refuse an archived workspace with HTTP
  409 and the error code `workspace_archived`. Reason: the chat of an
  archived workspace is read-only.
- Each write takes an optional request ID. A repeat of a write with the
  same request ID gives the result of the first write, as a repeated
  message of the app does.
- The accepted session, message, choice, and turn stay the same on a
  repeat. The workspace state and the start information describe the
  current request. Reason: a retry can then follow a start without adding
  another message.
- Without a request ID, the tool makes one. Reason: a retry after a lost
  reply then adds no second session and no second message.

## Reach

- Each call reaches each workspace of the org of the calling workspace
  (decision 257). It reaches no workspace of another org.
- The Worker takes the target workspace from its own records, and only
  from that org. An unknown workspace, or a workspace of another org, gets
  HTTP 404 with the error code `workspace_not_found`.
- Reason: every member of the org can already read and send messages in
  each of its workspaces. Conductor's CLI gives its agents the same reach.
- Smaller reaches were rejected, such as the calling workspace alone, with
  the workspaces that it created, or with the workspaces of one repository.
  A follow-up would then fail for each workspace outside the reach.
- A smaller reach for the turns of routine runs was rejected. Its limit
  must pass to each workspace, session, and message that such a turn
  makes. A routine could then not follow up on its own work.
- An org setting that lets an admin make the reach smaller was rejected.
  It needs a stored setting, a settings control, a mockup, and a protocol
  section.
- [What the session calls reach](isolation.md#what-the-session-calls-reach)
  states the risks of this reach.

## Tokens and turns

- `list_sessions` and `read_session` need only the workspace token, as the
  other list calls do (decision 257). They need no active turn.
- Reason: these calls read data that every member of the org already
  sees, and they start no work.
- Reads that also need an active turn were rejected, so that the reads
  keep the rule of the other list calls.
- `create_session` and `send_message` need an active turn, as a create
  call does. The request names its turn. The Worker accepts it only while
  that turn runs in the calling workspace.
- A write without such a turn gets HTTP 403 with the error code
  `calling_turn_required`. Reason: the Worker takes the sender of a write
  from its record of the calling turn.

## The sender

- A write acts for the sender of the calling turn. That member starts each
  new session and sends each tool message.
- When a tool message starts a new turn, the GitHub token and the Mac
  requests of that turn belong to that member.
- A tool message that joins a running turn keeps the stored sender of that
  turn. So it changes neither the GitHub token nor the Mac of that turn, as
  [Access](agent-instructions.md#access) says for each message that joins
  a turn.
- The Worker takes the sender from its own record of the calling turn. It
  never takes a sender from the call, and it never uses the workspace
  owner in place of the sender.
- At each write, the Worker checks that the sender is still a member of
  the org and is not suspended. Otherwise the write gets HTTP 403 with the
  error code `membership_required`.
- Reason: a create call and a Mac command already follow that sender.
  Agent code runs in the sandbox, so a sender that the sandbox names can
  be false.
- A tool identity as the sender was rejected. The GitHub token and the Mac
  requests of a turn follow its sender, so they would then belong to no
  member.
- An approval of each tool message by a member was rejected, because the
  delegated work would then stop while no member answers.

## List the sessions

- `list_sessions` gives each session of one workspace, also each closed
  session.
- Each entry gives these facts of its session:
  - the session ID and the session link
  - the title
  - the agent, the model, and the effort
  - the starter
  - the state
  - whether the session is closed
- The state is one of these:
  - `running`: the session has a turn that runs or waits, also a turn that
    waits for the cloud computer
  - `failed`: the newest turn of the session failed
  - `idle`: every other case, such as after a turn that Stop ended
- The reply also gives the state of the workspace, as a workspace list
  call gives it.
- Reason: every member already sees these facts, and the state of the
  workspace shows a stop.
- A list whose entries also give the newest answer of each session was
  rejected (decision 258). Each list would read the history of each
  session, and the entries would get long.

## Read a session

- `read_session` gives the text of one session that a copy from its tab
  menu gives (decision 258).
  [Reads by agents](session-transcripts.md#reads-by-agents) states the
  text, its two kinds, and the part of a long text that a read gives.
- Reason: an agent that hands out work needs the answer to go on, and a
  copy already gives the chat of a session as text.
- These ways were rejected:
  - No read. A person would then copy each answer back to the agent.
  - A send that waits for the end of its turn, and a read that waits for
    the end of a turn. A turn longer than the wait still needs another way
    to get its answer.
  - A rule that an agent sends its result back to the session of a
    `Sent by:` line. The result then depends on that agent, and two agents
    can answer each other without end.

## Start a session

- `create_session` takes the workspace, an optional model with its effort,
  an optional title, an optional first message, and an optional request
  ID.
- The model chooses the agent of the session, as in a create call.
- Without a model or an effort, the call uses the saved default of the
  sender. Without a saved default, it uses the default choice of the app.
- Reason: the new session runs on the agent login of the sender, and "+"
  also uses the own choice of the member.
- The sender is the starter of the new session (decision 105).
- The title follows the name rule of a create call, as
  [Create and list calls](agent-tools.md#create-and-list-calls) says. A
  title that is blank after the rule counts as no title.
- A first message follows the rules of [Send a message](#send-a-message).
- A call without a first message makes an empty session, as "+" does. It
  starts no turn and no cloud computer. Reason: an empty session carries
  no work.
- The reply gives the new session with its link. With a first message, it
  also gives that message and its turn.

## Send a message

- `send_message` takes the workspace, the session, the text, an optional
  model with its effort, and an optional request ID.
- Without a model, the message keeps the current model and effort of the
  session. A model of the other agent gets the refusal of the session
  route, because a session keeps its agent.
- A tool message carries no files, so its text must hold more than white
  space. Reason: a file needs an upload from a device.
- A tool message follows the rules of
  [Messages](messages-and-attachments.md#messages), as a message of its
  sender does. So it joins a running turn. It opens a new session when the
  sender cannot use the login of the starter.
- A closed session gets HTTP 409 with the error code `session_closed`. An
  unknown session gets HTTP 404 with the error code `session_not_found`.
- The reply gives the message, its turn, and the session that took it,
  with the link of that session.
- The reply comes at once. A tool message to a workspace that does not run
  waits there for its cloud computer, as each message does. It also starts
  that cloud computer, as
  [Stop and resume](workspace-life.md#stop-and-resume) says (decision
  260).
- Reason: a start can take minutes, and the workspace already keeps the
  message.
- When a start check fails after acceptance, the reply keeps the accepted
  message. It also gives the workspace state and the existing error code
  and message of that check. A repeat keeps that acceptance and can try
  the start again under the same rules as an open.

## The `Sent by:` line

- The Worker adds a blank line, a `---` line, and a `Sent by:` line at the
  end of the text of each tool message (decision 259).
- The `Sent by:` line holds `Sent by:`, a space, and the session link of
  the calling turn (decision 261).
- The text before these lines stays exactly the text of the call.
- The stored message holds these lines. So the agent, the chat, a copy,
  and a read all show them.
- The chat shows the lines as text, as it shows the text of each message.
  Only the session link shows as a session chip, as
  [Session chips](workspace-links.md#session-chips) says.
- The title request of a new workspace reads only the text before these
  lines, as [Messages](messages-and-attachments.md#messages) says.
- Reason: members and agents see which session sent the message. The run
  text of a routine also puts its facts after a `---` line, as
  [The run text](routine-runs.md#the-run-text) says.
- Risk: a member or an agent can type the same lines. So the lines inform
  the reader only, and no access depends on them.
- No mark, and a mark in the sender line only, were rejected. A member
  would then take the text as the words of the member who sent it.
- A mark that each reader builds from a field of the message was rejected.
  It needs a new field, and changes in the history, the copy, and the
  chat.
- A line at the start of the text was rejected, because the first line of
  a first message becomes the title of its session.

## No limit

- The app sets no limit of its own on the sessions and the tool messages
  that agents make (decision 262). A member stops a loop with Stop.
- Reason: an agent does not answer without end unless an instruction tells
  it to. The app sets no limit on the workspaces that agents create either
  (decision 8).
- A limit on the length of a chain of tool messages was rejected. A limit
  on the tool messages of a workspace in an hour was rejected too. Each
  adds a stored count and a refusal.
- Risk: two agents that answer each other spend the agent logins of their
  starters until a member stops one. They also spend the starts that all
  orgs share.

## Tool descriptions

- The help of the CLI and the descriptions of the MCP tools say these
  things:
  - A session link holds the workspace ID and the session ID.
  - A call without a workspace ID names the calling workspace.
  - `create_session` and `send_message` need an active turn.
  - A session link in an answer shows as a session chip.
  - A `Sent by:` line names the session that sent its message.
  - An agent does not answer a tool message only to confirm it (decision
    262).
