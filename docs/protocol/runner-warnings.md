# Runner warnings

This doc holds the requirements and the decisions in force for the
warnings that the Worker writes to its log about the connections of the
agent runner and about turn ends with no Stop request. It belongs to
[Agent runner](agent-runner.md).
[Agent instructions](agent-instructions.md#what-the-instructions-hold)
states the guidance that tells each agent how a stop of the runner service
ends its turns. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A stop diagnostics decision number, such as stop diagnostics
decision 4, names a decision of the change that adds these warnings and
that guidance.

## Terms

- **Runner connection:** one WebSocket of the agent runner to its
  workspace, from its accept by the workspace to its end.
- **Connection ID:** the ID that the workspace gives each runner
  connection. The runner never gets it.
- **Stream ID:** the ID of the event stream of a runner. The runner sends
  it in its hello, and keeps it across its restarts.
- **Protocol version:** the version of the runner messages that a runner
  connection carries, as [Runner versions](version-pins.md#runner-versions)
  says. It is not the release of the runner.
- **Stop request:** a Stop of a member, a close of a session that stops its
  turn, or a stop through the workspace tools, as
  [Messages](messages-and-attachments.md#messages) says.

## The warnings

- The Worker writes a warning to its log for each runner connection, for
  the end of each runner connection, and for each turn end with no Stop
  request (stop diagnostics decision 4 D).
- Reason: a turn that stops with no Stop request shows only "The agent
  stopped", with no cause, as [Messages](messages-and-attachments.md#messages)
  says. The journal of the cloud computer is lost when the cloud computer
  stops. The warnings let an operator match such a stop to a disconnect of
  the runner.
- A cause that the runner records on each stopped turn, and that the chat
  shows, is not part of these rules (stop diagnostics decision 4). Reason:
  it needs a new end reason in the runner messages, which is a larger
  change.
- The warnings change no turn, no chat line, no runner message, and no
  behaviour of the runner.
- The warnings are best effort. A stop of the Worker just after it stores
  an end or a connection change can lose its warning. When the Worker
  cannot tell whether an older turn had a Stop request, it writes no
  warning for that end, and the end still completes.

### Connections

- The connect warning of a runner connection comes when the workspace
  accepts the first hello of that connection. It holds the stream ID and
  the protocol version of that hello.
- A runner connection that ends before an accepted hello gets its connect
  warning just before its disconnect warning. Its stream ID and its
  protocol version are then not known.
- The disconnect warning comes when the workspace sees the end of the
  runner connection, whatever ended it.
- An end that the workspace does not see gets no disconnect warning. A
  restart of the Worker can leave such a gap. A connection that also had
  no accepted hello then gets no connect warning either.
- A wake of the workspace that restores its saved runner connection
  writes no connect warning. Reason: the runner did not connect again.
- When the workspace refuses or closes that saved connection at the wake,
  such as for a protocol version that it no longer supports, it writes the
  disconnect warning of that connection. That warning holds the values
  that the workspace saved for the connection.

### Turn ends

- The Worker writes a warning for each turn end that the workspace stores
  with no Stop request for that turn. This holds for each state of the
  end: `finished`, `stopped`, and `failed` (stop diagnostics decision 4 D).
- Reason: the log then shows each turn end beside the connections of the
  runner. The state of the end tells the stopped turns apart.
- A turn end with a Stop request gets no warning. Reason: the chat already
  names the member or the session that asked for the stop.
- The Worker writes the warning only after the workspace stores the end.
  So a store that fails writes no warning. A resent end, or a late event
  of an ended turn, writes no second warning.

## What a warning holds

- Each warning holds its kind and the workspace ID. It also holds the
  connection ID, the stream ID, and the protocol version of a runner
  connection. A turn-end warning also holds the turn ID and the state of
  the end.
- A turn-end warning names the runner connection that is current when the
  workspace stores the end. It does not name the connection that took the
  turn.
- A value that is not known, such as the connection of a turn end with no
  current runner connection, is null.
- A warning holds only IDs, the protocol version, the state of an end, and
  a fixed text for its kind. It holds no secret, no token, no text of a
  message, no content of a file, no error text, and no close reason.
- The Worker checks the format of each ID and of the protocol version. It
  never writes a value that fails the check. Reason: the runner sends the
  stream ID and the protocol version, and agent code runs on the same
  cloud computer.
- Risk: no warning names one start of the runner. The stream ID stays the
  same across a restart of the runner, and the protocol version is not its
  release. So a restart and a dropped connection both show as a disconnect
  and a connect.
