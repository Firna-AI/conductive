# Agents and sessions

This doc holds the requirements and the decisions in force for the agents
and the sessions of a workspace. It covers the agents and their logins,
the names of the agents in the product, the sessions, and the names of
workspaces and sessions. It belongs to
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
  - with a model of the other agent
  - with the first message of a new workspace
  - with a message that starts a new session, as
    [Messages](chat-and-events.md#messages) says
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
- The tab of a session shows the title of the session.
- A new session has no title, and its tab shows "Untitled".
  [Workspace and session names](#workspace-and-session-names) says when
  the app gives it a title.
- When the workspace takes a title as its name, as
  [The title of a new workspace](#the-title-of-a-new-workspace) says, the
  first session takes the title too (decision 181).
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
- The history button shows at the far right of the tab row only while it
  lists at least one closed session.
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
  - the title of a workspace, as
    [The title of a new workspace](#the-title-of-a-new-workspace) says
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

### The title of a new workspace

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
