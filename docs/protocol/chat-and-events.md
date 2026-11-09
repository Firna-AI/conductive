# Chat and events

This doc holds the requirements and the decisions in force for the chat of
a workspace. It covers the sessions, the messages, what the chat shows, and
the events that reach the browser. [Agent runner](agent-runner.md) states
the requirements of the agent runner in the sandbox. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Agents

- The app offers two agents for now: Claude and Codex (decision 19).
- The agents run in the agent runner, our program in each sandbox, through
  the agent SDKs (decision 36).
- Boat's built-in agents were rejected. The user found them too expensive,
  and their events reach the app only by polling.
- An agent loop in the Worker was rejected, because the agents need the
  files and the tools of the sandbox. Anthropic's Managed Agents were
  rejected, because they cover only Claude.
- Claude runs through the Claude Agent SDK. Codex runs through the Codex
  SDK when that SDK can interrupt a turn and stream partial text. Otherwise
  Codex runs through the Codex App Server.
- Every member of the org can send messages in each of its workspaces.
- Each session runs on the agent login of its starter, the member who
  started the session (decision 105). The starter of a session never
  changes, so a session never moves to the login of another member.
- A member starts a session in one of these ways:
  - with "+"
  - with a model of the other agent
  - with the first message of a new workspace
  - with a message that starts a new session, as [Messages](#messages) says
- The session record names its starter in `startedBy`. A session without a
  known starter has no login that can be used.
- The messages of the other members run on the login of the starter too.
  So the other members spend the login of the starter.
- Reason: each change of login rewrites the prompt cache of the
  conversation. A login for each sender was rejected for that reason.
- The login of the workspace owner for all sessions was rejected. Reason:
  each member who starts a session spends their own login.
- [Access and security](access-and-security.md#agent-logins-in-a-sandbox)
  states how a login reaches the sandbox, and its risk.
- A session keeps its memory across a stop and a resume of the sandbox.

## Names in the product

- User-facing text calls the agents "agents powered by Claude and Codex".
- User-facing text never uses "Claude Code" as a name of the product or of
  its features. Reason: Anthropic forbids that use for a product that builds
  on its Agent SDK.
- The model picker names the model and the effort, such as "Opus 5.5 Max".
  It does not show the words Claude or Codex.
- The app marks each agent with a small mark of its own. It shows no brand
  logo of an agent.

## Sessions

- A workspace holds one or more sessions. Each session is a closable tab in
  the centre column, beside the open files and diffs (decision 19).
- "+" starts a new session on the same branch and in the same sandbox.
- The open session tabs show in the order of creation. A new session
  opens as the last tab (decision 77).
- The user can rename a session.
- Each session has its own model picker.
- Closing the tab of a session without a running turn moves the session to
  the session history (decision 31).
- Closing the tab of a session whose turn runs asks first. After the
  confirm, the app stops the turn and moves the session to the history.
- Reason: no agent runs where the user cannot see it, and no history gets
  lost. A close that only hides a running session was rejected for the
  first reason. A close that deletes the history was rejected for the
  second.
- The history lists the closed sessions, the last closed first. Each entry
  shows the agent of its last message, the title, and the time since it
  closed.
- An entry of the history reopens its session as a tab, with its chat.

## Messages

- The composer chooses the model and the effort of each message, and with
  the model its agent (decision 19).
- A change to another model of the same agent stays in the session
  (decision 51).
- A model of the other agent opens a new session with that agent, and the
  draft moves there.
- Reason: neither SDK can switch agents inside one session. A hand-over of
  the transcript to the other agent was rejected. The user chose the way
  that Conductor works.
- When the login of the starter cannot be used, a message of another member
  starts a new session on that member's own login (decision 115). A Try
  again of another member does the same. This happens, for example, after
  the starter leaves the org or removes the login.
- The workspace checks the login of the starter again when it accepts each
  message. When the member has no login for the agent either, the workspace
  refuses the message and starts no session.
- The new session has none of the earlier history. Its record names the
  first session in `sourceSessionId`, and the chat links to it. The first
  session keeps its history and its login.
- A copy of the first conversation, and a move of the first session to
  the login of the member, were rejected.
- The reply to a message or a Try again carries the record of the session
  that took it. A repeat of the same message gets the same session.
- The session record shows the result of the last login check in
  `loginAvailable`. Each tab gets a changed result. The check does not ask
  the provider whether it accepts the login.
- The workspace does not watch the logins for changes. So a tab can show an
  old result until the next check.
- When the record already shows a login that cannot be used, the composer
  says before the send that the message starts a new session.
- The composer names the member whose login its message runs on, such as
  "Uses Priya's Claude login", or "Uses your Claude login" to Priya.
- The composer attaches files to a message.
- The composer shows a notice when the user has no login for the agent of
  the chosen model (decision 33). It shows no such notice when the message
  runs on the login of another member.
- The first message of a new workspace creates the workspace, as
  [Create a workspace](workspaces-and-sandboxes.md#create-a-workspace)
  says. The app accepts that message before the sandbox is ready
  (decision 14).
- After the first start of a workspace succeeds, the app also accepts a
  message while the sandbox is not ready, such as during a resume
  (decision 14).
- The workspace keeps such a message, and gives it to the agent when the
  sandbox is ready.
- A message that waits for the sandbox shows that it waits. A queue in the
  browser was rejected, because a closed tab would lose the message.
- Until the first start of a new workspace succeeds, the composer of each
  session keeps a later message as an unsent draft (decision 130).
- Send waits for such a draft until the first start succeeds. A short
  reason beside Send says that the user can send the message when the
  sandbox is ready.
- After the first start succeeds, the user sends the draft. The app never
  sends a draft on its own.
- Until the first start succeeds, the workspace refuses each later message
  and each Try again of a turn, in every session. It answers with HTTP 409
  and the error code `workspace_starting` (decision 130).
- Until then, a repeat of an accepted message, with the same message ID,
  still succeeds.
- When a tab gets the `workspace_starting` error, its composer keeps the
  message as an unsent draft.
- Reason: a failed first start removes the workspace, as
  [Create a workspace](workspaces-and-sandboxes.md#create-a-workspace)
  says. Acceptance of later messages during the first start was rejected,
  because the removal would leave those accepted messages with no way back
  to their senders.
- While the login of the starter can be used, a message that any member
  sends during a turn joins that turn. It goes to the agent at once, and the
  agent reads it at its next tool call.
- In a turn without tool calls, the agent reads such a message when the
  turn ends.
- A message that the workspace accepted stays in its session, also when the
  login of the starter is gone later. A turn that needs that login then
  fails and names the cause. Try again can then start a new session.
- Stop interrupts the running turn. The chat shows an interrupted turn as
  stopped, not as an error.
- The chat names the member who pressed Stop: "Priya stopped the agent",
  or "You stopped the agent" to Priya (decision 72). The workspace
  records that member when the Stop request arrives. The runner cannot
  set it, because agent code runs on the same cloud computer.
- A turn that stops with no Stop request, such as when the cloud
  computer stops, shows "The agent stopped".
- While the login of the starter can be used, the next message after a stop
  continues the same session.
- A turn that fails names the cause, and Try again retries the turn.
- Try again can retry only the newest turn of a session, and only when that
  turn failed (decision 97). It sends the retry message that the failure
  names.
- The session record names that message in `retryMessageId`. In every
  other case, the field holds null, also after a refused end. Each tab gets
  the record from the session routes and the `session.updated` events.
- A message or a Try again that starts a new session also sets
  `retryMessageId` of the first session to null.
- The chat shows Try again only on the failed turn whose retry message the
  record names.
- The retry route refuses each other message of the session with HTTP 409
  and the error code `retry_not_available`. The chat then says in plain
  words that only the newest failed request can run again.
- Reason: a tab that missed newer events can still show an older Try again.
  A check in the chat alone was rejected, because such a tab could send an
  older message again. The agent would then answer out of order.
- After the first answer of the agent in a new workspace, the app asks the
  agent for a title of three to five words. The chat does not show that
  request.
- The workspace then takes the title as its name.

## What the chat shows

- The chat history shows also while the sandbox is stopped or starting.
- An archived workspace shows its chat read-only (decision 16).
- The chat shows a starting state until the agent runner reports that the
  agent can take a message.
- While the agent thinks and has no text yet, the chat shows a thinking
  state.
- Agent text reaches the open tabs while the agent writes it, not only at
  the end of the turn.
- While a turn runs, the chat shows the time since the turn started, and
  Stop sits beside Send.
- A finished turn ends with its duration and the files that it changed.
- When the runner cannot tell which files a turn changed, its end shows
  "Changed files unavailable" in place of the files (decision 109). The
  turn still shows as finished or stopped, not as failed.
- The chat never says that such a turn changed no files.
- Reason: the agent finished its work, and only the list of its files is
  missing. An empty list was rejected, because it says that the turn
  changed no files. A failed turn was rejected, because it shows a failure
  for finished work.
- A tool detail and a turn file list give a count of data that their limits omit.
- A refused runner event shows one chat line that names the lost data, unless
  it is a [lost workspace update](agent-runner.md#lost-workspace-updates).
  Such a line among the work of a turn folds with that work (decision 151).
- The chat hides the messages that the SDK adds on its own, such as
  "[Request interrupted by user]".
- Each result of the agent shows with the messages that it answers. One
  result can answer more than one message.

### The work of a turn

- While a turn runs, each agent message shows in full. Each run of tool
  calls gets its own line that folds it, such as "3 tool calls".
- When a turn ends, also when it stops or fails, the work before its answer
  folds into one line (decision 150).
- Reason: the answer of a long turn stays easy to find. A fold while the
  turn runs was rejected, because the user watches the agent work.
- The work of a turn is its agent messages and its tool calls. The results
  of its [Mac commands](agent-tools.md#mac-commands) and the lines of its
  refused events are part of that work, at their place (decision 151).
- Reason: the turn stays as short as in Conductor. A command result or a
  line of a refused event that stays in view between two folds was rejected.
- A message that a member sends during a turn stays in view. It starts a
  new part of the turn, with its own answer and its own fold.
- The answer of a part is its last agent message, with the agent messages
  directly before it. A part with no agent message has no fold.
- The answer and the work after it stay in view, such as the tool calls
  that a stop cut off. The end of the turn stays in view too.
- The line of the fold counts the tool calls and the messages, such as
  "8 tool calls, 7 messages". It leaves out a zero count.
- As on the line of a run of tool calls, the line of the fold shows the kinds
  of tool. It also shows the total size of the output that the runner left
  out. Command results and lines of refused events add no count and no mark.
- The fold starts closed. A click opens or closes it, and the fold keeps
  that choice while the chat shows it.
- An open fold lists its steps in order, with one line for each tool call
  and each message. A click opens a message line to its full text.
- When the user opens or closes a fold or a run of tool calls, its line
  stays in place. Its list opens or closes below the line.

## Events

- The browser gets chat events only in the app's own event type. No SDK
  event type and no provider event type reaches the browser.
- Reason: one event type serves both agents, and the web app needs no
  change when an SDK changes its events.
- Every open tab of a workspace gets the same events in the same order.
- A tab that opens gets the stored history first, then the live events.
- The Durable Object of the workspace stores every event, so the chat
  survives a stop of the sandbox.
- A tab keeps the chat of each workspace that it showed in memory. A
  return to that workspace shows the chat at once, then gets only the new
  events (decision 87).
- A reload or a new tab starts empty. No chat stays on the disk of the
  device.
- A cache on the disk was rejected, because the chat, with its code and
  any secret that an agent printed, would stay on the device.
