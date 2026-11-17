# The panes

This guide belongs to [the chat](README.md). It gives how the chat draws
the one or two panes of the centre column, and how a tab moves between
them.
[Split panes](../../docs/protocol/split-panes.md) and
[The width of split panes](../../docs/protocol/split-pane-width.md) state
the requirements. The mockup parts `SplitColumn` and `PaneDrop` of the
[mockup catalogue](../../docs/mockups/README.md) are the visual spec.

## The plan of the column

- `ChatBody` in `components/ChatBody.tsx` plans the column with
  `components/pane-plan.ts`. On desktop, `panePlans` gives each pane that
  shows: its index in the saved view, its row, and its page or the session
  of its chat. A phone gets one row from `phoneRow`.
- A pane shows when its row shows a tab. An archived workspace shows only
  its session tabs, so a pane with only files does not show there, and the
  other pane fills the column. The saved split stays. A view whose rows
  show no tab shows its focused pane, empty.
- A pane with a page of the host shows that page, and its row marks its
  shown file or diff tab. The host gives the pages through `pages`, as
  [Chat integration](integration.md) says. Another pane shows the chat of
  its shown session, else of the last session of its row, as
  `paneSessionId` says. With one pane, that session is the session target.

## The panes on desktop

- `ChatPanes` in `components/ChatPanes.tsx` draws one pane, or two panes
  side by side, with the styles of the mockup part `SplitColumn`. Each pane
  has its row, its own +, its page or its chat with its message field, and
  its own drop area for files. The + of a row opens the new session in its
  pane. The clock of the session history ends the last row.
- With two panes, a screen reader hears "Left pane" and "Right pane", and
  the rows "Sessions and files of the left pane" and "Sessions and files of
  the right pane". One pane keeps the name of one row, and no pane name.
- With two panes, the row of the focused pane takes the `focused` style of
  the mockups: the icon of its shown tab takes the accent colour. The other
  row takes the `unfocused` style: its shown tab keeps its fill, with a
  quieter title. One pane draws no mark.
- A press, a key, or the keyboard focus in a pane makes it the focused
  pane, through `paneFocusHandlers` of `components/pane-focus.ts` and
  `ChatController.focusPane`. The session history and the divider keep the
  focus where it is, through `keepsPaneFocus`, because the history reopens
  a session in the focused pane. `focusPane` saves the view. A read-only
  workspace keeps the change in the browser. A move of a tab to another
  pane makes that pane the focused pane in the same save as the move, as
  [Moves between panes](#moves-between-panes) says.
- The leading chat, as `leadPane` says, is the chat of the focused pane
  when it shows a session, else the chat of the other pane. Its composer
  offers the session keys and takes the focus request of the app, and it
  shows the notices that name no session. The other composer offers no
  key. The row of the focused pane offers the keys of the tabs.
- While the cloud computer does not run, two panes show one bar below
  both, in place of both message fields, and a bar that keeps the message
  fields, after a failed first start, shows once below them. One pane
  keeps the bar under its chat. Each chat shows the start steps at the end
  of its history.
- Each pane of a split is the size container `split-pane` of the mockup
  styles. A chat in a pane narrower than 360 px takes the paddings of a
  phone, through the shared `ChatPane.module.css`. The file chip of a
  finished turn cuts its name with an ellipsis, so a narrow chat does not
  scroll sideways.

## Moves between panes

- One drag serves the rows and the content of both panes, as `useTabDrag`
  of `components/useTabDrag.ts` says. `ChatPanes` owns it, and gives each
  row its part and each content its drop mark. `locateDrop` of
  `components/tab-drop-locate.ts` finds the drop place under the pointer,
  and `components/tab-drop.ts` gives the move, the drop line, and the words
  of each place.
- Over the content of the one pane, a half of it opens a new pane on that
  side with the tab, as `{ newPane }` of `moveTab` does. With two panes,
  the content of the other pane takes the tab at the end of its row. Away
  from the content, the drop place is in the row of the pane under the
  pointer, so a drop in the other row puts the tab at its drop line there.
- A drop that changes nothing shows no mark and moves nothing: the content
  of the pane of the tab, and a half of the one pane when the tab is the
  only tab of its row. The status then names the tab's own place.
- The drop mark is `PaneDropMark` of `components/TabDragParts.tsx`, with
  the styles of the mockup part `PaneDrop`: an outline in the accent colour
  over a light tint, on a half of the one pane or over the whole other
  pane. It takes no pointer input. During a drag over a half, the status of
  the row of the tab says "Moving app.ts to a new right pane".
- The pane item of the tab menu moves the tab to the end of the row of the
  other pane, or with one pane to a new pane on the right, as `otherPane`
  of `components/pane-moves.ts` says. The item is off when the row holds
  only this tab and the view holds one pane.
- Each move to another pane, by a drop or by the pane item, goes through
  `usePaneMoves` of `components/usePaneMoves.ts` and `moveTab` of the
  controller. The pure move shows the tab in its new pane and makes that
  pane the focused pane. The pane that the tab left shows the tab after
  it, else the tab before it, and it keeps its shown tab when the moved
  tab did not show. A pane with no tab left closes. The move of a
  temporary tab keeps it. After the pane item, the focus goes to the link
  of the tab in its new row.
- A status of the column, outside the rows, tells a screen reader each
  move to another pane, such as "app.ts moves to the right pane, place 2
  of 3". A tab that opens a new pane takes place 1 of 1. The status
  belongs to the column, because a move can open the row of the tab or
  close the row that it left, and a status that a new row brings may not
  be heard. It says the move only while the row of the tab holds the tabs
  of the move, and a new drag clears it.
- A drag draws the column again at each move of the pointer. The page or
  the chat of each pane keeps its last drawing then, through the memo of
  `PaneContent` in `components/PaneView.tsx`, and so does the chat of a
  phone.

## The divider

- The divider lies over the hairline on the edge of the left pane.
  `PaneHandle` of `../shell/layout/PaneHandle.tsx` moves it with the
  pointer, and with Left, Right, Home, and End, alone or with Shift for a
  larger step, as the other dividers of the app do. Each move starts from
  the share that shows.
- A move stops where a pane would get narrower than 320 px. In a column
  narrower than 641 px, it stays at half of the column, as
  `paneShareRange` of `../app/pane-split.ts` says.
- `PaneSplit` keeps the share of the left pane in percent, to a tenth of a
  percent. The browser keeps it with the panel sizes, so it holds for every
  workspace and after a reload. The app gives the `PaneSplit` of its panel
  layout through `paneSplit`. Without it, the chat keeps its own share.
- The left pane takes the share as the base of its width. The styles of the
  mockups keep each pane at least 320 px wide, or half of a column
  narrower than 641 px. So a kept share holds while each pane keeps
  320 px, and both panes take half of a narrower column.

## On a phone

- `PhoneChat` in `components/PhoneChat.tsx` draws one row: the session
  tabs of the left pane, a short neutral line, then the session tabs of the
  right pane. One + opens a session in the focused pane, and the clock of
  the session history ends the row.
- The content shows the session target: the shown session of the focused
  pane, else of the other pane, else the last session of the focused pane,
  because a phone shows files only in its Files tab. Only the tab of that
  session is the current tab of the row. A press on a tab of the other
  pane makes that pane the focused pane.
- The [tab row](tab-row.md) gives the moves and the tab menu of the one
  row across its line. A drag there has no drop on the chat, so the chat
  under the row moves no tab, and the pane item of the tab menu is off.

## Read-only workspaces

- A read-only workspace shows the saved split. Its rows have no + and bind
  no drag, its tab menu leaves out the pane item, and the panes still take
  the focus, in the browser only.

## Tests

`components/SplitPanes.dom.test.tsx` checks the rows, the chats, the sends,
the drop of files on each pane, the focus mark and its changes, the
session keys, the bar below both panes, and a read-only split with no
drag and no pane item. `components/SplitPhone.dom.test.tsx` checks
the one row of a phone, its +, and a drop across its line, and that a drop
on its chat moves nothing. `components/PaneDrag.dom.test.tsx` checks each
drop place of a desktop: both halves of the one pane, the only tab, the
other pane, the pane of the tab with Escape, and the other row.
`components/PaneMenu.dom.test.tsx` checks the pane item in each state.
`components/PaneDivider.dom.test.tsx`
checks the keys, the drag, the limits, and the kept share of the divider.
`components/split-test-kit.tsx` mounts a chat with a saved split, and
`components/pane-drag-test-kit.ts` lays out the column and drags its tabs.
