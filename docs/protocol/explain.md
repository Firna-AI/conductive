# Explain

This doc holds the requirements and the decisions in force for Explain. A
member selects text in the chat of a session and presses Explain. The app
writes a prompt and sends it at once, in a new session. The answer shows in
a popover by the text, and the text keeps a mark. This doc covers the
selection, the keyboard start, the written prompt, the explanation, its
anchor, its mark, the popover and its size, closed explanations, and
read-only workspaces.

It belongs to [Agents and sessions](agents-and-sessions.md#explain). The
terms are those of the [architecture doc](../architecture.md#terms) and the
terms below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. [The Explain
popover](explain-popover.md) holds the rules of the popover. The
[mockup catalogue](../mockups/catalogue-chat-and-automations.md) draws
Explain at `app/chat/explain`, and its flow at
`user-flows/explain-chat-text`. [Explain](../mockups/design-chat.md#explain)
in the design of the chat gives the look of each part.

## Terms

- **Explanation:** the session that Explain starts.
- **Parent session:** the session whose chat holds the explained text.
- **Quote:** the text that the member selected and explained, as the chat
  shows it.
- **Anchor:** what the record of an explanation holds to find its quote
  again: the parent session, the message, and the quote with the text
  before and after it.
- **Mark:** the lasting highlight of a quote in the chat of the parent
  session.
- **Popover:** the small panel by a mark that shows the chat of its
  explanation. On a phone, it is a sheet. The docs do not call it a
  preview, because that word names a [port preview](port-previews.md).
- **Free edge:** an edge of the popover on a computer that is not at its
  mark. Below the mark, the bottom edge is free, and above the mark, the
  top edge. The side edge that does not line up with the mark is free too.
- **Written prompt:** the first message of an explanation, which the app
  writes.

## The selection and Explain

- Explain shows for a selection of text in the chat of the shown session
  tab. The selection lies inside one agent message or one member message.
  An agent message is each finished text of the agent, also one inside the
  folded work of a turn.
- A selection that spans two messages shows no Explain. A selection in a
  tool line or in a notice shows none either. Reason: a mark stays inside
  one message.
- Only finished text shows Explain. So a selection in an answer that the
  agent still writes shows no Explain.
- The button says Explain. A press sends the written prompt at once, and
  the popover of the new explanation opens.
- The member writes no prompt. The app writes the prompt, with the context
  that the agent needs. The user chose this on 20 November 2026. A prompt
  field by the selection, where the member writes a question, was rejected.
- On a computer, Explain stands just above the middle of the selection, as
  the selection tools of most editors put it. So it covers none of the text
  that the member reads next.
- In a member message at the right of the chat, Explain lines up with the
  end of the selection. Reason: Explain then stays inside the chat.
- A place under the end of the selection was rejected. The user found it
  odd on 20 November 2026, because it stood over the next line.
- On a phone, Explain stands above the composer. Reason: the phone shows
  its own selection menu and handles by the selection, and they could hide
  the button.
- Explain is a normal control, so Tab reaches it from the selection.

## The keyboard start

- The command Explain the selection does what a press on Explain does. Its
  key runs only while Explain shows.
- Its default keys are ⌥⌘E on a Mac and Alt+Shift+E on Windows and Linux.
  [The default keys](keyboard-shortcuts-keys.md#the-default-keys) gives the
  reason for these keys.
- The tooltip of Explain shows the key, as
  [Key hints](keyboard-shortcuts.md#key-hints) says.
- Reason: keyboard users can then explain text too. The user chose a
  keyboard start, with Explain also in reach of Tab, on 17 November 2026.
- A start with the pointer only was rejected, because keyboard users could
  not use Explain. A menu on each message was rejected, because it adds a
  control to every message.

## The written prompt

- The member who presses Explain is the starter of the explanation and the
  sender of its written prompt. The written prompt follows the rules of
  [Messages](messages-and-attachments.md#messages), as each message of that
  member does.
- The first line is Explain and the first line of the quote in quotation
  marks, such as this line:
  `Explain "Manual entry still works when there is no match."`
- This line gives the title of the explanation, cut at the title limit by
  the title rule of [Sessions](agents-and-sessions.md#sessions). So the
  title names the quote.
- Then the written prompt holds the session link of the parent session, the
  ID of the message, and the quote with the text before and after it.
- It names the parent session only with its link. Reason: the chat shows
  the link as a session chip with the title of that session, as
  [Session chips](workspace-links.md#session-chips) says.
- The quote and the text around it are the text that the chat shows, not
  the Markdown of the message.
- Last, the written prompt asks the agent for three things:
  - a read of the parent session with `read_session` when the quote needs
    more context
  - no change to the files
  - a short answer, because the answer shows in a popover
- Reason: the agent gets the quote and its context at once, and it reads
  more of the parent session only when it needs more. The user chose this
  on 17 November 2026.
- These ways were rejected for now:
  - A transcript of the parent session in the written prompt. It costs more
    tokens, and it cuts long chats.
  - A fork of the parent conversation. It needs a change of the agent
    runner, and it works only with the agent of the parent session. It also
    pays for the whole context again on another login.

## The explanation

- An explanation is a normal session. Each rule of a session holds for it.
  So its tab closes, moves, and renames as each session tab does. Its tab
  menu holds the same items.
- Reason: no session rule changes. The user chose this on 17 November 2026.
- A session that shows only in its popover until Expand was rejected. It
  changes decision 19, which makes each session a tab. It also changes the
  rules of the close, the session history, and the links.
- An explanation starts open. Its tab opens at the end of the row, as
  [The tab row](tab-row.md) says for each new tab. The parent tab stays the
  shown tab, and the popover opens over it.
- The user chose the open start on 17 November 2026. A closed start, with
  no tab for each explanation, was not chosen for now. It needs rules for
  the turns of a closed session and for its place in the session history.
- The explanation takes the default login of the member who presses
  Explain, as [The default login](org-logins.md#the-default-login) says. It
  takes the saved default model and effort of that member, or the default
  choice of the app when the member saved none.
- Fast mode is off for an explanation, also when the saved default has it
  on. Reason: a press on Explain does not spend a login at the higher price
  of [fast mode](fast-mode.md), as a session that `create_session` starts
  does not.
- The written prompt is a normal message, so it follows the rules of
  [Messages](messages-and-attachments.md#messages). It also starts the cloud
  computer when the workspace does not run, in the same cases and with the
  same checks as an open, as
  [Stop and resume](stop-and-resume.md) says. Reason: the press asks for
  an answer at once. A message of the composer does not start it, because
  a stopped tab shows the bar with Resume in its place.
- The agent of an explanation has the tools of each session. So it can
  change files that the parent session also works on, although the written
  prompt asks it to change none.
- The parent session gets no message from its explanations. Its chat shows
  only their marks.
- A close of the parent session leaves its explanations as they are.

## The anchor

- The record of an explanation holds its anchor: the parent session, the
  ID of the message, and the quote with some text before and after it.
- Each open browser tab of the workspace gets the anchor with the record of
  the explanation, as it gets each session record. Reason: the parent chat
  then finds its marks with no event of its own.
- A session without an anchor is not an explanation. A session from before
  Explain has no anchor, and it stays valid.
- An explanation starts only when the parent session and the message are
  in the workspace, and the member may send messages there.
- An explanation of a closed parent session also starts. Reason: the parent
  is only the source of the quote, and the agent can read a closed session.
- The record keeps a quote of at most 2,000 characters, and at most 300
  characters of text on each side. The app cuts a longer quote at its end,
  and the text on each side away from the quote. Reason: a long selection
  still starts an explanation, and a session record stays small.
- The replies of `create_session` and `send_message` of the
  [agent tools](session-calls.md) give the whole session record, so they
  also give its anchor. The replies that list, get, and manage sessions
  give the facts that [Session calls](session-calls.md) lists, without the
  anchor. Reason: list entries stay short, and an agent finds the parent
  link, the message ID, and the quote in the written prompt with
  `read_session`.

## The mark

- The chat of a session marks the quote of each explanation whose anchor
  names that session.
- Every member sees the marks. Reason: the members of an org share the
  sessions of each workspace.
- A mark never goes away, and a press on it always opens the popover of its
  explanation. The user chose this on 17 November 2026.
- A mark that goes away when its explanation closes was rejected. An action
  that removes a mark was rejected too.
- The app finds a mark again in the text that the chat shows for its
  message, from the quote and the text around it.
- When that text no longer matches, the mark covers the whole message.
  Reason: a message can show in another way after a change of the app, and
  a mark never goes away.
- A press on the text of a whole-message mark opens its explanation. In a
  message line that folds, a press on the text still opens or closes the
  line, as [The work of a turn](chat-and-events.md#the-work-of-a-turn)
  says, and the state at the end of the mark opens the explanation.
- A mark stays inside one message. Tool lines and notices have no marks.
- A mark inside a folded part of a turn shows when the fold opens.
- The end of a mark shows the state of its explanation:
  - a spinner while a turn runs, also while the turn waits for the cloud
    computer
  - Needs input while a request of the agent waits for a member
  - a red alert when the newest turn failed
  - the icon of Explain in every other case, such as after an answer or a
    stop
- Each state has its own shape, so no state depends on colour alone.
- Screen readers hear the title of the explanation and its state, such as
  "Needs input". The pointer over a mark shows that title.
- Where marks overlap, a press on the overlap opens a short menu of their
  explanations. Each row shows the state and the title of one explanation,
  in the order that they started.
- A row of the menu opens the popover of its explanation. On a phone, the
  menu is a sheet.

## The popover

[The Explain popover](explain-popover.md) holds the requirements of the
popover: its place, its follow-up field, Expand and Close, its keys and
focus, and its size on a computer.

## A closed explanation

- The mark of a closed explanation stays. A press on it opens the popover
  with the chat of the explanation to read.
- A notice over the follow-up field says that a follow-up or Expand
  reopens the explanation.
- A follow-up or Expand there reopens the explanation, as a
  [session link](agents-and-sessions.md#session-links) reopens a closed
  session. Its tab opens again at the end of the row, for every member.

## Read-only workspaces

- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, shows the marks. A press on a mark opens the popover to
  read.
- A read-only workspace shows no Explain, so its key starts nothing there.
  Reason: an explanation starts a session, and a read-only workspace takes
  no message.
- The popover there has no follow-up field and no Stop.
- The popover there keeps the handles of its free edges. Reason: a resize
  changes nothing in the workspace.
- No turn runs there, so each mark shows an ended turn. A mark whose newest
  turn failed keeps its alert.
