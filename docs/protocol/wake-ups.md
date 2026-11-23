# Wake-ups

This doc holds the requirements and the decisions in force for the
wake-up calls of the workspace tools, and for the turn that a wake-up
starts. With these calls, an agent asks to continue its work in its own
session at a later time. It can then end its reply, and its cloud
computer can stop. It belongs to [Agent tools](agent-tools.md), which
covers the workspace tools and their other calls.
[Wake-ups: delivery and ends](wake-ups-delivery.md) states what a
wake-up does at its time, and what ends it.
[Wake-ups: the chat](wake-ups-chat.md) states what the chat shows for
each wake-up. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A wake-up decision number names a decision of the change that adds
the wake-up calls. A watch decision number names a decision of the change
that adds the watch call, as [Session watches](session-watches.md) says.
The [mockup catalogue](../mockups/catalogue.md) draws the wake-ups at
`app/chat/wake-ups`.

## Terms

- The calling turn, the sender, a read, and a write are the terms of
  [Agent tool access](agent-tool-access.md#terms).
- **Calling session:** the session of the calling turn.
- **Pending wake-up:** a wake-up whose time has not come, and that has not
  ended.
- **End line:** the line of the app that a pending wake-up leaves when it
  ends with no turn. It is the line of a cancel, or the line of a wake-up
  that could not start.
- **Explicit Stop:** Stop in the chat, `stop_session`, or a close that
  stops a turn, as [Stop](session-watches.md#stop) says for watches.

## The calls

| Call | MCP tool | CLI command | Route | Needs |
| --- | --- | --- | --- | --- |
| Set a wake-up | `schedule_wake_up` | `conductive wake-ups schedule` | `POST /v1/tools/wake-ups` | An active turn |
| List the wake-ups of a session | `list_wake_ups` | `conductive wake-ups list` | `GET /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/wake-ups` | The workspace token |
| Cancel a wake-up | `cancel_wake_up` | `conductive wake-ups cancel` | `POST /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/wake-ups/{wakeUpId}/cancel` | An active turn |

- Both workspace tools give the three calls, for Claude and for Codex
  (wake-up decision 1 D). Their routes are on `api.conductive.build`, as
  the routes of the other calls are.
- Reason: each wake-up then survives a stop of the cloud computer, and both
  agents follow one rule. The cloud computer can stop while a wake-up
  waits. The agent program of Claude keeps no wake-up of its own, as
  [Wake-ups of the agent program](background-work.md#wake-ups-of-the-agent-program)
  says.
- A time on `watch_session` or on `send_message` was rejected. Reason: a
  time is not the end of a turn, and a tool message can open a new session
  with no history.

## Set a wake-up

- `schedule_wake_up` takes a text and one time. The time is a delay in
  seconds, or a date and a time with its offset from UTC, such as
  `2026-11-23T09:00:00+01:00`.
- The tool changes a date and a time into Unix milliseconds before its
  call. So the request carries a delay in seconds or a time in Unix
  milliseconds. Reason: the clock of the cloud computer is UTC, the agent
  does not know the time zone of the member, and wire dates use Unix
  milliseconds.
- The call is a write. So it needs an active turn, as
  [Tokens and turns](agent-tool-access.md#tokens-and-turns) says.
- The call names no workspace and no session. Each wake-up belongs to the
  calling session. The Worker takes the calling session and the sender
  from its record of the calling turn.
- Reason: a wake-up continues the work of the agent itself. A wake-up for
  another session was left out.
- The text follows the rules of the text of a tool message, as
  [Send a message](session-calls.md#send-a-message) says. So it must hold
  more than white space. Reason: it reaches the agent as a message.
- A time in the past fires at once. The app sets no minimum delay. Reason:
  a refusal adds a rejection, and a short wake-up does not stop the cloud
  computer.
- The app sets no limit on how far ahead a wake-up is, or on how many
  wake-ups wait. Reason: [No limit](session-calls.md#no-limit) sets none
  for tool messages (decision 262), and a pending wake-up holds no cloud
  computer. A member ends a pending wake-up with Cancel.
- The reply gives the wake-up ID, the time in Unix milliseconds, and the
  time in UTC as text.

### One turn for each wake-up

- A wake-up starts or joins one turn. It never repeats (wake-up decision
  2 A). The woken turn can set the next wake-up.
- Reason: each later turn then has its own request from an active turn, as
  each watch does. Wake-ups that repeat until a cancel, a Stop, or 7 days
  were rejected. So were wake-ups that repeat with no end.

### Repeats

- Calls of one calling turn with the same text and the same time input
  give one wake-up, with one wake-up ID, while that wake-up is pending.
- A call after that wake-up fired or ended sets a new wake-up.
- Reason: a retry after a lost reply is a new call of the tool, as watch
  decision 4 C says. A chain of wake-ups in one long turn must not stop
  with no word.

## List the wake-ups

- `list_wake_ups` takes the workspace and the session. A call without a
  workspace ID names the calling workspace.
- The call is a read. So it needs only the workspace token, and no active
  turn (decision 257).
- It reaches each session of the org, as [Reach](agent-tool-access.md#reach)
  says. Reason: a read can come without a turn, so it has no calling
  session. Each call keeps the reach of decision 277.
- The reply gives each pending wake-up of the session, with its ID, its
  time in Unix milliseconds and in UTC, and its text.
- An unknown session, or a session of another workspace, gets HTTP 404
  with the error code `session_not_found`, as for the session calls.

## Cancel a wake-up

- `cancel_wake_up` takes the workspace, the session, and the wake-up ID. A
  call without a workspace ID names the calling workspace.
- The call is a write, so it needs an active turn. It reaches each session
  of the org, as `list_wake_ups` does.
- A cancel has the rights of a Stop of that session. So each sender can
  cancel each wake-up of the org. An archived workspace refuses a cancel,
  as it refuses a Stop. Reason: a cancel ends later work, as Stop does.
- A cancel ends the pending wake-up at once. It starts no turn, and it
  adds the [end line](wake-ups-chat.md#end-lines) of a cancel to the
  session.
- An unknown wake-up, or a wake-up of another session, gets HTTP 404 with
  the error code `wake_up_not_found`. Reason: the other calls answer an
  unknown ID with HTTP 404 and a code.
- A wake-up that already fired or ended gives a reply that says so, and no
  error. Nothing changes. Reason: `stop_session` gives such a reply for a
  session with no running turn, because the agent may not know that the
  turn ended.
- A member cancels a wake-up with Cancel in the chat, with the same
  rights, as [The pending wake-ups](wake-ups-chat.md#the-pending-wake-ups)
  says.

## Delivery and ends

[Wake-ups: delivery and ends](wake-ups-delivery.md) states how a wake-up
reaches its session at its time, and what happens when it can start no
turn. It also states what a Stop, a close, and an Archive do to the
pending wake-ups. The rules for a Stop and for a close are open, as that
page says.

## The boundary of a wake-up

- A wake-up is an explicit authorization of a running turn. Sandbox code
  can set a wake-up only while the calling turn runs. The Worker takes the
  sender of the wake-up from its own record of that turn.
- Sandbox code can never fire a wake-up, or change its time, its text, or
  its sender. Only the Worker fires it, once, at its time, also after the
  calling turn ended.
- So sandbox code that runs between turns, such as a service or a server
  that keeps running after its turn, can set no wake-up. It cannot wake
  its own session.
- Reason: [Background work](background-work.md#background-work) rejected a
  new turn that background work starts by itself, because sandbox code
  could then spend the login of the sender. A wake-up extends the rights of
  a running turn to one later turn. It gives no right that a process can
  use again, and its timer runs in the Worker.
- Risk: while a turn runs, each process in its sandbox can set a wake-up in
  the name of that turn, as it can send a message. The wake-up can then
  start a turn for the sender of that turn, also days later.
- Risk: while a turn runs, each such process can also cancel each pending
  wake-up of the org, with the rights of the sender of that turn.

## Ways that were rejected

These ways to continue later were rejected (wake-up decision 1):

- A wake-up that the runner keeps on the disk of the cloud computer.
  Nothing then starts a stopped cloud computer.
- A pause of the cloud computer with its memory. A stop ends every process,
  as [The stop](stop-and-resume.md#the-stop) says.
- A copy of the wake-ups of the agent program to the Worker at the end of
  a turn. It cuts long texts, and it can fire a wake-up twice.
- An automation for each wake-up. Each run starts a new workspace with no
  history.
- A reminder that starts no turn. The agent then does not continue by
  itself.
- A wake-up that acts for the workspace owner or for an app identity. A
  tool identity as the sender was rejected, as
  [The sender](agent-tool-access.md#the-sender) says.
- A timer of the sandbox provider or of the Mac app. The Worker must still
  start the turn, and the Mac app can be closed.
- The cloud triggers of Anthropic. They run in the cloud of Anthropic, not
  in the session.
- Short wake-ups in the agent program beside Conductive wake-ups for long
  ones. A restart still loses the short ones.

## Tool descriptions and guidance

- The help of the CLI, the descriptions of the MCP tools, and the
  [agent instructions](agent-instructions.md#what-the-instructions-hold)
  say these things:
  - A wake-up starts or joins one turn in the calling session at its time,
    for the sender of the calling turn. It never repeats.
  - The agent sets the wake-up, then ends its reply. Reason: the cloud
    computer can stop only after the turn ends.
  - Background tasks and dev servers end when the cloud computer stops.
  - A member can cancel a wake-up, and a wake-up can fail to start. So the
    agent lists its wake-ups before it relies on one.
- Reason for the last point: one sentence covers both ends, and it sends
  the agent no new message. A note to the agent at its next turn for each
  wake-up that ended with no turn was not chosen.
