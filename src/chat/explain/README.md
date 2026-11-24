# Explain

Explain in the chat: Explain by a finished selection of text, its key, the
marks of the explanations in the chat of their parent session, the menu of
overlapping marks, and the popover of an explanation with its follow-up
field and the handles that resize it. See [the chat](../README.md) for the
whole chat,
[Explain](../../../docs/protocol/explain.md) for the requirements, and the
`app/chat/explain` pages of the
[mockup catalogue](../../../docs/mockups/catalogue-chat-and-automations.md)
for the screens.

## Rules for this code

- The parts and the mockups both import the shared parts in
  `src/ui/components/explain/`, as the rest of the chat does: the
  words of `explainCopy.ts`, `MarkGlyph`, and the CSS of `MarkedText`,
  `ExplainButton`, `ExplainPopover`, and `FollowUpField`. A word or a look
  that only the app needs, such as the spoken name of the follow-up field
  or the whole-message mark of a bubble, goes into those shared files too,
  so one source serves both. `explain.module.css` holds only what the app
  does: the highlights, the slots and the buttons of the states, the box of
  the open mark, and the places of Explain and of the popover.
- Only the chat of the shown session tab gives `ExplainContext`, from
  `useExplain` in `SessionChat`. So the popover and any other chat show no
  Explain and no marks of their own.
- The text of each member message and each agent message of that chat lies
  in a `MarkedMessage`. The message carries the ID of the chat and of the
  message, and a mark that it is finished: a member message that the
  transcript holds, or an agent message whose `assistant.completed` came
  (`complete` of its transcript item). An open message line of the folded
  work counts too. A closed line shows no marks.
- The quote, the text around it, and each mark come from one reading of
  the text that a message shows, `textModel`: the text of each shown text
  node, with a line break between two blocks and a tab between two cells.
  It leaves out the parts of Explain, hidden text, such as the copy text of
  a chip, and text for screen readers only. So a quote that the chat sent
  is found again in the same text.
- Explain shows for a selection inside one message, also when the
  selection ends just after the message with no text after it, as a triple
  click gives it. A selection across two messages, or in a tool line or a
  notice, shows none. A selection that a mouse still draws shows none
  until the mouse lets go. The quote leaves out white space at its ends,
  and the text on each side keeps at most 300 characters.
- On a computer, Explain floats in the message, over the middle of the
  selection, or over its end in a member message. With no room above the
  selection, it goes under it. It follows the selection in the order of
  Tab, and the selection stays while the focus is on it. On a phone,
  Explain stands above the composer. A read-only workspace shows none.
- The key of Explain the selection is offered only while Explain shows.
- A press calls `ChatController.explain`, which posts the selection to the
  route of the Worker with no choice, so the saved default of the member
  applies. Its reply shows the tab of the explanation at once, through
  `takeReply`, and the popover opens. A failure shows a notice in the
  parent chat.
- A mark finds its quote in the text of its message with the text around
  it, which picks among repeats. A quote that no longer matches as it is
  matches with each run of white space as one space. When the text holds
  no such quote, the mark covers the whole message.
- The fill of a mark draws through the CSS Custom Highlight API, so the
  text that React draws stays its own. The state of each mark is a button
  in a slot at the end of its mark, which React draws through a portal.
  The slots and the text nodes that they split are the only change of the
  page, and each change of the text of the message takes them back and
  lays the marks out again. A new state keeps the layout, so the button
  keeps the focus. A browser without highlights draws no fill, and the
  states still show the marks.
- A press on the text of a mark opens its popover, and a press on text
  where marks overlap opens their menu. A press on a link or a button in
  the text stays with it, and so does a press that ends a selection. A
  press on a mark in an open message line keeps the line open.
- A mark that covers the whole message takes a press on any text of the
  message, and the pointer shows over the whole message. With another mark
  under the press, the menu opens. In an open message line, a press on the
  text still opens or closes the line, as on a line without marks, and only
  the state of such a mark opens it.
- The press and the pointer find the marks in the same regions,
  `markRegions`: the text of each mark that the message shows, and the
  whole message for each mark that covers it, except in a message line.
- The state of a mark comes from the record of its explanation and the
  requests that wait: Needs input while a request waits, a spinner while a
  turn runs or waits for the cloud computer, the alert while the newest
  turn failed, and the icon of Explain otherwise. A read-only workspace
  shows only an ended turn or a failure.
- At most one popover is open, and a change of the shown session closes
  it. On a computer, a press outside the popover closes it, and the focus
  goes where the press puts it. A press counts as the pointer goes down.
  `keepPopover` of `press-outside.ts` keeps the popover at a press in the
  Explain layer, the popover and the menu of overlapping marks, also in a
  part that lies in a portal. It also keeps it at a press on a mark, whose
  click opens its own popover or menu. The shell's `usePressOutside`
  reads that mark. A sheet on a phone stays open. The popover lies in the
  layer of the app frame, as a dialog does. On
  a computer, CSS anchor positioning keeps it at the box of the open mark,
  and a browser without it gets the same place from `placePanel`. On a
  phone it is a sheet, which stops at the top of the chat at full height.
- On a computer, `PopoverResize` draws the handles on the free edges of
  the panel and their corner, as
  [The size on a computer](../../../docs/protocol/explain-popover.md#the-size-on-a-computer)
  says. `popover-edges.ts` finds the free edges from the boxes of the
  panel, the mark, and the frame. It also finds the room for the width on
  the side of the mark, where a move of the width stops, and the room for
  the height. `usePopoverLayout` finds them again in the next frame after
  each change of the size of the panel or of the mark, each scroll, and
  each resize of the window, so no callback of a `ResizeObserver` changes
  the layout. It places the panel first through `placePanel` in a browser
  without anchor positioning. Each move finds them at once. The handles
  take the pointer drag and the keys from `useResizeHandle` in
  `src/shell/layout/`, which the column handles and the split use too. So
  a change of the steps, the keys, or the end of a drag reaches every
  handle of the app. The handles lie inside the panel, so a press on one
  is a press in the popover. The shared CSS of `ExplainPopover` draws
  them, for the app and the mockups.
- One store, `ExplainSize` in `src/app/explain-size.ts`, holds the chosen
  width and height of all popovers. The panel layout holds it as
  `PanelLayout.explain`, and `useExplainSize` gives it. A page without the
  panel layout, such as a test kit or the chat development page, gets a
  store of its own from `useExplainSize`. It keeps the size in the browser
  through `StoredSize` of `src/app/stored-size.ts`, which the column widths
  and the split use too. `PopoverSize` holds the moves of one open
  popover. `usePopoverResize` sets the size on the panel as
  `--explain-width` and `--explain-height`, with the width at most the
  larger room beside the mark, and `placePanel` uses the chosen height in
  place of a fixed one. Each move starts from the size that the panel
  shows, which is also the value of its handle. From the first move of the
  height until the popover closes, the class `fixedHeight` keeps the moved
  height. Each move of the width keeps the side of the mark that the panel
  shows: on the end of the mark, the class `endFirst` makes the panel try
  that side first, and `placePanel` does the same.
- The popover shows the chat of the explanation with the parts of a tab,
  through `useSessionParts` and `TranscriptView`, with `hide` for the
  written prompt: its first message. When a turn ends, and when the
  popover opens on an ended turn, its chat shows the top of the answer:
  `newestAnswer` of `turn-work.ts` gives the first message of the answer
  of the last part of the newest ended turn, and `ChatPane` shows its top
  through `answer`, only while the chat is at the bottom and the top of
  the answer is above the box. Its follow-up field edits the draft of the
  session, which its tab shows too. A follow-up of a closed explanation
  reopens it first, with no change of the shown tab. A follow-up or a Try
  again that the Worker puts in a linked session shows that session in the
  popover, with the draft, as a tab follows it. The popover follows only
  while it still shows the session of the request, so a late reply leaves
  the popover of another explanation as it is. `popoverView` of
  `useExplain` gives the popover to `showTarget` as the view that sent, as
  [the sessions guide](../sessions.md) says.
- While the cloud computer does not run, the bar of `sandboxParts` takes
  the place of the follow-up field, as it takes the place of the composer
  of a tab: the bar of the host in the app, or the chat's own bar with
  Resume. The notices of the field go with it. After a failed first start,
  the field stays under the bar. A read-only workspace shows neither.
- The time of a running turn in the popover moves on by itself, as in a
  tab, also while the parent session is idle: the row of the turn reads
  the clock of the chat, `ChatClock`, and keeps its own tick.

## Tests

- `ExplainSelection.dom.test.tsx` mounts the chat with the shortcut layer.
  It starts an explanation from a selection in an answer, with the text
  around it, the new tab at the end of the row, and the popover. It runs
  the key on a member message, and it checks the selections that show no
  Explain, an answer that the agent still writes, and a read-only
  workspace.
- `ExplainMarks.dom.test.tsx` draws the marks of each state with the test
  highlights of `readHighlights`, a mark whose text no longer matches and
  the press on its text, the menu of overlapping marks, and a mark in an
  open message line. A press on the text of an open line that a mark
  covers whole closes the line and opens no popover.
- `ExplainPopover.dom.test.tsx` opens the popover from a mark without the
  written prompt, gives the focus back on Escape, steers and stops a turn,
  reopens a closed explanation for a follow-up and for Expand, shows a
  read-only popover, and follows a linked session.
- `PopoverDismiss.dom.test.tsx` closes the popover at a press outside it
  on a computer, with no move of the focus, and keeps it at a press in it
  and on its mark. A press on the text of overlapping marks keeps it while
  their menu opens, and a press on a row of the menu keeps it until the
  row opens its own popover. On a
  phone, the sheet stays open.
- `PopoverChat.dom.test.tsx` shows the bar of a stopped cloud computer in
  place of the follow-up field, and moves the time of a running
  explanation on with a fake clock while its parent session is idle.
- `PopoverAnswerTop.dom.test.tsx` lays the chat of the popover out with
  `layOutChat`. It shows the top of the first message of a long answer of
  two messages when the popover opens on an ended turn, and the top of a
  long answer when the turn ends. It keeps the place of a reader higher
  up, and the bottom for a newer short answer whose top shows within the
  room above the rows, under an older long answer.
- `PopoverLinked.dom.test.tsx` follows a linked session with the text that
  the member typed while the reply waited, follows the linked session of
  Try again, and keeps the popover of another explanation that the member
  opened while the reply waited.
- `PopoverResize.dom.test.tsx` lays the popover out with fake boxes. It
  shows the handles after the follow-up field on a computer and none on a
  phone. The keys move each free edge in the direction of its arrow, from
  the size that shows, up to the room by the mark, and the browser keeps
  the size. Escape on a handle closes the popover. A press on a handle
  keeps the popover open and stores nothing, and a drag of the corner
  moves both free edges.
- `popover-edges.test.ts` finds the free edges and the rooms of each
  place of the panel by its mark, and of a panel with no shown mark.
  `../../app/explain-size.test.ts` holds the steps, the drags, the room
  that stops the height, and the storage of the chosen size.
- `explain-test-kit.tsx` and `popover-test-kit.ts` hold the chat, the
  explanations, the selection, the highlights, the press on a mark that
  opens a popover, a follow-up, and the replies of the Worker.

### Key code

- `useExplain.ts`: the marks, the selection, the key, and the popover and
  the menu that lie open, with `popoverView`, the popover as the view that
  sends. `useExplainSelection.ts` reads the selection.
- `selection.ts`: `explainableSelection`, the selection that Explain reads.
  `text-model.ts`: `textModel`, and the places of the text in the page.
- `explanations.ts`: `explanationsOf`, the explanations of a session with
  the state of each mark. `quote-match.ts`: `findQuote`.
- `MarkedMessage.tsx` and `MarkParts.tsx`: the text of a message with its
  marks, the buttons of the states with the shared `MarkGlyph`, the
  whole-message mark, and the box of the open mark. `mark-layout.ts` and
  `useMarks.ts` lay the marks out, and `highlights.ts` draws their fill.
  `useMarks.ts` also gives `markRegions` and `marksAt`, where the press and
  the pointer find the marks.
- `ExplainButton.tsx`: Explain by the selection and above a phone composer.
- `ExplainLayer.tsx`, `ExplainPopover.tsx`, `PopoverChat.tsx`,
  `PopoverParts.tsx`, `FollowUpField.tsx`: the menu, the popover, its chat,
  its header and the handle of the sheet, and its field.
  `popover-place.ts` places it and finds its layout with
  `usePopoverLayout`, and `press-outside.ts` marks the presses that keep
  it open.
- `PopoverResize.tsx`: the handles on the free edges of the panel and
  their corner. `usePopoverResize.ts`: the size of the panel and the moves
  of its handles. `popover-edges.ts`: the free edges, and the rooms of the
  panel on the side of the mark.
- `../../app/explain-size.ts`: `ExplainSize`, the chosen size of all
  popovers, which the browser keeps, and `PopoverSize`, the moves of one
  open popover. `useExplainSize` of `../../shell/layout/panels.tsx` gives
  the chosen size. The handles take the drag and the keys from
  `useResizeHandle` of `../../shell/layout/useResizeHandle.ts`.
- `explain.module.css`: only the rules of the app, such as the highlights,
  the slots, and the places.
- `../state/explain-actions.ts`: `explainQuote` and `sendFollowUp`.
