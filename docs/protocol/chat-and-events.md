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
  of tool. It names the skills of its calls, as [Skill lines](#skill-lines)
  says. It also shows the total size of the output that the runner left
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

### Skill lines

- A skill is a folder with a `SKILL.md` file of instructions. An agent
  loads a skill when a task needs it.
- Each skill use of the agent of a session shows as a skill line, at its
  place among the tool calls of the turn (decision 277).
  [What counts as a skill use](#what-counts-as-a-skill-use) gives the rule
  for each agent.
- Reason: a member can check that the agent loaded the skills that the
  task needs. A skill row of its own, as in Conductor, was rejected.
  While the turn runs, such a row splits a run of tool calls in two. After
  the turn ends, it splits the one fold of the work of the turn.
- A toast or a status that goes away was rejected, because the chat
  history and the transcript copy do not keep it.
- A skill line shows a skill icon, then "Using skill" while its call runs,
  or "Used skill" after it. Then it shows the skill names, as the agent
  gives them, and the detail of the call (decision 279).
- A line with two or more names says "Using skills" or "Used skills".
- A failed or stopped skill line ends as every other call line ends.
- The detail of a Claude skill line holds the arguments of the call. The
  detail of a Codex skill line holds its command.
- Reason: the line starts with its verb, as every call line does. "Using
  skill" also stays true for a Claude skill that does its work in a
  separate agent. "Loading skill" and "Loaded skill" were rejected,
  because they are not true for such a skill.
- The words of Conductor, such as "brainstorming · Skill activated", were
  rejected, because they break the shape of the other call lines.
- A skill name in title case, as Conductor shows it, was rejected. A
  changed name can hide the real name of a plugin skill, such as
  `conductor:conductor`.
- A fold line is the line of a run of tool calls, or the line of the work
  of an ended turn. [The work of a turn](#the-work-of-a-turn) states both.
- Each fold line names the skills of the skill lines that it folds, after
  its counts (decision 277). Examples are
  "4 tool calls · Skill: brainstorming" and
  "8 tool calls, 7 messages · Skills: brainstorming, plans".
- The fold line names each skill once, in the order of first use. It names
  no skill of a failed or stopped skill line, because such a call loaded
  no skill.
- Among the icons of the kinds of tool, the fold line shows the skill icon
  for its skill lines.
- Reason: the names stay in view in every state, also while a run or the
  work of a turn is folded. A skill icon on the fold line with no name was
  rejected, because a closed fold then hides the name. The names on the
  end line of each turn were rejected, because a folded run hides them
  while the turn runs.
- The [mockup catalogue](../mockups/catalogue.md) draws skill lines at
  `app/chat/turns`, `app/chat/work`, and `app/chat/work/five-skills`.
  [The design of the chat](../mockups/design-chat.md) gives the layout of
  a fold line that wraps.

### What counts as a skill use

- A Claude skill use is a call of the skill tool of Claude (decision 277).
- A read of the `SKILL.md` file of a skill by Claude was rejected as a
  skill use. Claude seldom reads a skill file directly, and a repository
  that edits its skills would show false uses.
- Codex gives a list of the skills that it loaded. A Codex skill use is a
  command that Codex parses as a read of the `SKILL.md` file of a listed
  skill (decision 278). The skill name comes from that list.
- Reason: the chat names only the skills that Codex loads, by their Codex
  names. A skill use for each read of a file named `SKILL.md` was
  rejected. Such a rule also names templates, fixtures, and other files
  that Codex does not load. A folder name can also differ from the skill
  name.
- An instruction that asks Codex to name each skill that it loads was
  rejected. The line would then depend on the text of the model.
- Risk: when the agent reads a listed skill only to edit it, the read
  shows as a skill use too.
- The match compares the real paths of the files, after each link
  resolves. Reason: Codex lists a linked skill folder by the path of its
  target, but the agent reads the skill through the path of the link.
- A command whose read Codex cannot parse names no skill.
- A later read of a skill shows as a plain command when an earlier read
  of the turn loaded it. A failed read loads no skill. Reason: Codex reads
  a long `SKILL.md` file in parts, and one load gives one skill line. Each
  Claude skill call shows, because each call is a separate load.
- Until Codex gives its list, or when it gives none, each read of a skill
  file shows as a plain command. A missing list does not stop or fail the
  turn.
- Reason: a skill line only helps a member follow the work. So its failure
  must not stop the work.

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
