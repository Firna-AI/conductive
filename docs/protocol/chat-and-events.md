# Chat and events

This doc holds the requirements and the decisions in force for the chat of
a workspace. It covers the sessions, the messages, the agent runner in the
sandbox, and the events that reach the browser. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
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
- The user can rename a session.
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
    [Lost workspace updates](#lost-workspace-updates) says
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
- Reason: the composer names the login of each message before the send. A
  record without the share setting was rejected, because the composer then
  names the login of the starter until the send.
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
- The app also accepts a later message while the sandbox is not ready
  (decisions 14 and 130). Examples are the first start, a resume, and the
  error state of a failed first start.
- The workspace keeps such a message, and gives it to the agent when the
  sandbox is ready. The agent of each session gets these messages in the
  order that the workspace accepted them (decision 130).
- A message that waits for the sandbox shows that it waits. A queue in the
  browser was rejected, because a closed tab would lose the message.
- Reason: a failed first start keeps its workspace and its queued messages,
  as [Create a workspace](workspaces-and-sandboxes.md#create-a-workspace)
  says. So members can add work at once, and an accepted message survives
  a reload of the tab. A hold of later messages in the composer until the
  first start succeeds was rejected for these reasons.
- While the login of the starter can be used, a message that the starter
  sends during a turn joins that turn. A message of another member joins it
  too while the starter shares the login. Such a message goes to the agent
  at once, and the agent reads it at its next tool call.
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
- A refused runner event shows one chat line that names the lost data,
  unless it is a [lost workspace update](#lost-workspace-updates).
- The chat hides the messages that the SDK adds on its own, such as
  "[Request interrupted by user]".
- Each result of the agent shows with the messages that it answers. One
  result can answer more than one message.

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

## The agent runner

- The runner starts with the sandbox, and starts again after each resume.
- The runner opens one outbound WebSocket to the Durable Object of its
  workspace, at `/v1/runner` on `api.conductive.build`, the hostname for
  machines. It proves itself with the workspace token.
- The runner connection carries a protocol version. The Durable Object
  serves each version that a live org image or sandbox can hold.
- Each build of the org image installs the newest runner. Reason: a stopped
  sandbox can resume weeks later with an old runner.
- A connection to the runner through a Boat port address was rejected,
  because it ties the runner to Boat.
- The runner numbers each event, and keeps it until the Durable Object
  confirms it.
- A dropped connection loses no event. A resent event shows once.
- A complete numbered runner event envelope holds at most 1 MiB, or
  1,048,576 bytes, of compact UTF-8 JSON (decision 76).
- The limit measures `JSON.stringify` of the complete runner event envelope.
  It includes the stream ID, event number, timestamp, payload, escapes, and delimiters.
- The limit excludes WebSocket framing and the workspace storage wrapper.
  Reason: the remaining storage value budget holds that wrapper.
- Each tool detail holds at most 64 KiB, or 65,536 bytes, of serialized UTF-8 JSON.
  The count includes its surrounding quotes and JSON escapes.
- The runner keeps the longest detail prefix that fits that limit.
  It replaces lone UTF-16 surrogates with U+FFFD before it counts or truncates text.
- A prefix never splits a Unicode code point.
  The omitted detail count measures source UTF-8 bytes before JSON escaping.
- The count applies to the complete source detail of that tool update.
  It does not add the counts of previous updates.
- A null detail stays null and has an omitted count of zero.
  A complete detail also has an omitted count of zero.
- A detail has no inserted omission notice. Its count carries that information.
- An end-of-turn file list keeps a prefix of at most 200 unique-path entries.
  Its serialized UTF-8 JSON array also holds at most 256 KiB, or 262,144 bytes.
- That byte count includes brackets, commas, and escapes.
  Each entry stays whole. The omitted file count equals the full count minus the kept count.
- Both omission counts are non-negative safe integers.
  Reason: bounded excerpts keep tool output and turn summaries within the event budget.
- A `turn.completed` event carries `filesUnavailable: true` when the runner
  cannot tell which files the turn changed (decision 109). Examples are a
  failed read of the repository, and a restart that ends a started turn.
- With the mark, `files` is empty and `omittedFileCount` is 0. These values
  then mean an unknown list. Without the mark, the same values mean that
  the turn changed no files.
- The mark never changes the state of the end, `finished` or `stopped`.
- A permanent refusal has one of three reasons: too large, invalid, or turn not active.
  The workspace stores one small refusal marker before it confirms that runner event.
- The marker names the runner stream, runner event number, event type, and reason.
  An invalid discriminator uses `unknown` as its type.
- A marker includes verified session and turn IDs, or null when no verified context exists.
  It never copies the refused payload.
- The marker belongs only to workspace chat events. The runner cannot send it.
- A confirmed marker advances the runner cursor and removes that event from its outbox.
  A duplicate produces no second marker and no second chat line.
- Reason: one bad event must not stop all later events (decision 76).
- A refused end-of-turn event still ends its active turn.
  The marker shows that the terminal data was lost.
- Turn not active means that the event names a turn that never started (decision 104).
  The workspace stores each valid late event of a turn that started and has ended, in that turn.
- A late event never reopens its turn or changes its end.
  The active turn of its session stays the same.
- The chat shows that turn as ended. A tool that was running in it shows as stopped.
- Reason: after a resume, the runner sends the unconfirmed events of an ended turn again.
  A refusal of these events was rejected, because it lost real agent text.
- A storage or network failure closes the connection without a confirmation.
  It remains retryable. It never becomes a permanent refusal.
- The Durable Object forwards each message, each message during a turn,
  each interrupt, and each change of the model or the effort to the runner.
- Each turn also brings the agent login of the starter of its session, as
  [Agent logins in a sandbox](access-and-security.md#agent-logins-in-a-sandbox)
  says.
- Each turn that the runner accepts gets exactly one end: `turn.completed`
  or `turn.failed`. This holds also when Stop, a shutdown, or a crash of
  the runner comes before the agent starts.
- The runner keeps a record of each accepted turn across a crash and a
  restart, until the workspace confirms the end of the turn. The workspace
  sends no command for a turn after it stores the end of that turn.
- At a shutdown, the runner sends a stopped end for each accepted turn that
  has no end. After a restart, it does the same for each turn that it
  accepted before the restart. It starts no agent for such a turn.
- A resent turn command or Stop that finds the record of its turn starts
  nothing and sends no second end.
- A Stop of a turn that the runner does not know gets one stopped end. The
  runner keeps a record of that turn too.
- Reason: work that Stop or a shutdown ended must not run later. A list of
  waiting turns only in memory was rejected, because a crash loses it, and
  the resent turn then runs.
- When a read of the repository or a save by the runner fails during a
  step, the runner still ends that step (decision 109):
  - A turn that cannot start ends with `turn.failed` and its cause.
  - A turn whose changed files the runner cannot read ends with
    `filesUnavailable: true`.
  - After a connect, a failed scan of the repository does not stop
    `runner.ready`. The runner sends `files.unavailable` first, as
    [Files and changes](workspaces-and-sandboxes.md#files-and-changes)
    says. It then accepts commands.
- Reason: one failed read must not leave a turn running with no agent, or
  the chat in its starting state. An exit of the runner after such a
  failure was rejected, because it loses each running turn, and a lasting
  failure repeats the exit.
- The runner also reports the file tree and the changes of its workspace,
  and reads files and diffs on request, as
  [Files and changes](workspaces-and-sandboxes.md#files-and-changes) says.
  File results are not part of the chat history.

### Lost workspace updates

- The file tree, the changes list, the start steps, and the workspace name
  belong to no session. A later full report of the same kind replaces each
  of them. But a report of the workspace name sets that name only while
  the workspace has no name, as
  [Workspace and session names](#workspace-and-session-names) says.
- When the workspace refuses an update of one of these kinds, the update is
  lost. The workspace stores its marker. Then it asks the runner once for a
  fresh full report of that kind (decision 96).
- The browser shows nothing for that marker. A notice shows beside the
  affected data only when the repair fails. A newer complete report of that
  kind clears the notice.
- Reason: only the latest full report matters. A notice for each lost update
  was rejected.
- The request is a `report.refresh` command with a `commandId` and a `kind`.
  The kind is `files.snapshot`, `changes.updated`, `start.updated`, or
  `workspace.title`.
- The workspace asks for a full file tree after a refused tree delta. It asks
  for no report after a refused event of any other type.
- Each kind has at most one open request. After a further refusal of that
  kind, the workspace sends no second request.
- A stored complete report of that kind ends the repair, also a failed one.
  A report of the workspace name that comes when the workspace already has
  a name also ends the repair, because it can change nothing. It ends no
  repair of another kind. After the next refusal of that kind, the
  workspace asks for a new report, with a new command ID.
- A replacement is a later full report of the same kind.
  [Files and changes](workspaces-and-sandboxes.md#files-and-changes) says
  which file reports count as replacements.
- The repair fails when the workspace refuses a replacement too, for any
  reason. Only the marker of such a replacement carries `repairFailed: true`.
- Each new connection gets the open request again, with the same command ID.
  A repeated command ID is the same request, not a new one.
- After a failed repair, no new connection gets the request again.
- The workspace stores the marker and the open request together. A storage
  failure stores neither, and the update stays unconfirmed.
- When a refusal makes a new request, the workspace confirms the refused
  update only after the request goes out. Until then, no confirm and no
  welcome covers that update.
- The workspace sends a request after the `welcome`, also before
  `runner.ready` and during a running turn. A request needs no agent login.
- The runner answers each request with a full report of its kind, also
  during a running turn. When it cannot read the repository, it answers a
  request for a file tree or a changes list with `files.unavailable`, as
  [Files and changes](workspaces-and-sandboxes.md#files-and-changes) says.
