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
- While the starter shares the login, the messages of the other members
  run on it too. So the other members spend the login of the starter
  (decision 116).
- Reason: each change of login rewrites the prompt cache of the
  conversation. A login for each sender was rejected for that reason.
- The login of the workspace owner for all sessions was rejected. Reason:
  each member who starts a session spends their own login.
- [Access and security](access-and-security.md#agent-logins-in-a-sandbox)
  states how a login reaches the sandbox, its share setting, and its risk.
- A session keeps its memory across a stop and a resume of the sandbox.
- [Agent instructions](agent-instructions.md) states the text that each
  session gets apart from the messages, and the sender line of each
  message.

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
- The tab of a session shows the title of the session.
- A new session has no title, and its tab shows "Untitled".
  [Workspace and session names](#workspace-and-session-names) says when
  the app gives it a title.
- When the workspace takes a title as its name, as [Messages](#messages)
  says, the first session takes the title too (decision 181).
- Each other session takes its title from the first message with text that
  the workspace accepts in that session (decision 181). The title is the
  first line with text of that message.
- A message with no text, such as a message with only a screenshot, gives
  no title.
- In a title from a message, each run of spaces becomes one space. The app
  removes one final full stop, but it keeps an ellipsis.
- A title from a message holds at most 60 characters. The limit counts
  Unicode code points. The app cuts a longer line after its last whole
  word that fits the limit. When the first word does not fit, the app cuts
  the line at the limit.
- The user renames a session from its tab menu, as
  [The tab row](#the-tab-row) says.
- Reason: the first session does the task of the workspace, and each other
  session does the task of its own first message. A title request for each
  session was rejected, because the first message names that task with no
  model call.
- Each session has its own model picker.
- When one tab sends two edits of the same field of a session, the edit
  that the server commits last wins (decision 142).
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

### The tab row

- The tab row of the centre column shows the session tabs and the file and
  diff tabs in one order (decision 186).
- Each member has their own order in each workspace. The order stays after
  a reload. The other devices of that member load the same order.
- A new tab of any kind opens at the end of the row. This holds also for a
  session that the history reopens.
- The user can drag any tab to any place in the row.
- A row that keeps the sessions and the files in two groups was rejected,
  because a file could then never go before a session.
- A drag does not change the shown tab. Escape cancels a drag and keeps the
  order.
- On a phone, the row shows only the session tabs. A long press lifts a
  tab there.
- A move on a phone changes only the place of the moved session tab. Each
  file tab keeps its place.
- When the tabs do not fit at their minimum width, the row scrolls
  sideways (decision 187).
- The row scrolls a tab into view when the tab opens, when it becomes the
  shown tab, and after it moves.
- When the row gets narrower, it scrolls the shown tab back into view.
- A tab that opens without showing, such as a session that another member
  starts, does not push the shown tab out of view.
- A vertical turn of the mouse wheel over the row scrolls the row sideways.
  A sideways swipe, on a trackpad or with a finger, also scrolls it.
- A fade marks each end of the row that clips tabs.
- During a drag, the pointer near an end of the row scrolls the row, so a
  drop can reach every place.
- A menu of the hidden tabs was rejected, because the shown tab and the
  drop places could still hide. A row that wraps onto more lines was
  rejected, because the chat would move down when a tab opens.
- A right click on a tab opens its tab menu (decision 188).
- On a focused tab, Shift and F10, or the Menu key, also opens the tab
  menu. This holds on every system.
- On a phone, a long press that ends without a move opens the tab menu as
  a sheet.
- The tab menu of a session tab holds Rename session, then Move left and
  Move right. The tab menu of a file or diff tab holds Move left and Move
  right.
- Move left and Move right move the tab one place in the row. On the first
  tab, Move left is off. On the last tab, Move right is off.
- After a move from the tab menu, a screen reader user hears the name of
  the tab and its new place, such as "Address autocomplete moves to place
  2 of 4". The focus then goes back to the tab.
- Rename session opens a field for the title in that tab. The shown tab
  does not change.
- The tab menu is the one way to rename a session. A Rename button on the
  shown session tab was rejected, because the tab menu already holds
  Rename session.
- Keys that move a tab were rejected, because the user chose the menu. Alt
  with Left or Right also goes Back and Forward in browsers on Windows and
  Linux.
- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, moves no tab and opens no tab menu.

## Workspace and session names

- In this section, a name is the name of a workspace or the title of a
  session.
- A new workspace has no name (decision 182). Each new session has no name
  either (decision 185).
- The app shows "Untitled" in place of a missing name.
- In the workspace record, a missing name is null in `name`. In the session
  record, a missing name is null in `title`.
- An automatic name is a name that the app gives on its own. These names
  are automatic:
  - the title of a workspace, as [Messages](#messages) says
  - a workspace name that the agent runner reports, as
    [Lost workspace updates](agent-runner.md#lost-workspace-updates) says
  - the title that a session takes, as [Sessions](#sessions) says
- The app gives an automatic name only to a workspace or a session that has
  no name (decision 182). So no automatic name replaces a name that a
  member or the app gave.
- The app gives no automatic name in an archived workspace, or in a
  workspace of a deleted org.
- Reason: a missing name shows that no one named the workspace or the
  session yet. A text comparison with "New session" or the city name of
  the branch was rejected. A member can type the same text and then lose
  that name.
- Reason: an archived workspace shows its chat read-only (decision 16).

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
  [Workspace and session names](#workspace-and-session-names) says.
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
