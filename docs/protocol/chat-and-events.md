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
- Each turn runs on the agent login of its sender, the person who sent the
  message (decision 49).
- A turn on the login of the workspace owner was rejected, because one
  member could then spend the login of another member.
- When the next turn has another sender, the agent runs with the login of
  that sender. The session keeps its history.
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
- The composer attaches files to a message.
- The composer shows a notice when the org has no Boat key (decision 33).
  A Boat key that Boat refuses counts as no key.
- The composer shows a notice when the user has no login for the agent of
  the chosen model.
- The app accepts a message before the sandbox is ready. The workspace
  keeps the message, and gives it to the agent when the sandbox is ready
  (decision 14).
- A message that waits for the sandbox shows that it waits. A queue in the
  browser was rejected, because a closed tab would lose the message.
- A message sent during a turn goes to the agent at once. The agent reads it
  at its next tool call.
- In a turn without tool calls, the agent reads such a message when the
  turn ends.
- Stop interrupts the running turn. The chat shows an interrupted turn as
  stopped, not as an error.
- The chat names the member who pressed Stop: "Priya stopped the agent",
  or "You stopped the agent" to Priya (decision 72). The workspace
  records that member when the Stop request arrives. The runner cannot
  set it, because agent code runs on the same cloud computer.
- A turn that stops with no Stop request, such as when the cloud
  computer stops, shows "The agent stopped".
- The next message after a stop continues the same session.
- A turn that fails names the cause, and Try again retries the turn.
- Try again can retry only the newest turn of a session, and only when that
  turn failed (decision 97). It sends the retry message that the failure
  names.
- The session record names that message in `retryMessageId`. In every
  other case, the field holds null, also after a refused end. Each tab gets
  the record from the session routes and the `session.updated` events.
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
  workspace, on the hostname for machines. It proves itself with the
  workspace token.
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
- Each turn also brings the login of its sender, as
  [Agent logins in a sandbox](access-and-security.md#agent-logins-in-a-sandbox)
  says.
- The runner also reports the file tree and the changes of its workspace,
  and reads files and diffs on request, as
  [Files and changes](workspaces-and-sandboxes.md#files-and-changes) says.
  File results are not part of the chat history.

### Lost workspace updates

- The file tree, the changes list, the start steps, and the workspace name
  belong to no session. A later full report of the same kind replaces each
  of them.
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
  It ends no repair of another kind. After the next refusal of that kind, the
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
  during a running turn.
