# The Explain popover

This doc holds the requirements and the decisions in force for the popover
of an explanation. It belongs to [Explain](explain.md), whose terms and
decision names it uses. A popover resize decision, such as popover resize
decision 1, is a decision of the change that lets a member resize the
popover. Its pull request keeps the record.


- A press on Explain opens the popover of the new explanation. A press on a
  mark opens the popover of its explanation.
- Reason: the answer shows by the text, and the parent chat stays in view
  around it. The user chose a small popover by the mark on 20 November
  2026. A large overlay over the chat was rejected.
- On a computer, the popover is a panel by the mark. By default, it is
  400 px wide. It is at most 420 px high, or less when the room by the
  mark is smaller. The member can change this size, as
  [The size on a computer](#the-size-on-a-computer) says.
- It opens below the mark, or above the mark when it has more room there.
  So it never covers the marked text.
- The panel starts at the start of the mark. Where it would then pass the
  end of the window, it ends at the end of the mark instead.
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
- The chat scrolls inside the popover. While a turn runs, its newest line
  stays in view.
- When a turn ends, the chat shows the top of its answer, so the member
  reads the answer from its start. The popover also opens there on an ended
  turn. An answer that fits in the popover keeps the newest line in view. A
  member who reads higher up when the turn ends stays at that place.
- Reason: the popover is small, and the member wants to read each answer
  from its top. The user asked for this on 24 November 2026. A session tab
  keeps the newest line in view, as
  [The scroll of the chat](chat-scroll.md) says.
- The popover leaves out the written prompt. The tab of the explanation
  shows it as a normal message, so nothing is hidden. Reason: the quote in
  the header names what the chat is about.

## The follow-up field

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

## Expand and Close

- Expand shows the tab of the explanation. When the tab is closed, Expand
  reopens it first, as [A closed explanation](explain.md#a-closed-explanation) says.
- Close closes the popover. The explanation goes on as it is, and its mark
  shows its state.
- On a computer, a press outside the popover closes it too. A press on a
  mark keeps it, because the mark then opens its own popover or menu. A
  press in a part that the popover opens, such as a menu, keeps it too.
  The user chose this on 23 November 2026. Reason: the popover then closes
  as the other panels and menus of the app do.

## Keys and focus

- At most one popover is open. The popover of another mark replaces the
  open popover when it opens, from a press on the mark or from a row of
  the menu. The open popover stays while the menu of overlapping marks
  shows. A press on Explain closes the open popover first.
- The popover takes the focus when it opens. Escape closes it, and the
  focus returns to its mark.
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

## The size on a computer

- On a computer, the member drags a free edge of the popover to change its
  size. A drag of the corner between the two free edges changes both
  (popover resize decision 1 J).
- Reason: a long answer then shows more lines by its mark, and the parent
  chat stays in view around it. The user chose this on 24 November 2026.
- These ways were rejected for popover resize decision 1:
  - Higher fixed limits. Every long answer then covers more of the chat,
    and no member can choose.
  - A button that switches between two sizes. It gives only two sizes,
    and it adds a third button beside Expand and Close.
  - A handle for the height only. Wide code blocks and tables then still
    scroll sideways.
  - A size on the account, which follows the member to another browser.
    It needs new data on the account and a change of the Privacy page.
    The other panel sizes also stay in the browser.
  - The resize corner of the browser. It always sits at the bottom right,
    so above the mark the panel grows away from it. It takes no keys.
- A popover whose mark does not show stands at the top right of the
  window, so its bottom and left edges are free. Its height stops above
  the bottom of the window, so its follow-up field stays in view.
- The width goes from 320 px to 720 px, and the height from 200 px to
  960 px. The room on the side of the mark caps the height that shows,
  and a move of the height stops at that room. Reason: 200 px holds the
  header, the follow-up field, and a few lines, and 720 px keeps the
  popover a panel by its mark.
- The chosen height is a highest height, as the default is. So a short
  answer still shows in a low panel.
- From the first move of a handle, by a drag or a key, until the popover
  closes, the panel keeps the moved height. Reason: the edge then follows
  the pointer, and each key changes what the member sees.
- Each move starts from the size that the panel shows, also where the
  room by the mark shows less than the chosen height.
- A move of the width, by a drag or by a key, never moves the panel to
  the other side of the mark. It stops where the panel no longer fits on
  its side. Reason: a jump under the pointer loses the drag, and a jump
  after a key turns the effect of each arrow round.
- A chosen width shows at most as wide as the window. It also shows at
  most as wide as the larger room beside the mark. One room goes from the
  start of the mark to the end of the window. The other room goes from
  the end of the mark to the start of the window. Reason: a wider panel
  passes the end of the window and hides Close.
- Each edge handle comes after the rest of the popover in the order of
  Tab. It has a name for screen readers, and its value is the size that
  the panel shows. The corner takes only the pointer.
- Up and Down move the top or the bottom edge, and Left and Right move the
  side edge, each in the direction of the arrow. With Shift, an arrow
  takes a larger step. Home sets the smallest size, and End the largest.
  These keys work as on a panel divider, as
  [Fixed keys](keyboard-shortcuts-fixed-keys.md#fixed-keys) says. No
  control sets the default size again.
- Escape on a handle closes the popover too. A press on a handle keeps
  the popover open.
- The browser keeps one chosen size for all popovers. So the next long
  answer opens at the size that the member chose. A drag that ends where
  it started stores nothing, so a press alone never changes the chosen
  size.
- On a phone, the sheet has none of these handles. Reason: a drag of its
  handle already takes it to full height.
