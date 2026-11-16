# The width of split panes

This doc holds the requirements and the decisions in force for the width
of the two panes of the centre column, on desktop. It belongs to
[Split panes](split-panes.md), whose terms it uses. A split panes decision
number, such as split panes decision 6, names a decision of the change
that adds split panes. The
[mockup catalogue](../mockups/catalogue-tabs.md) draws the narrow window
at `app/tabs/split/narrow`.

## The width of the panes

- On desktop, the split never turns into one row. Only the phone layout
  shows one row, as [On a phone](split-panes.md#on-a-phone) says. The user asked for
  this on 16 November 2026.
- Reason: a split that stops at a fixed width of the window confuses the
  user.
- When the window narrows while two panes show, the right column narrows
  first, down to 280 px, so that each pane keeps 320 px. Then both panes
  shrink with the window. A pane has no least width (split panes decision
  6 G).
- Reason: everything then shrinks with the window, and no panel or pane
  hides at a fixed width.
- A least width of a pane was not chosen. Below that width, the column
  would show one row, the right column would hide itself, or the pane that
  is not focused would shrink to a strip. Each of these changes the layout
  at a width that the user did not choose.
- The right column still leaves the centre column at least 360 px, as it
  does for one chat. So in a window just above the phone layout, the right
  column gets narrower than 280 px, and each pane keeps about 180 px.
- While two panes show, a pane narrower than 360 px gives its chat the
  paddings of the phone layout. Reason: the text of a narrow pane then
  gets as much room as on a phone of the same width.
- A chat in a narrow pane does not scroll sideways. A part that is wider
  than the chat, such as the file chip of a finished turn, cuts its name.
- A drag of the divider stops where a pane would get narrower than 320 px.
  In a centre column narrower than 641 px, it stops at half of the column.
  A kept share holds while each pane keeps 320 px. In a narrower column,
  the pane that the share made narrow keeps 320 px, and then both panes
  take half.
- Reason: the right column also stops a drag at 320 px, and a narrow
  window must still shrink both panes.
