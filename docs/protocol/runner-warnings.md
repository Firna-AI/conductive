# Runner warnings

This doc holds the requirements and the decisions in force for the
warnings that the Worker writes to its log about the connections of the
agent runner, about turn ends with no Stop request, and about runner work
that did not finish. It also covers the process-start ID that the runner
sends for these warnings. It belongs to
[Agent runner](agent-runner.md).
[Agent instructions](agent-instructions.md#what-the-instructions-hold)
states the guidance that tells each agent how a stop of the runner service
ends its turns. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A stop diagnostics decision number, such as stop diagnostics
decision 4, names a decision about these warnings and that guidance.
Stop diagnostics decision 5 is the choice to add the process-start ID. A
runner work decision number, such as runner work decision 2, names a
decision about the warning for runner work that did not finish.

## Terms

- **Runner connection:** one WebSocket of the agent runner to its
  workspace, from its accept by the workspace to its end.
- **Connection ID:** the ID that the workspace gives each runner
  connection. The runner never gets it.
- **Stream ID:** the ID of the event stream of a runner. The runner sends
  it in its hello, and keeps it across its restarts.
- **Runner start:** one run of the runner program in the cloud computer,
  from its start to its end. A program that replaces it in place begins
  a new runner start.
- **Process-start ID:** the ID that the runner makes for one runner
  start. The runner sends it in each hello of that runner start.
- **Protocol version:** the version of the runner messages that a runner
  connection carries, as [Runner versions](version-pins.md#runner-versions)
  says. It is not the release of the runner.
- **Runner work:** the handling of one runner message by the workspace,
  or the delivery of the waiting commands just after a hello.
- **Watch window:** the first 30 seconds after the workspace receives the
  hello of a runner connection.
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
- Apart from the process-start ID in the hello, the warnings change no
  turn, no chat line, no runner message, and no behaviour of the runner.
  [Process starts](#process-starts) states that ID.
- The warnings are best effort. A stop of the Worker just after it stores
  an end or a connection change can lose its warning. When the Worker
  cannot tell whether an older turn had a Stop request, it writes no
  warning for that end, and the end still completes.

### Connections

- The connect warning of a runner connection comes when the workspace
  accepts the first hello of that connection. It holds the stream ID, the
  process-start ID, and the protocol version of that hello.
- A runner connection that ends before an accepted hello gets its connect
  warning just before its disconnect warning. Its stream ID, its
  process-start ID, and its protocol version are then not known.
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

## Runner work that did not finish

- The Worker writes a warning for each runner work that starts in a watch
  window and does not end (runner work decision 2 A).
- Reason: some runner work can make the workspace go over its memory
  limit. The platform then resets the workspace before it can write a
  warning. The runner connects again and sends the same events, so the
  same work fails again in a loop. Without the warning, the log does not
  show which work fails.
- The workspace saves a durable record of the work before the work
  starts. It removes the record when the work ends, with success or with
  an error. After the purge of a deleted org, its workspaces save no
  record.
- The workspace writes the warning at its first runner work after a new
  start. So the warning comes after the reset, not before it. Then the
  workspace removes the record.
- A log line before each work was rejected. Reason: the platform does not
  promise that a reset keeps the log lines of the work that it ends.
- A wake of the workspace that restores its saved runner connection keeps
  the watch window of that connection, with its original end.
- The watch covers only the watch window. Reason: the runner sends its
  unconfirmed events again at once after its hello. So each pass of such
  a loop starts in a watch window. A record for each runner message was
  rejected, because it adds durable writes to each runner message.
- A reset can have another cause, such as a deploy of the Worker. The
  warning then names the work that the reset ended. It does not name the
  cause of the reset.
- The record changes no handling of the work. When the workspace cannot
  save or remove the record, the work runs as before.
- The warning holds the connection values of the work: the workspace ID,
  the connection ID, the stream ID, the process-start ID, and the protocol
  version. For a hello, these come from that hello.
- The warning holds the kind of the work: `hello`, `event`, `file_result`,
  `move_refused`, or `flush`. `flush` is the delivery of the waiting
  commands.
- The warning holds the last stage that the work reached: `hello`,
  `event`, `file_result`, or `after_commit`. `after_commit` means that the
  workspace stored the event and its cursor. A flush has a null stage.
- For an event, the warning holds the event type and the event number.
  For a message, it holds the size of the message: the length of its text
  in UTF-16 code units, or its byte count when it is binary.
- Risk: the size and the event type are what the runner sends. Agent code
  runs on the same cloud computer, so they prove nothing.

## What a warning holds

- Each warning holds its kind and the workspace ID. It also holds the
  connection ID, the stream ID, the process-start ID, and the protocol
  version of a runner connection. A turn-end warning also holds the turn
  ID and the state of the end.
- A turn-end warning names the runner connection that is current when the
  workspace stores the end, with the process-start ID of that connection.
  It does not name the connection or the runner start that took the turn.
- A value that is not known, such as the connection of a turn end with no
  current runner connection, is null.
- A warning holds only IDs, the protocol version, the state of an end, and
  a fixed text for its kind. A warning about runner work that did not
  finish also holds the kind, the stage, the event type, the event number,
  and the size of that work. It holds no secret, no token, no text of a
  message, no content of a file, no error text, and no close reason.
- The Worker checks the format of each ID and of the protocol version. It
  also checks the event type, which must be a short dotted lowercase name,
  and each number, which must be a non-negative safe integer. It never
  writes a value that fails the check. An event type that fails shows as
  `unknown`, and a number that fails shows as null. Reason: the runner sends the
  stream ID, the process-start ID, and the protocol version, and agent
  code runs on the same cloud computer.

## Process starts

- Each hello of the runner carries the process-start ID of its runner
  start, as `processStartId` (stop diagnostics decision 5 B).
- Reason: an operator can then tell a restart of the runner from a retry
  of its connection. This holds also for a restart while no turn runs. No
  turn-end warning shows such a restart.
- Warnings with only the connection ID, the stream ID, and the protocol
  version were rejected (stop diagnostics decision 5 A). Reason: a restart
  and a dropped connection then both show as a disconnect and a connect.
- An ID that the Worker derives was rejected. Examples are an ID from the
  time of a connection, from the stream ID, or from the version of the
  software image. Reason: only the runner knows when it starts again.
- The runner makes the ID once at each runner start. The ID is a random
  UUID of version 4, in its lowercase text form.
- The runner keeps the ID until that runner start ends. Each reconnect of
  the runner sends the same ID.
- Each new runner start makes a new ID. Examples are each start of the
  sandbox, each resume, and each restart of the runner service, also after
  a crash.
- A runner start never sends the ID of an earlier runner start. An ID that
  the runner saves with its event stream was rejected. Reason: a later
  runner start then sends that ID again.
- The ID needs no new protocol version. A hello with or without the ID
  follows the rules of [Runner versions](version-pins.md#runner-versions).
- The workspace never refuses a hello because of its ID. This holds for a
  hello without the ID, and for an ID that fails the format check of
  [What a warning holds](#what-a-warning-holds).
- Reason: the ID serves only the warnings. An older runner sends no ID,
  and a sandbox can resume weeks later with an old runner.
- The warnings of a connection without an ID show the ID as null.
- A wake of the workspace keeps the ID of its saved runner connection. A
  saved connection without an ID restores by the same rules.
- An invalid process-start ID never prevents a saved connection restore.
- The ID names no cause of a stop. The chat never shows it.
- Risk: any process with the workspace token can open a runner connection
  and send any ID. So the ID shows what the runner says, and it proves no
  start.
- Risk: an older runner sends no ID. For its connections, a restart and a
  dropped connection still both show as a disconnect and a connect. Its
  stream ID stays the same across a restart, and the protocol version is
  not its release.
