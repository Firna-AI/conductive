# Session management

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that get, rename, close, and stop a session, and
get a message. It belongs to [Session calls](session-calls.md). That doc
lists each session call with its route, and states the rules that the
session calls share. [Agent tool access](agent-tool-access.md) states what
each call reaches, which calls need an active turn, and the rights of the
sender. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Get a session

- `get_session` takes the workspace and the session.
- The reply gives the facts of the session that an entry of
  [List the sessions](session-calls.md#list-the-sessions) gives. It also
  gives the state of the workspace, as that list does.
- Reason: Conductor's `session get` and `session status` give one session.

## Get a message

- `get_message` takes the workspace, the session, and a message ID. The
  replies of `send_message` and of `create_session` give that ID.
- The reply gives the message ID, the session with its link, the sender,
  the text, the state, the turn of the message, and the time when the
  workspace accepted the message.
- The state says whether the message still waits for the agent, or has
  reached it.
- The text is the stored text, as the chat shows it. So the text of a tool
  message ends with its `Sent by:` line. No text holds a
  [sender line](agent-instructions.md#the-sender-line).
- Reason: Conductor's `message get` gives one message.
- An unknown message, or a message of another session, gets HTTP 404 with
  the error code `message_not_found`.

## Rename a session

- `rename_session` takes the workspace, the session, and a title.
- The Worker cleans the title, and treats a blank title, as
  [Names from the workspace tools](tool-names.md) says.
- No automatic title replaces the stored title, as after Rename session in
  the [tab menu](agents-and-sessions.md#the-tab-row).
- The reply gives the session with its stored title and its link.

## Close a session

- `close_session` takes the workspace, the session, and an optional choice
  to stop a running turn, as the close route of the app does.
- A close moves the session to the session history, as a close of its tab
  does. A close of a closed session changes nothing.
- Without the choice, a session whose turn runs refuses the close with HTTP
  409 and the error code `stop_confirmation_required`. Nothing changes.
- With the choice, the close stops the turn, as
  [Stop a session](#stop-a-session) does. The session moves to the history
  when that turn ends.
- A turn that has not reached the agent yet, such as a turn that waits for
  the cloud computer, needs no choice. The close stops it, as the close
  route of the app does.
- The reply gives the session with its link. It says whether the session
  is closed.
- Reason: Conductor's `session archive` closes a session. A close of a
  session whose turn runs asks first in the app, so the call asks for the
  same choice.

## Stop a session

- `stop_session` takes the workspace and the session. It stops the running
  turn of the session, as Stop does.
- A session without a running turn gives a reply that says so, and no
  error. Reason: the agent may not know whether the turn already ended.
- The reply comes at once. A turn that runs ends when its agent stops. So
  a list soon after the reply can still show the session as running.
- The chat names the sending session in the line of the stopped turn, as
  [Stops by the workspace tools](messages-and-attachments.md#stops-by-the-workspace-tools)
  says (decision 279). This holds also for a stop through `close_session`.
- An agent can stop its own session. That stop ends the calling turn.
- Reason: Conductor's `session cancel` stops the turn of a session.
