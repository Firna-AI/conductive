# Chat and events

This doc holds the requirements and the decisions in force for the chat of
a workspace. It covers the messages, what the chat shows, and the events
that reach the browser. Linked pages cover
[the agents and the sessions](agents-and-sessions.md),
[the workspace links in chat](workspace-links.md),
[the copy of a session transcript](session-transcripts.md), and
[the agent runner](agent-runner.md) in the sandbox. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A background work decision number names a decision of the change
that keeps a turn open for background work, as
[Agent runner](agent-runner.md) says.

## Agents

- [Agents](agents-and-sessions.md#agents) says which agents the app
  offers, where they run, and whose agent login each session uses.
- [Agent instructions](agent-instructions.md) states the text that each
  session gets apart from the messages, and the sender line of each
  message.

## Names in the product

- [Names in the product](agents-and-sessions.md#names-in-the-product) says
  how user-facing text names the agents.

## Sessions

- [Sessions](agents-and-sessions.md#sessions) says how the sessions of a
  workspace show as tabs, take their titles, and close.

### The tab row

- [The tab row](agents-and-sessions.md#the-tab-row) says how the tabs of
  the centre column keep their order, move, and open their tab menu.

## Workspace and session names

- [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says when the app names a workspace or a session.

## Messages

[Messages and attachments](messages-and-attachments.md) holds the composer, turns, retries, titles, and attached files.

### Messages from the bar

[Messages from the bar](messages-and-attachments.md#messages-from-the-bar)
holds how an agent action of the pull request bar sends its fixed prompt.

## Workspace links

- [Workspace links](workspace-links.md) says how chat text and the message
  field of each composer show a link to a workspace of the org, as a chip.

## File mentions

- [File mentions](file-mentions.md) says how the composer of a workspace
  chat lists the files and folders of the workspace after `@`, and how a
  message shows them as chips.

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
- A Claude turn that waits for its
  [background work](agent-runner.md#background-work) shows as any running
  turn. The output of the agent after each notification joins that turn.
- The chat shows no line and no workspace state for the wait (background
  work decision 3). A line in the running turn that names the work, and a
  workspace state such as "waiting", were not chosen.
- A finished turn ends with its duration and the files that it changed.
- The end shows at most 8 files on desktop and 5 on a phone. A
  "Show N more" button after them shows all the listed files. The count of
  files that the runner left out shows only after that button.
- Reason: a turn that changes many files pushed its reply out of view
  (Cal, 12 November 2026). A list of all files without a button was
  rejected for that reason.
- A turn that ended at the time limit of background work shows
  "Background work stopped at the time limit" in its end, above its
  duration and its files (background work decision 3). The
  [mockup catalogue](../mockups/catalogue.md) draws it at
  `app/chat/background-limit`.
- The line names no length of the limit. Reason: the member cannot change
  the limit.
- A toast at the limit was rejected, because a routine run has no open tab.
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
- After [Continue](continue.md), each session shows one note at its place,
  with the member who pressed Continue, the new branch, and its base. To
  that member it says "You". The note reaches no agent.
- The chat hides the messages that the SDK adds on its own, such as
  "[Request interrupted by user]".
- Each result of the agent shows with the messages that it answers. One
  result can answer more than one message.

### The scroll of the chat

- At the bottom, the chat keeps the newest message in view.
- While the user reads higher up, the row that they read keeps its place.
  A message of another member, the output of an agent, and a fold that
  closes do not move it.
- A message that the user sends from the chat goes to the bottom of the
  chat, also while the user reads higher up. This applies to the composer
  and to the fixed prompts of the pull request bar, such as Create PR.
- A message that the same member sends from another tab or device does
  not move this chat.
- Reason: the user who sends a message wants to see it and its answer. A
  scroll for each message of the workspace was rejected, because it takes
  the place of a reader who reads an earlier part of the chat.
- Each session tab keeps the reader's place while another tab, another
  workspace, or another page of the app shows. When the tab shows again, the
  row that the user read is at the same place. A chat that was at the bottom
  shows the bottom again, with the output that came in the meantime. When
  the read row is gone, the chat shows the bottom.
- The places stay while the browser tab keeps the workspace. A reload
  forgets them, and each chat then opens at the bottom.
- Reason: the user who looks at another tab comes back to read on. A saved
  scroll offset was rejected, because output that comes in the meantime
  moves the read row. A place that stays after a reload was rejected,
  because it needs browser storage that each sign-out must clear. The user
  chose both on 13 November 2026.
- A session tab that closes forgets its place, also when another member
  closes its session. When the session opens again, such as from the
  session history, it shows the bottom.
- Reason: a reopened tab is a new tab to the user. The user chose this on
  13 November 2026.

### The work of a turn

- While a turn runs, each agent message shows in full. Each run of tool
  calls gets its own line that folds it, such as "3 tool calls".
- While a turn runs, only its newest run of tool calls shows its calls. That
  run stays open between two calls and after a message that follows it,
  until a newer run starts or the turn ends. Each earlier run of the turn is
  folded.
- Reason: the user watches the newest work, and the earlier work stays
  short. A run that folds when its calls are done was rejected, because it
  closed and opened again at each call. A run that folds when a message
  follows it, and every run open until the turn ends, were rejected too.
- A click opens or closes a run of tool calls, and the run keeps that
  choice while the chat shows it.
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
- The line of a tool call gives a verb for its kind, its target, and then
  its detail, such as "Ran `npm test`".
- The target of a call to a tool of an MCP server, such as the computer
  tools, is the name of that tool without its server, such as
  `get_window_state`. Its detail is the subject of the call, such as a
  query, a path, or an address.
- Reason: a subject alone, such as `menu`, does not say which tool ran,
  and a full name, such as `mcp__computer__get_window_state`, is hard to
  read. Words of the app for each computer tool were rejected, because
  they need a list of tool names that the provider can change.

## Session transcripts

- [Session transcripts](session-transcripts.md) says how a member copies
  the chat of a session as Markdown, concise or full, and what each copy
  holds.

## Events

- The browser gets chat events only in the app's own event type. No SDK
  event type and no provider event type reaches the browser.
- Reason: one event type serves both agents, and the web app needs no
  change when an SDK changes its events.
- Every open tab of a workspace gets the same events in the same order.
- A tab that shows a session gets the newest part of its stored history
  first. The live events start after that part, and the earlier history
  loads above it (decision 280).
- Reason: the newest messages and the work of a running turn show after
  one read, also in a long session. Live events after the full history
  were rejected, because a long session then showed nothing new until its
  whole history had loaded.
- The chat shows each event of a session once and in event order, also
  when earlier history arrives after newer events.
- While the earlier history loads, the chat says so above the messages
  that it shows.
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

[The agent runner](agent-runner.md) states its connection, events, limits, turns, the background work of Claude turns, and report repairs.
