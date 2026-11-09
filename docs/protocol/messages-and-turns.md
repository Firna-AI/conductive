# Messages and turns

This doc holds the requirements and the decisions in force for the
messages of a chat and what the chat shows of each turn. It is a page of
[Chat and events](chat-and-events.md), which holds the agents, the
sessions, their names, and the events that reach the browser.
[Agent runner](agent-runner.md) states the requirements of the agent
runner in the sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

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
  starts a new session on that member's own login (decision 115). The same
  happens when the starter does not share the login (decision 116). A Try
  again of another member does the same. A login cannot be used, for
  example, after the starter leaves the org or removes the login.
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
- The same check shows in `loginShared` whether the starter shares the
  login with the other members. Every member reads the same value. Each tab
  gets a changed value. `loginAvailable` stays true for a login that only
  the starter can use.
- The workspace does not watch the logins or their share settings for
  changes. So a tab can show an old result until the next check.
- When the record already shows that the login of the starter cannot be
  used, or that the starter does not share it, the composer of another
  member says before the send that the message starts a new session. When
  that member has no login for the agent, the composer shows the notice of
  a missing login instead.
- Reason: the composer shows before the send which login a message uses. A
  record without the share setting was rejected, because the composer then
  names the login of the starter until the send.
- When a message runs on the login of another member, the composer names
  that member inside the message box, such as "Priya's login". A line under
  the box was rejected, because the box then moved between sessions.
- The composer names no login when a message runs on the user's own login.
  A name for the own login was rejected, because it tells the user nothing
  new.
- The composer attaches files to a message.
- [The send key](create-a-workspace.md#the-send-key) gives the key that
  sends a message from the composer (decision 143).
- The composer shows a notice when the user has no login for the agent of
  the chosen model (decision 33). It shows no such notice when the message
  runs on the login of another member.
- The first message of a new workspace creates the workspace, as
  [Create a workspace](create-a-workspace.md)
  says. The app accepts that message before the sandbox is ready
  (decision 14).
- The app also accepts a later message while the sandbox is not ready
  (decisions 14 and 130). Examples are the first start, a resume, and the
  error state of a failed first start.
- The workspace keeps such a message, and gives it to the agent when the
  sandbox is ready. The agent of each session gets these messages in the
  order that the workspace accepted them (decision 130).
- A message that waits for the sandbox shows that it waits. A queue in the
  browser was rejected, because a closed tab would lose the message.
- Reason: a failed first start keeps its workspace and its queued messages,
  as [Create a workspace](create-a-workspace.md#a-failed-first-start)
  says. So members can add work at once, and an accepted message survives
  a reload of the tab. A hold of later messages in the composer until the
  first start succeeds was rejected for these reasons.
- While the login of the starter can be used, a message that the starter
  sends during a turn joins that turn. A message of another member joins it
  too while the starter shares the login. Such a message goes to the agent
  at once, and the agent reads it at its next tool call.
- The composer uses its placeholder to show that a message steers the
  running turn. It shows no steer hint under the message box.
  Reason: a hint under the box moves it when the user starts to type.
- In a turn without tool calls, the agent reads such a message when the
  turn ends.
- A message that the workspace accepted stays in its session, also when the
  login of the starter is gone later. The same holds for a message of
  another member when the starter stops sharing the login later. A turn
  that needs that login then fails and names the cause. Try again can then
  start a new session.
- Stop interrupts the running turn. The chat shows an interrupted turn as
  stopped, not as an error.
- The chat names the member who pressed Stop: "Priya stopped the agent",
  or "You stopped the agent" to Priya (decision 72). The workspace
  records that member when the Stop request arrives. The runner cannot
  set it, because agent code runs on the same cloud computer.
- A turn that stops with no Stop request, such as when the cloud
  computer stops, shows "The agent stopped".
- While the login of the starter can be used, the next message of the
  starter after a stop continues the same session. The next message of
  another member does the same while the starter shares the login.
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
- When the app accepts the first message of a new workspace, it asks a
  small model of Workers AI for a title (decision 184). The request asks
  for three to five words. Workers AI is the model service of Cloudflare,
  on the account that hosts the app.
- The model writes the title from the text of that message. The request
  holds no other data of the workspace. It uses no agent login of a
  member. The chat does not show it.
- The reply to the message does not wait for the title. The workspace
  then takes the title as its name, as
  [Workspace and session names](chat-and-events.md#workspace-and-session-names)
  says.
- When the request fails, the name of the workspace does not change. The
  app then asks again when it accepts the next message with text in the
  workspace. It asks only while the workspace has no name.
- A later request also uses the text of the first message. Only when the
  first message has no text does it use the text of the message that
  starts it.
- A first message with no text starts no request. The next message with
  text in the workspace then starts it.
- Reason: the name shows within seconds, while the sandbox starts, and the
  operator chooses the model and its speed.
- A request in the sandbox on the agent login of the member was rejected.
  The name then waits for the sandbox, and each title spends the
  subscription of the member.
- A Claude model with an API key of the operator was rejected, because it
  sends each first message to another company. A name from the first
  words of the message, with no model, was rejected, because such names
  are weaker.

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
