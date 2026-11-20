# Runner warnings

This doc holds the requirements and the decisions in force for the
warnings that the Worker writes to its log about the connections of the
agent runner, about turn ends with no Stop request, and about provider
stops during a turn. It also covers the process-start ID that the runner
sends for these warnings. It belongs to [Agent runner](agent-runner.md).
[Agent instructions](agent-instructions.md#what-the-instructions-hold)
states the guidance that tells each agent how a stop of the runner service
ends its turns. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A stop diagnostics decision number, such as stop diagnostics
decision 4, names a decision about these warnings and that guidance.
Stop diagnostics decision 5 is the choice to add the process-start ID.

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
- **Stop request:** a Stop of a member, a close of a session that stops its
  turn, or a stop through the workspace tools, as
  [Messages](messages-and-attachments.md#messages) says.

## The warnings

- The Worker writes a warning to its log for each runner connection, for
  the end of each runner connection, and for each turn end with no Stop
  request (stop diagnostics decision 4 D).
- Reason: a turn that stops with no Stop request often shows only "The
  agent stopped", with no cause, as
  [Messages](messages-and-attachments.md#messages) says. The journal of the
  cloud computer is lost when the cloud computer stops. The warnings let an
  operator match such a stop to a disconnect of the runner.
- The chat names one cause of such a stop: "The cloud computer stopped",
  for a turn that a provider stop ended. The workspace sets that cause,
  not the runner, as
  [The end of the turn](provider-stops.md#the-end-of-the-turn) says.
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

### Provider stops

- The Worker writes one warning for each
  [provider stop](stop-and-resume.md#stops-by-a-provider) that ends a
  running turn. Each turn that the stop ends also gets its turn-end
  warning.
- Reason: the log then shows how often each provider account stops a
  sandbox during a turn.

## What a warning holds

- Each warning holds its kind and the workspace ID. It also holds the
  connection ID, the stream ID, the process-start ID, and the protocol
  version of a runner connection. A turn-end warning also holds the turn
  ID and the state of the end.
- A provider stop warning also holds the ID of the provider account, such
  as `boat` or `e2b`.
- A turn-end warning names the runner connection that is current when the
  workspace stores the end, with the process-start ID of that connection.
  It does not name the connection or the runner start that took the turn.
- A value that is not known, such as the connection of a turn end with no
  current runner connection, is null.
- A warning holds only IDs, the protocol version, the state of an end, and
  a fixed text for its kind. It holds no secret, no token, no text of a
  message, no content of a file, no error text, and no close reason.
- The Worker checks the format of each ID and of the protocol version. It
  never writes a value that fails the check. Reason: the runner sends the
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
