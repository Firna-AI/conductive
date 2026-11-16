# Split panes

This doc holds the requirements and the decisions in force for split
panes: the one or two panes of the centre column of a workspace. It covers
the panes, their width, and their focus, the pane where a tab opens, the
moves of tabs between the panes, the message fields, the saved view, the
address, the phone, and read-only workspaces. It belongs to
[The tab row](tab-row.md), which states the rules of each row.

The terms are those of the [architecture doc](../architecture.md#terms)
and the terms below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A split
panes decision number, such as split panes decision 1, names a decision of
the change that adds split panes. The
[mockup catalogue](../mockups/catalogue-tabs.md) draws the split at
`app/tabs/split`.

## Terms

- **Pane:** one part of the centre column, with its own tab row and the
  content of its shown tab.
- **Shown tab:** the tab whose content a pane shows. Each pane has one
  shown tab.
- **Focused pane:** the pane that the user last clicked, typed in, moved
  the keyboard focus into, dropped a tab on, or opened a file in. With one
  pane, that pane is the focused pane.

## The panes

- The centre column holds one or two panes, side by side only (split
  panes decision 2 A).
- Reason: each pane must stay wide enough for a chat or for code. Two
  panes one above the other, and a grid of any size, were not chosen.
- Each pane has its own tab row (split panes decision 1 C).
  [The tab row](tab-row.md) states the rules of each row.
- Reason: a press on a tab then always shows that tab in its own pane, and
  it never depends on the focus. This is the behaviour of the editor groups
  of VS Code.
- One tab row for both panes, where a press on a tab shows it in the
  focused pane, was rejected for that reason. A drop that joins two tabs
  into one item of the row, as the split view of Chrome does, was not
  chosen.
- A tab stands in one row only.
- Reason: a press on a file that has a tab then shows that tab, as
  [Temporary tabs](temporary-tabs.md#open-a-file-or-a-diff) says, and each
  tab keeps one reader's place.
- Each row has its own "+". With two panes, the session history button
  shows at the far right of the right row.
- When the last tab of a pane closes or moves out, the pane closes. The
  other pane then fills the column.
- No action closes a pane with its tabs, and no action joins the two
  panes. Reason: a drag already moves the tabs one at a time, and a close
  of a pane with its tabs would move its sessions to the session history.
- A divider between the two panes moves the split. The browser keeps the
  share of the left pane with the sizes of the panels, as
  [Storage](keyboard-shortcuts.md#storage) says. Reason: the sizes of the
  panels already stay in the browser.
- A pane that is not focused still shows its session live. Each event
  shows once and in order in each pane, as [Events](chat-and-events.md#events)
  says.

## The width of the panes

[The width of split panes](split-pane-width.md) states how the panes and
the right column share a narrow window. On desktop, the split never turns
into one row (split panes decision 6 G).

## The focus

- The focused pane marks its shown tab: the icon of that tab takes the
  accent colour. The shown tab of the pane that is not focused keeps its
  fill, with a quieter title. With one pane, no tab carries the mark.
- Reason: the org rail marks its current item in the same way, so the mark
  adds no new element.
- A press makes its target pane the focused pane.

## Where a tab opens

- A press on a tab shows that tab in its own pane.
- A new or reopened session opens in the focused pane (split panes
  decision 3 B). This holds for "+", New session, an entry of the session
  history, and Reopen closed session. The "+" of a row opens its session
  in the pane of that row, because the press makes that pane the focused
  pane.
- Each other session that opens also goes to the end of the row of the
  focused pane (split panes decision 7 B). A session that another member
  or an agent starts opens there without showing.
- A session that opens from an action of the member in another session is
  the exception. It goes to the end of the row of the pane of that other
  session. It shows there while that pane still shows the other session.
  These actions are a message or a Try again that starts a new session,
  and a change to a model of the other agent, as
  [Messages](messages-and-attachments.md#messages) says.
- Reason: the moved draft and the reply then stay beside the chat that the
  member typed in. Such an action can come from the pane that is not
  focused, through the session keys or a prompt of the pull request bar. A
  rule that sends these sessions to the focused pane too, or that sends
  each of them to the right row, was not chosen.
- A press on a file or a diff without a tab opens it in the pane that
  shows a file or a diff (split panes decision 3 B). When no pane or both
  panes show one, the press uses the focused pane.
  [Temporary tabs](temporary-tabs.md#open-a-file-or-a-diff) lists these
  presses.
- The press replaces the temporary tab of that pane only, and it never
  changes the other pane (split panes decision 5 B), as
  [The temporary tab of each pane](temporary-tabs.md#the-temporary-tab-of-each-pane)
  says.
- A press on a file, a diff, or a session that already has a tab shows
  that tab in its pane.
- Reason: a press on a file then does not hide the chat beside it, when
  the other pane already shows a file. A rule that sends every press to
  the focused pane, as VS Code does, was rejected for that reason.
- Risk: when both panes show a session, a press on a file opens in the
  focused pane. That pane often holds the chat that the user types in.

## Moves between panes

- During a drag of a tab, a drop mark shows over the part of the content
  where a drop moves the tab.
- With one pane, a drop on the left or the right half of the content opens
  the second pane on that side, with the tab in it.
- With two panes, a drop on the content of the pane that does not hold the
  tab moves the tab to the end of the row of that pane. A drop in the row
  of that pane puts the tab at the drop place.
- The pane item of the tab menu moves a tab to the other pane without a
  drag, as [The tab menu](tab-row.md#the-tab-menu) says (split panes
  decision 4 B). With one pane, it opens the second pane on the right.
- A drop that changes nothing shows no mark and moves nothing. These drops
  change nothing:
  - with two panes, a drop on the content of the pane that holds the tab
  - with one pane, a drop on a half of the content when the tab is the only
    tab of the row
- Reason: each mark then promises a real change.
- The drop mark is an accent outline over a light accent tint, as the drop
  of files on the chat shows. Reason: every drop in the app then looks the
  same.
- A move to the other pane, by a drop or by the pane item, shows the moved
  tab in its new pane. That pane becomes the focused pane.
- Reason: in the editor groups of VS Code, a tab that moves to another
  group shows there (split panes decision 1 C).
- When the moved tab was the shown tab of the pane that it left, that pane
  shows the tab after it in its row, else the tab before it.
- A drag inside one row does not change the shown tab, as
  [The order](tab-row.md#the-order) says.
- Escape cancels the drag, and nothing moves.
- A move of the temporary tab to the other pane keeps it, as a move inside
  its row does (decision 287 B).
- After a move to the other pane, a screen reader user hears the name of
  the tab, its new pane, and its new place, such as "app.ts moves to the
  right pane, place 2 of 3".
- During a drag over a half of the content, a screen reader user hears
  where the drop puts the tab, such as "Moving app.ts to a new right pane".

## Message fields and bars

- Each pane that shows a session has its own message field. The pane
  takes a drop of files anywhere on it, as
  [Drops](message-attachments.md#drops) says for the chat. The files go to
  the message field of that pane. A pane that shows a file or a diff takes
  no drop of files.
- When the cloud computer does not run, one bar shows under both panes, in
  place of their message fields. A bar that keeps the message fields shows
  once, below them.
- Reason: one cloud computer needs one Resume or one Restore.

## The saved view

- The saved view of each member holds the panes: the tabs of each pane in
  their order, and the shown tab of each pane. It also holds which pane is
  the focused pane. [The saved view](temporary-tabs.md#the-saved-view) of
  Temporary tabs states the mark of the temporary tab of each pane.
- So the split and the focus stay after a reload. The other devices of
  that member load them, as they load the order of the tabs.
- The Worker reads a stored view without panes as one pane, with its tabs
  in their order and its shown tab.
- The Worker reads a pane list that is not valid as one pane with all the
  tabs of the view. It refuses no saved view because of its panes.
- Reason: a pane list that does not fit then costs only the split, not the
  tabs.
- A save without panes keeps the panes of the stored view (split panes
  decision 8 B). Such a save comes from an older copy of the app, such as
  a browser tab that was open before a deploy.
- The Worker fits the tabs of such a save onto the stored panes. Each tab
  stays in its pane. A new tab goes to the focused pane. A tab that the
  save leaves out leaves its pane. Each pane keeps its own temporary tab.
- Such a save changes only which tabs are open. Each pane keeps its shown
  tab and its temporary tab, and the focused pane stays. A new tab of such
  a save stays kept, also when the save marks it temporary.
- Each reply of the saved view also holds the view as one row: all tabs in
  one order, the left pane first, with the shown tab and the temporary tab
  of the focused pane. An older copy reads that row, and shows it as one
  pane.
- Reason: real members use the product, so stored data needs a compatible
  path. A save from an older copy then does not undo the split of the
  member, and an older copy keeps working until it reloads.

## Keys

- [Where a command runs](keyboard-shortcuts.md#where-a-command-runs) says
  which pane each key acts on.
- [Messages from the bar](messages-and-attachments.md#messages-from-the-bar)
  says which session gets the prompts of the pull request bar.

## The address

- The address names the file or the diff that the focused pane shows. When
  the focused pane shows a session, the address names the workspace.
- A visit by address uses the same pane as a press on that file or diff,
  as [Where a tab opens](#where-a-tab-opens) says. That pane then becomes
  the focused pane. This holds for Back, Forward, a reload, a pasted
  address, and a link that opens in a new browser tab.
- A session link shows its session in the pane that holds its tab. A
  session without a tab shows in the focused pane.

## On a phone

- The phone layout shows one row and one content area. A phone, and a
  window narrower than 640 px, show the phone layout.
- The row holds the session tabs of the left pane, then the session tabs
  of the right pane. A short neutral line marks the border of the two
  parts.
- Reason: a move across the line changes the pane of the tab, so the line
  must show.
- The row has one "+", which opens a session in the focused pane. The
  session history button shows at its end.
- The content area shows the shown tab of the focused pane. A press on a
  tab of the pane that is not focused makes that pane the focused pane.
- When the focused pane shows a file or a diff, the Chat tab shows the
  shown session of the other pane. When no pane shows a session, it shows
  the session that the focused pane showed last. Reason: a phone shows
  files only in its Files tab.
- A drop on the content moves no tab between the panes on a phone, also a
  drop on a half, and the pane item of the tab menu is off. So the saved
  split stays.
- A drag, Move left, or Move right across the border line moves the tab to
  the other pane, at that place.

## Read-only workspaces

- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, shows the saved split. No tab moves there, as
  [Read-only workspaces](tab-row.md#read-only-workspaces) says.
- An archived workspace shows only its session tabs. So a saved pane with
  no session tab does not show there, and the other pane fills the column.
- The saved split stays for a Restore.
