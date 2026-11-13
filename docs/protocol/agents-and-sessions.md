# Agents and sessions

This doc holds the requirements and the decisions in force for the agents
and the sessions of a workspace. It covers the agents and their logins,
the names of the agents in the product, the sessions and their links, and
the names of workspaces and sessions. It belongs to
[Chat and events](chat-and-events.md). The terms are those of the
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
  - with a model of the other agent, in a session that has a message
  - with the first message of a new workspace
  - with a message that starts a new session, as
    [Messages](messages-and-attachments.md#messages) says
  - through a call of the agent tools in a turn that the member sent, as
    [The sender](session-calls.md#the-sender) says
- A routine run starts the first session of its workspace in the name of
  the routine owner, as
  [A run acts as its owner](routine-runs.md#a-run-acts-as-its-owner) says.
- The session record names its starter in `startedBy`. A session without a
  known starter has no login that can be used.
- While the starter shares the login, the messages of the other members
  run on it too. So the other members spend the login of the starter
  (decision 116).
- Reason: each change of login rewrites the prompt cache of the
  conversation. A login for each sender was rejected for that reason.
- The login of the workspace owner for all sessions was rejected. Reason:
  each member who starts a session spends their own login.
- [Access and security](isolation.md#agent-logins-in-a-sandbox)
  states how a turn uses a login, its share setting, and its risk.
- A session keeps its memory across a stop and a resume of the sandbox.
- A Codex session keeps its conversation when its starter changes between
  an OpenAI API key and a ChatGPT sign-in.
- When Codex refuses to resume because the saved model provider differs
  from the current provider or is no longer configured, the session
  continues in a fork.
- The fork keeps the earlier messages. The session keeps the same chat.
- The session saves the fork's conversation ID. Later turns use that ID,
  also after a restart of the runner.
- A refused resume for another cause, or a refused fork, fails the turn
  with that cause.

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
  [Workspace and session names](workspace-and-session-names.md) says when
  the app gives it a title.
- A `create_session` call of the agent tools can give a new session a
  title, as [Start a session](session-calls.md#start-a-session) says.
- When the workspace takes a title as its name, as
  [Messages](messages-and-attachments.md#messages) says, the first session takes the
  title too (decision 181).
- Each other session takes its title from the first message with text that
  the workspace accepts in that session (decision 181). The title is the
  first line with text of that message.
- A message with no text, such as a message with only a screenshot, gives
  no title. A message whose text holds only the mentions of its own
  attached files counts as a message with no text.
- In a title from a message, each mention of one of its attached files
  becomes the name of the file (decision 262 D). Reason: a path makes a
  poor title. A title with the copy path of each file was rejected for
  that reason.
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
- The history button shows at the far right of the tab row only while it
  lists at least one closed session.
- An entry of the history reopens its session as a tab, with its chat.

### The tab row

- The tab row of the centre column shows the session tabs and the file and
  diff tabs in one order (decision 186).
- Each member has their own order in each workspace. The order stays after
  a reload. The other devices of that member load the same order.
- A new tab of any kind opens at the end of the row. This holds also for a
  session that the history reopens, and for a new
  [temporary tab](temporary-tabs.md).
- A press that replaces the file or the diff of the temporary tab leaves
  the tab in its place. This holds also when later tabs stand after it. A
  keep does not move the tab either.
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
- The tab menu of a session tab holds three groups, with a line between
  them: Rename session, then Copy link, Copy concise transcript, and Copy
  full transcript, then Move left and Move right. The tab menu of a kept
  file or diff tab holds Move left and Move right.
- Copy link copies the link of the session of its tab, as
  [Session links](#session-links) says. The user added it on 12 November
  2026.
- The tab menu of the temporary tab holds two groups, with a line between
  them: Keep open, then Move left and Move right (decision 286 B).
- Reason: the tab menu groups its items by kind (decision 188).
- [Session transcripts](session-transcripts.md) states what each copy item
  copies (decisions 213 and 215).
- Move left and Move right move the tab one place in the row. On the first
  tab, Move left is off. On the last tab, Move right is off.
- After a move from the tab menu, a screen reader user hears the name of
  the tab and its new place, such as "Address autocomplete moves to place
  2 of 4". The focus then goes back to the tab.
- Keep open keeps the temporary tab, and the tab stays in its place. The
  focus then goes back to the tab. A screen reader user hears that the tab
  stays open, such as "README.md stays open".
- [Keep a tab](temporary-tabs.md#keep-a-tab) says why the menu holds Keep
  open.
- A move of the temporary tab to another place keeps it (decision
  287 B). A move of another tab leaves it temporary. This holds for a drag, Move left, and Move right. A drag that
  Escape cancels, or that ends in the same place, leaves the tab temporary.
- Reason: a move shows that the user wants the file at that place. A
  temporary tab that stays temporary after a move was rejected. The next
  press would then replace the file at that place.
- A drag that keeps the tab while Move left and Move right do not was
  rejected. Two ways to make one move would then act differently.
- Rename session opens a field for the title in that tab. The shown tab
  does not change.
- In the app, the tab menu is the one way to rename a session. A Rename
  button on the shown session tab was rejected, because the tab menu
  already holds Rename session. An agent can also rename a session, as
  [Rename a session](session-management.md#rename-a-session) says.
- Keys that move a tab were rejected, because the user chose the menu. Alt
  with Left or Right also goes Back and Forward in browsers on Windows and
  Linux.
- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, moves no tab.
- The tab menu of a read-only workspace leaves out each item that changes
  the workspace, and keeps each item that changes nothing (decision 214).
  So the tab menu of a session tab there holds only Copy link, Copy
  concise transcript, and Copy full transcript. A file or diff tab there
  opens no tab menu.
- Reason: a read-only workspace accepts no change, but a member can still
  copy there, as
  [Read-only workspaces](session-transcripts.md#read-only-workspaces)
  says. The rule also covers each item that the menu gets later.
- So a read-only workspace also leaves out Keep open. The temporary tab
  there opens no tab menu either, and only a double-click keeps a tab
  (decision 286 B).
- The tab menu opens there in the same ways as in other workspaces. A long
  press on a phone opens it, but lifts no tab.
- An item that the place of a tab rules out, such as Move left on the
  first tab, still shows, but off. An item that a read-only workspace
  leaves out does not show.
- The usual tab menu with Rename session, Move left, and Move right off was
  rejected for a read-only workspace, because these rows never turn on
  there.

### Session links

- Each session has a link: the address of the session at the app origin,
  such as
  `https://app.conductive.build/orgs/<org ID>/workspaces/<workspace ID>/sessions/<session ID>`.
- The link names the org, the workspace, and the session by their IDs, as
  the link of a workspace does. Reason: the file tabs already have
  addresses under their workspace.
- A session link opens its workspace and shows that session. The address
  then becomes the link of the workspace. Reason: the session tabs keep
  their behaviour, and the address does not follow the shown tab.
- A link to a closed or an unknown session opens the page of its
  workspace, as a workspace link does. When that workspace already shows,
  its shown tab stays. The link reopens no session.
- Reason: the members share the sessions of a workspace, so a reopen would
  show the tab again to every member.
- A session link in chat text shows as a session chip, as
  [Session chips](workspace-links.md#session-chips) says.
- The agent tools give the link of each session that they name, as
  [The calls](session-calls.md#the-calls) says.
- Copy link in the tab menu of a session tab copies the link of that
  session, also in the Mac app and in a read-only workspace. The link has
  the origin of the link of its workspace.
- The menu closes at the press. After the copy, a toast says "Link
  copied". When the copy fails, the toast says "The link didn't copy. Try
  again." These are the words of
  [Copy link](workspace-menu.md#copy-link) in the workspace menu.
- Copy link does not change the shown tab, as a copy of a transcript does
  not.
- Copy link in the workspace header still copies the link of the
  workspace, with no session. Reason: the header names the workspace.

## Workspace and session names

[Workspace and session names](workspace-and-session-names.md) holds these
requirements, with the title of a new workspace.
