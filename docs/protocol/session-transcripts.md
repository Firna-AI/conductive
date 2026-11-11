# Session transcripts

This doc holds the requirements and the decisions in force for the copy of
a session transcript. It covers the copy items of the tab menu, what each
copy holds, the text of a copy, and the route that gives the text. A
linked page covers the reads of the same text by agents. It belongs to
[Chat and events](chat-and-events.md), which covers the agents, the
sessions, what the chat shows, and the events. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws these screens
at `app/tabs` and `app/transcripts`.

## Terms

- **Transcript:** the chat of one session as Markdown text.
- **Fold:** one line of the chat that holds a part of the work of a turn,
  such as "8 tool calls, 7 messages" or "3 tool calls".
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says when
  the chat folds the work.
- **Skill line:** the line of the chat that shows one skill use of the
  agent, such as "Used skill brainstorming".
  [Skill lines](chat-and-events.md#skill-lines) says when the chat shows it.
- **Read-only workspace:** an archived workspace, or a workspace of a
  suspended org. Its chat shows, but nothing in it can change.
- **Session history:** the list of the closed sessions of a workspace, as
  [Sessions](agents-and-sessions.md#sessions) says.

## The copy items

- The tab menu of each session tab holds two copy items: Copy concise
  transcript and Copy full transcript (decision 215).
  [The tab row](agents-and-sessions.md#the-tab-row) gives their place in
  the menu.
- Each item copies the transcript of the session of its tab (decision
  213). A member can then paste it into another agent, a document, or a
  pull request.
- A copy holds the whole session from its first message, also when the
  tab never showed the session.
- A copy changes nothing in the workspace. The other members see no sign
  of it.
- A copy does not change the shown tab, also when it comes from the menu
  of a tab that does not show.
- Reason: Rename session does not change the shown tab either. Conductor
  fixed a copy that switched to the tab of its menu.
- A press of an item copies the text. This holds also in the Mac app and
  on a phone.
- The menu closes at the press. After the copy, a toast says "Transcript
  copied".
- When the request or the clipboard write fails, the toast says "The
  transcript didn't copy. Try again."
- Reason: the menu is closed, so a toast gives the result. The words
  follow [Copy link](workspace-links.md#copy-link).
- When the clipboard refuses the text, the tab keeps that text for one
  minute. The next press of the same item for the same session in that
  minute copies the kept text at once, with no new request. The tab then
  drops the text.
- Reason: a browser, such as Safari, can refuse a clipboard write that
  comes long after its press. A new request would wait again and fail in
  the same way.
- The tab keeps that text only in its memory. No chat stays on the disk of
  the device, as [Events](chat-and-events.md#events) says.
- For now, no key copies a transcript, and the command palette has no row
  for it.
- A copy on ⌘⌥C, the key of the concise copy in Conductor, was rejected,
  because ⌘⌥C opens the developer tools in Chrome.

### Read-only workspaces

- A member can copy each session of a read-only workspace from its tab
  menu (decision 214). [The tab row](agents-and-sessions.md#the-tab-row)
  states which items that menu holds.
- In a read-only workspace, an entry of the session history shows its
  session as a tab for the member alone. So a member can copy each session
  there, also a closed one.
- Reason: a copy changes nothing, and an archived workspace holds finished
  work that a member is likely to keep.
- No tab menu in a read-only workspace was rejected. The record of a
  finished task could then leave the app only through a copy of the chat
  by hand.
- A copy control in the read-only chat, such as in the bar of an archived
  workspace, was rejected. It is a second place for the same action, and
  it copies only the shown session.

### Closed sessions

- The session history offers no copy (decision 216). In a workspace that
  accepts changes, a member reopens a closed session to copy it.
- A reopen shows the tab again to every member, because the members share
  the sessions of a workspace.
- Copy items on each entry of the session history were left out for now,
  to keep the feature small.

## What each copy holds

- Copy concise transcript copies the chat of the session as it shows at
  first, with each fold closed (decision 215).
- Copy full transcript copies the same chat with each fold open. It gives
  the steps of each fold in place of its line, and each agent message in
  full.
- Reason: the concise copy keeps the answers and the changed files that
  another agent or a pull request needs, and it reads like the chat.
- Both copies hold the items of the chat in the order of the chat.
  [What the chat shows](chat-and-events.md#what-the-chat-shows) states
  these items.
- Their lines use the words of the chat, such as the fold lines, the tool
  verbs, and the lines of turn ends, end reasons, stops, failures, and lost
  data.
- Each fold line of the concise copy names its skills, as
  [Skill lines](chat-and-events.md#skill-lines) says for the chat
  (decision 277).
- A turn end with an end reason gives the line of that reason before its
  duration and its files, in the order of the chat. An example is
  "Background work stopped at the time limit", as
  [What the chat shows](chat-and-events.md#what-the-chat-shows) says.
- As in the chat, a run of tool calls shows open in the concise copy when
  the chat shows it open at first. That is the newest run of a running
  turn, as [The work of a turn](chat-and-events.md#the-work-of-a-turn)
  says, and a run that stays in view after its turn ends, with a call that
  is not done.
- A copy holds no thinking text of the agent, because the chat shows none.
- A menu with only Copy full transcript was rejected. A member who wants
  only the conversation would then trim each long copy by hand.
- A concise copy with only the messages and the answers, with no fold
  lines and no turn ends, was rejected, because it does not read like the
  chat.
- A full copy that also holds the thinking text and the output of each
  tool call was rejected. It needs new runner events, a larger stored
  history, new limits, and the masking of secret values in the new text.
  Only new turns would have that data.
- A copy with the folds as the member left them was rejected. The open
  folds live only in the tab, so the Worker cannot see them.
- One item that opens a dialog with the choice was rejected, because two
  items give the same choice with one press less.

## The text

- The text starts with a heading of level 1 that holds the title of the
  session.
- The next line gives the label of the number of the workspace, the name
  of the workspace, and its link, such as
  "W-395 · Checkout fixes · https://app.conductive.build/orgs/acme/workspaces/w395".
  [Workspace numbers and links](workspaces-and-sandboxes.md#workspace-numbers-and-links)
  gives the label and the link.
- The line after it gives the date and the time of the copy in UTC, such
  as "Copied 9 November 2026, 18:40 UTC".
- Reason: a pasted copy needs its source. The Worker does not know the
  time zone of the reader.
- A missing title or name gives "Untitled", as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says.
- Each message of a member starts with a heading of level 2 that holds the
  display name of its sender, else the GitHub login of the sender.
- The text never says "You", also not in a stop line. Reason: a pasted
  copy has no reader whom "you" can name.
- In each part of a turn, the work and the answer of the agent start with
  a heading of level 2. It holds "Agent", the model, and the effort, as the
  model picker names them, such as "Agent · Opus 5.5 Max".
- The text follows
  [Names in the product](agents-and-sessions.md#names-in-the-product). So
  it never uses "Claude Code" as a name.
- Each path shows by its label, never by its real path. Reason: the label
  hides each exact copy of a secret value, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says (decision 145).
- Each attachment shows by its name, with no link. Reason: its file needs
  a sign-in.
- A stop line names the member who pressed Stop, as the chat names another
  member, such as "Priya stopped the agent". A stop with no Stop request,
  or by a member who left the org, gives "The agent stopped".
- A running turn copies as far as it got. A line then says that the agent
  is still working.
- In the full copy, each tool call is one line of a list. The line gives
  the verb of the chat, the target as code, and the detail of the call.
- A skill line in a copy gives the words of the chat, such as "Used
  skill", then the skill names as code, then the detail (decision 279).
- Each Mac command in a copy gives its command, its Mac, its state, and
  its output in a code block.
- Each piece of inline code and each code block takes a fence of backticks
  that is longer than each run of backticks in its text. Reason: the code
  then stays whole when the text shows as Markdown.

## Where the text comes from

- The Worker builds the text from the stored events of the session
  (decision 213). The browser copies the text of the reply.
- Reason: a tab that never showed the session copies it with one request.
  It does not load the whole history of the session first.
- A text that the browser builds from the chat that it holds was rejected.
  A tab must then load the whole history of each session that it never
  showed.
- A text that the browser builds for a session that it holds, beside the
  route, was rejected. Two builders can give different text when the tab
  is behind the stored history.
- A text that the Worker builds with its own rules for the order and the
  folds was rejected, because the copy would drift from the chat.
- A dialog with a preview, Copy, and Download was rejected. It adds a
  dialog and one more press to each copy.
- A Copy button on each answer was left out, because it copies one answer,
  not the session.
- An export of the session log that the agent keeps in the cloud computer
  was rejected. An archived workspace offers no cloud computer tools,
  the two agents write different formats, and those logs can hold the
  secret values that the chat hides.
- A transcript that the workspace keeps up to date at each event was
  rejected. It adds work to each event of each session, for a copy that
  members make only now and then.

## The route

- `GET /api/orgs/{orgId}/workspaces/{workspaceId}/sessions/{sessionId}/transcript`
  gives the text of one session.
- Its query names the kind of copy: `detail=concise` or `detail=full`. A
  request without one of these values gets HTTP 400 with the error code
  `invalid_input`, as other chat inputs do.
- The reply is JSON that holds the Markdown text. Reason: the API client
  of the app and its error replies stay the same.
- The route gives the text of each session of the workspace, also of a
  closed session.
- An unknown session, or a session of another workspace, gets HTTP 404
  with the error code `session_not_found`, as on the other session routes.
- The route has the access of the chat history. Only a member of the org
  of the workspace gets the text, as
  [Orgs and workspaces](isolation.md#orgs-and-workspaces) says. Each other
  request gets the refusal of the other chat routes, such as HTTP 404 with
  the error code `workspace_not_found`.
- An archived workspace and a workspace of a suspended org give the text
  too. Reason: a copy is a read, and such a workspace keeps its chat
  readable, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says.
- The route is on `app.conductive.build`, behind its gate, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
  The workspace token of a sandbox gets the same text from the route of
  [Transcript reads by agents](transcript-reads.md).
- The text holds the session as it stood at one event of the workspace:
  each event up to that event, and none after it. Reason: the copy then
  shows one state of the chat, as a load of the history does.
- A copy of a long session does not hold up the workspace. Messages, Stop,
  and the events of the runner go on while the route reads the history.

## Reads by agents

[Transcript reads by agents](transcript-reads.md) states the route that
gives the text of a session to the workspace token of a sandbox, for the
`read_session` call, and the parts of a long text.
