# Explain: the mark and the popover

This doc holds the requirements and the decisions in force for the marks of
the explanations in the chat of their parent session, and for the popover
of an explanation. It also covers a closed explanation and read-only
workspaces. It belongs to [Explain](explain.md), which gives the selection,
the explanation, and the terms. The
[mockup catalogue](../mockups/catalogue-chat-and-automations.md) draws the
marks and the popover at `app/chat/explain`.

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

- A press on Explain opens the popover of the new explanation. A press on a
  mark opens the popover of its explanation. A press on Ask opens the
  unsent popover, as [Explain: Ask](explain-ask.md) says.
- Reason: the answer shows by the text, and the parent chat stays in view
  around it. The user chose a small popover by the mark on 20 November
  2026. A large overlay over the chat was rejected.
- On a computer, the popover is a panel by the mark. It is 400 px wide. It
  is at most 420 px high, or less when the room by the mark is smaller.
- It opens below the mark, or above the mark when it has more room there.
  So it never covers the marked text.
- It puts no dim over the app. Reason: the parent chat stays live.
- On a phone, the popover is a sheet at half the height of the screen, with
  no dim. A drag of its handle takes it to full height, where it stops
  under the tab row.
- When the sheet opens, the chat scrolls the mark into view above it.
- While a request waits for a member, the sheet opens at full height. So
  the request card and the chat above it both have room.
- The header shows the quote, cut to two lines, then Expand and Close. The
  popover has no title of its own.
- Under the header, the popover shows the chat of the explanation as its
  tab shows it. This covers the work of each turn, the answers, the
  follow-up messages, the notice of a failed turn with Try again, and the
  line of a stopped turn.
- While the cloud computer starts, the steps of the start show in place of
  the turn.
- A request of the agent that waits for a member, such as a secret request,
  shows in the popover as it shows at the end of a session tab.
- The chat scrolls inside the popover, and its newest line stays in view.
- The popover leaves out the written prompt. The tab of the explanation
  shows it as a normal message, so nothing is hidden. Reason: the quote in
  the header names what the chat is about.

### The follow-up field

- The foot of the popover holds the follow-up field. It grows from one line
  to four. It has Stop while a turn runs, and Send.
- A follow-up is a message of the explanation, so it follows the rules of
  [Messages](messages-and-attachments.md#messages). During a turn, it
  steers that turn, as each message of a session does.
- The field has no model picker and no attach button. Reason: Expand gives
  the whole composer of the tab.
- While the cloud computer does not run, the bar that takes the place of the
  composer in a tab, such as the bar with Resume, takes the place of the
  follow-up field. Reason: the popover and the tab of the explanation then
  behave the same, and a follow-up never waits with no start.

### Expand and Close

- Expand shows the tab of the explanation. When the tab is closed, Expand
  reopens it first, as [A closed explanation](#a-closed-explanation) says.
- Close closes the popover. The explanation goes on as it is, and its mark
  shows its state.
- On a computer, a press outside the popover closes it too. A press on a
  mark keeps it, because the mark then opens its own popover or menu. A
  press in a part that the popover opens, such as a menu, keeps it too.
  The user chose this on 23 November 2026. Reason: the popover then closes
  as the other panels and menus of the app do.
- A press outside moves no focus, so the focus goes where the press puts
  it. This holds for each popover, also for an unsent popover. Reason: the
  member chose that place with the press.

### Keys and focus

- At most one popover is open, also when it is an unsent popover. The
  popover of another mark replaces the open popover when it opens, from a
  press on the mark or from a row of the menu. The open popover stays while
  the menu of overlapping marks shows. A press on Explain or on Ask closes
  the open popover first.
- The popover of an explanation takes the focus when it opens. Escape
  closes it, and the focus returns to its mark.
  [Send and close](explain-ask.md#send-and-close) gives the focus of an
  unsent popover.
- A follow-up from a member who cannot use the login of the explanation
  starts a new session, as
  [Messages](messages-and-attachments.md#messages) says. That session has
  no anchor. Its tab opens, and the popover shows the line that links to
  it, as the chat of a tab does.
- This holds for Try again in the popover too. The popover then shows the
  new session, and the text in its field moves with it, as a tab does.
  Reason: the answer shows where the member asked for it.
- The popover follows the new session only while it still shows the
  session that took the request. Reason: a late reply never changes the
  popover of another explanation.

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
- A read-only workspace shows no Explain and no Ask, so the key of Explain
  starts nothing there. Reason: an explanation starts a session, and a
  read-only workspace takes no message.
- The popover there has no follow-up field and no Stop.
- No turn runs there, so each mark shows an ended turn. A mark whose newest
  turn failed keeps its alert.
