# Agents and sessions

This doc holds the requirements and the decisions in force for the agents
and the sessions of a workspace. It covers the agents and their logins,
their efforts, the names of the agents in the product, and the sessions
and their links. Linked pages cover [the tab row](tab-row.md),
[the names of workspaces and sessions](workspace-and-session-names.md),
and [Explain](explain.md).
It belongs to [Chat and events](chat-and-events.md). The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A title
image decision number names a decision of the change that leaves the
names of attached images out of titles, as
[Workspace and session names](workspace-and-session-names.md) says. An
org login decision number names a decision of the change that adds the
org logins, as [Tokens and secrets](tokens-and-secrets.md) says.

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
- Each session runs on one agent login, the login of the session: the
  personal login of its starter, or the org login of its org (decision
  105, org login decision 1 B). The starter is the member who started the
  session.
- A session takes the default login of its starter when it accepts its
  first message, as [The default login](org-logins.md#the-default-login)
  says. The starter of a session never changes. Its login never changes
  after its first message, so a session never moves to another login.
- A member starts a session in one of these ways:
  - with "+"
  - with a model of the other agent, in a session that has a message
  - with the first message of a new workspace
  - with a message that starts a new session, as
    [Messages](messages-and-attachments.md#messages) says
  - through a call of the agent tools in a turn that the member sent, as
    [The sender](session-calls.md#the-sender) says
  - with Explain on a selection of chat text, as [Explain](explain.md) says
- An automation run starts the first session of its workspace in the name of
  the automation owner, as
  [A run acts as its owner](automation-runs.md#a-run-acts-as-its-owner) says.
- The session record names its starter in `startedBy`, and its login in
  `login`: a member or the org. A stored session with messages but no
  login runs on the personal login of its starter. A session without a
  login and without a known starter has no login that can be used.
- While the starter shares a personal login, the messages of the other
  members run on it too. So the other members spend the login of the
  starter (decision 116). The messages of each member of the org run on
  the org login of a session.
- Reason: each change of login rewrites the prompt cache of the
  conversation. A login for each sender was rejected for that reason.
- The login of the workspace owner for all sessions was rejected. Reason:
  each member who starts a session spends their default login, not a login
  of the workspace owner.
- [Access and security](isolation.md#agent-logins-in-a-sandbox)
  states how a turn uses a login, and its risk.
  [The share setting](share-setting.md) states the share setting of a
  personal login.
- A session keeps its memory across a stop and a resume of the sandbox.
- A Codex session keeps its conversation when the kind of its login
  changes, such as from an OpenAI API key to a ChatGPT sign-in.
- When the saved model provider of the conversation differs from the
  current provider or is no longer configured, the session continues in
  a fork.
- The fork keeps the earlier messages. The session keeps the same chat.
- The session saves the fork's conversation ID. Later turns use that ID,
  also after a restart of the runner.
- A refused resume for another cause, or a refused fork, fails the turn
  with that cause.

## Efforts

- Each message runs at one effort of its model. The model list of the
  deployment gives the efforts of each model, from the lowest:
  None, Low, Medium, High, Extra high, Max, and Ultra.
- Codex runs each effort at the reasoning level of the same name. Codex
  Ultra is its maximum reasoning with automatic task delegation.
- Claude runs Ultra at the Max level, with Ultracode on. Ultracode is the
  mode of Claude that hands substantive work to multi-agent workflows.
  Every other effort turns Ultracode off. Claude runs None with thinking
  off.
- The model list offers an effort only on models that support it. Reason:
  on a model without a level, Claude runs a lower level without a sign.
  It also ignores Ultracode on a model without it, and then runs Ultra as
  Max.
- A new Codex model can need a newer Codex program than a cloud computer
  runs. Until that computer installs its software update, an OpenAI API
  key or an own endpoint login can run the model at a lower effort and at
  standard speed, with no sign in the chat (older software decision 1,
  2026-11-18). A ChatGPT sign-in keeps the chosen effort and speed, because
  Codex then reads the model list of OpenAI.
- Reason: the gap lasts minutes on a running computer, and about one turn
  on a computer that starts again after a stop. A check of the runner's
  Codex version before each turn was rejected for now, because it adds a
  turn refusal. A note at the end of the turn, a wait for the update, and
  a refusal in the model gateway were rejected for the same release, for
  their cost.

## Names in the product

- User-facing text calls the agents "agents powered by Claude and Codex".
- User-facing text never uses "Claude Code" as a name of the product or of
  its features. Reason: Anthropic forbids that use for a product that builds
  on its Agent SDK.
- The model picker names the model and the effort, such as "Opus 5.5 Max".
  While [fast mode](fast-mode.md) is on, it adds Fast, such as "Opus 5.5
  Max Fast". A screen reader hears Fast too. The picker does not show the
  words Claude or Codex.
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
  [The title of a new workspace](workspace-and-session-names.md#the-title-of-a-new-workspace)
  says, the first session takes the title too (decision 181).
- Each other session takes its title from the first message with text that
  the workspace accepts in that session (decision 181). The title is the
  first line with text of that message.
- A message with no text, such as a message with only a screenshot, gives
  no title. A message whose text holds only the mentions of its own
  attached files counts as a message with no text.
- In a title from a message, each mention of one of its attached files
  that is not an image becomes the name of the file (decision 262 D). Reason: a path makes a
  poor title. A title with the copy path of each file was rejected for
  that reason.
- In a title from a message, each mention of an attached image goes out,
  with no name (title image decision 2 A). The workspace title follows the
  same rule, as
  [The title of a new workspace](workspace-and-session-names.md#the-title-of-a-new-workspace)
  says.
  Reason: image names such as "Screenshot 2026-11-16 at 10.23.45.png" do
  not name the task. Different rules for the two titles were rejected,
  because an image name is just as poor in a session title.
- In a title from a message, each run of spaces becomes one space. The app
  removes one final full stop, but it keeps an ellipsis.
- A title from a message holds at most 60 characters. The limit counts
  Unicode code points. The app cuts a longer line after its last whole
  word that fits the limit. When the first word does not fit, the app cuts
  the line at the limit.
- The user renames a session from its tab menu, as
  [The tab row](tab-row.md) says.
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
- A close shows at once. The tab moves to the session history before the
  server confirms the close. When the close fails, the tab returns to its
  place in the row, and a notice says that the session did not close. The
  user asked for this on 16 November 2026.
- One close of several tabs, such as Close other tabs or Close tabs to the
  right, asks one question for all the running sessions among them. The
  question names each of these sessions. The other sessions close at once.
  Cancel keeps each running session open. The user asked for Close tabs to
  the right on 16 November 2026, and for Close other tabs on the same day.
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

[The tab row](tab-row.md) holds the requirements of the order of the tabs,
their moves, the scroll of the row, the place that each tab keeps, and the
tab menu.

### Explain

[Explain](explain.md) holds the requirements of the sessions that explain
a selection of chat text, their marks in the parent chat, and their
popover.

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
- A link to a closed session reopens that session and shows it, as an
  entry of the session history does. In a read-only workspace, the link
  shows the stored chat of the session as a tab in this browser only, and
  reopens nothing. The user chose this on 13 November 2026.
- Reason: a press on a session chip must show its session, and agents
  close the sessions that they start when the work ends. A link that
  opens only the workspace of a closed session was rejected, because the
  press then shows nothing. A reopen only for a press on a chip was
  rejected, so that each session link works the same way.
- A reopen shows the tab again to every member, because the members share
  the sessions of a workspace.
- A link to an unknown session opens the page of its workspace, as a
  workspace link does. When that workspace already shows, its shown tab
  stays.
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
