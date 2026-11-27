# Explain

Explain in the chat: Explain and Ask by a finished selection of text, the
key of Explain, the marks of the explanations in the chat of their parent
session, the menu of overlapping marks, and the popover of an explanation
with its follow-up field. [Ask](#ask) gives the rules for the code of Ask
and its unsent popover. See [the chat](../README.md) for the whole chat,
[Explain](../../../docs/protocol/explain.md) with its pages
[Explain: Ask](../../../docs/protocol/explain-ask.md) and
[Explain: the mark and the popover](../../../docs/protocol/explain-popover.md)
for the requirements, and the `app/chat/explain` pages of the
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
  does: the highlights of the marks and of the quote of an unsent Ask, the
  slots and the buttons of the states, the box that the popover keeps to,
  and the places of the bar of Explain and Ask and of the popover.
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
- On a computer, the bar of Explain and Ask floats in the message, over the
  middle of the selection, or over its end in a member message. With no
  room above the selection, it goes under it. It follows the selection in
  the order of Tab, and the selection stays while the focus is on it. On a
  phone, the bar stands above the composer. A read-only workspace shows
  none.
- The key of Explain the selection is offered only while Explain shows.
- A press calls `ChatController.explain`, which posts the selection to the
  route of the Worker with no choice, so the saved default of the member
  applies, and with a new `promptId`, the ID of the written prompt. Its
  reply shows the tab of the explanation at once, through `takeReply`, and
  the popover opens. A failure shows a notice in the parent chat. A
  failure with no answer or a server error can still have reached the
  Worker. A start whose written prompt a transcript already shows then
  counts as started. Else the notice names the written prompt, so it goes
  when a transcript shows it, as `withLateSends` says. `explainQuote` gives
  the outcome, an `ExplainOutcome`.
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
- The popover shows the chat of the explanation with the parts of a tab,
  through `useSessionParts` and `TranscriptView`, with `hide` for the
  written prompt: its first message. Its follow-up field edits the draft of the
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

### Ask

The code of Ask follows these rules, and
[Explain: Ask](../../../docs/protocol/explain-ask.md) gives its
requirements. `useAsk` holds the unsent Ask of each parent session, and
`ask-state.ts` gives each of its steps.

- Ask follows Explain in the bar of `FloatingExplain` and in `PhoneExplain`,
  and it shows whenever Explain shows. It follows Explain in the order of
  Tab. It offers no shortcut.
- A press on Ask saves the selection that Explain reads: the message, the
  quote, the text around it, and a copy of the range of the quote. Then it
  ends the selection of the page, and the field takes the focus. So the
  unsent popover and Send use the saved selection, never the selection of
  the page, and a phone shows no handles and no selection menu.
- While the unsent popover is open, the saved range keeps a highlight in
  the colours of a selection, the layer `kept`. It draws through the CSS
  Custom Highlight API, as the fill of a mark does, so the text that React
  draws stays its own. It is no mark, so it has no state button and takes
  no press.
- The unsent popover, `AskPopover`, lies where the popover of an
  explanation lies. On a computer, it keeps to a box over the highlighted
  quote, which `AnchorBox` draws as it draws the box of the open mark. On a
  phone, it is the sheet at half height. It counts as the one open popover,
  so the rules of the open popover above hold for it.
- It uses `ExplainPopover` with the quote and Close, and no Expand. Its
  chat is empty, and screen readers hear `askLabel` as its name. Its field,
  `AskField`, looks as the follow-up field looks. It shows `askPlaceholder`,
  screen readers hear `questionLabel` as its name, it takes text only, and
  it grows to four lines. Send stays off while the text holds only white
  space, as `canSend` says.
- The field lies in a `MentionsProvider` with no mentions. So `@` opens no
  list of files there, the field names no list, and Enter, Tab, and Escape
  stay with the field, also in a workspace with files.
- While the cloud computer does not run, the field stays, and the bar of
  `sandboxParts` takes no place there. Send starts the cloud computer, as
  a press on Explain does.
- Send calls `ChatController.explain` with the saved selection, the
  question, and the `promptId` that `nextStart` gives. Send is busy while
  the start waits, as Explain is, so a second press starts nothing. While
  a start of Explain or of Ask waits, the other button of the bar is off,
  so one start waits at a time.
- The field empties at Send and takes the focus through the handle that
  `AskPopover` owns, also after a press or a key on Send. It takes input
  while the start waits, as the composer clears at once after a send.
- A start settles once: when a transcript shows its written prompt by its
  `promptId`, as `shownStarts` finds it, or at the reply, whichever comes
  first. The text typed while the start waited then goes into the draft of
  the new explanation through `ChatController.addEarlierText`, before the
  text of that draft, and its files and a send that waits stay. So the
  follow-up field shows that text, and text typed in the tab stays.
- The popover of the new explanation then takes the place of the unsent
  popover, only while the parent session shows, so a popover or a menu of
  another session stays. When the unsent popover still showed, its
  follow-up field takes the focus. While the cloud computer does not run,
  the bar takes the place of that field, and the popover takes the focus.
  The field then takes it when it shows, while the popover still holds it,
  as `useOpeningFocus` of `ExplainPopover.tsx` says. After a close during
  the wait, the new popover takes the focus, as for Explain.
- The popover of the new explanation hides the written prompt, as for
  Explain, so it does not show the question.
- A failed start keeps the unsent popover open. The question goes back
  into the field, before any text typed during the wait, as a refused
  message goes back into the composer. The parent chat shows the notice
  of a failed Explain, `explainFailedTitle`.
- A start that failed with no answer or a server error stays in the Ask.
  A Send of the same question sends its `promptId` again. When a
  transcript later shows its written prompt, the Ask settles: the notice
  goes, the question leaves the field, as `movedText` says, and the rest
  of the text goes into the draft. After a refusal, the next Send is a new
  start.
- The notice of each failed start names its prompt ID, `startId`. The Ask
  keeps the prompt ID of its last failed start, `failed`. So the start that
  settles takes that notice away through `ChatController.dismissStartNotice`,
  also after a refusal and when the reply comes before the stream. Another
  notice stays.
- Before Send, Close, Escape, and on a computer a press outside drop the
  unsent popover with its question, and they start nothing. Another
  popover that opens in its place, and a move away from the session of the
  Ask, drop it in the same way. A sheet on a phone stays open at a press
  outside. Close and Escape give the focus to the chat, the `ChatPane`
  section, which takes the focus only from code. A press outside moves no
  focus.
- A close while the start waits stops nothing: the settle opens the
  popover of the new explanation, and a failed start opens the unsent
  popover again. The popover shows only over the chat of the session of the
  Ask, so a failed start while another session shows opens it when that
  session shows again.
- Each write names its parent session. A press, a change, and a close act
  on the Ask of the shown session, and the outcome of a start acts on the
  Ask of its own parent session. So an Ask, a press on Explain, or a
  popover in another session leaves the Ask of a failed start as it is.
- A read-only workspace shows no Ask.

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
  explanation on with a fake clock while its parent session is idle. A
  follow-up field that takes the place of the bar after an Ask gets no
  focus when the member moved the focus out of the popover.
- `PopoverLinked.dom.test.tsx` follows a linked session with the text that
  the member typed while the reply waited, follows the linked session of
  Try again, and keeps the popover of another explanation that the member
  opened while the reply waited.
- `AskStart.dom.test.tsx` opens the unsent popover from a selection, with
  the kept highlight and the focus in the field, Ask just after Explain,
  and Send off for white space. Send starts the explanation with the
  question, and its popover hides the written prompt. It checks the focus
  of the field after a press on a focused Send, text typed while the start
  waits, which goes into the follow-up field of the new explanation, Send
  busy during the wait, and a failed start, which keeps the unsent popover
  with the question before the typed text. Enter sends a question with an
  `@` that names no file, in a workspace with files. While the cloud
  computer is stopped, the field stays and Send starts, and the follow-up
  field takes the focus when it takes the place of the bar.
- `AskDismiss.dom.test.tsx` drops the question at Escape, at a press
  outside, which moves no focus, when a mark opens its popover in its
  place, and at a change of the shown session, with no start. A close
  while the start waits stops nothing, a Send after a server error sends
  the same `promptId`, and on a phone Ask stands above the composer and
  its sheet stays open at a press outside.
- `AskLate.dom.test.tsx` shows a start in the stream before its reply: the
  Ask settles at once with the text typed during the wait, and a late
  reply leaves the text typed in the tab of the explanation. A server
  error after the stream showed the start shows no notice and no
  question, and a start whose reply was lost settles when the stream shows
  it later. The notice of a failed start goes when a later Send starts the
  explanation: with a new `promptId` after a refusal, and when the reply
  comes before the stream.
- `AskSessions.dom.test.tsx` keeps the question of a start that failed
  while another session showed, through a new Ask, a press on Explain, and
  a mark there. A start that ends while another session shows keeps the
  popover there and gives the typed text to the new explanation. A later
  start of a failed Ask keeps the notice of a failed Explain of another
  session.
- `explain-test-kit.tsx` and `popover-test-kit.ts` hold the chat, the
  explanations, the selection, the highlights, the press on a mark that
  opens a popover, a follow-up, and the replies of the Worker.
  `ask-test-kit.ts` holds the quote, the question, the unsent popover from
  a selection, and the files of a workspace. `ask-start-kit.ts` holds the
  starts of an Ask that the fake answers: a start that the Worker takes
  shows in the stream before the reply, with the `promptId` of the request,
  as the Worker does. A reply can also come before the stream shows the
  start. The kit also shows the start of the cloud computer.

### Key code

- `useExplain.ts`: the marks, the selection, the key, and the popover and
  the menu that lie open, with `popoverView`, the popover as the view that
  sends. `explain-state.ts` gives its types. `useExplainSelection.ts` reads
  the selection.
- `useAsk.ts`: the unsent Ask of each parent session, its highlight, Send,
  and the settle of a start. `ask-state.ts`: the steps of an unsent Ask,
  such as `canSend`, `nextStart`, `failedAsk`, `movedText`, and
  `shownStarts`.
- `selection.ts`: `explainableSelection`, the selection that Explain reads.
  `text-model.ts`: `textModel`, and the places of the text in the page.
- `explanations.ts`: `explanationsOf`, the explanations of a session with
  the state of each mark. `quote-match.ts`: `findQuote`.
- `MarkedMessage.tsx` and `MarkParts.tsx`: the text of a message with its
  marks, the buttons of the states with the shared `MarkGlyph`, the
  whole-message mark, and the box of the open mark or of the kept quote of
  an Ask. `mark-layout.ts` and `useMarks.ts` lay the marks out, and
  `highlights.ts` draws their fill and the kept quote.
  `useMarks.ts` also gives `markRegions` and `marksAt`, where the press and
  the pointer find the marks.
- `ExplainButton.tsx`: the bar of Explain and Ask by the selection and
  above a phone composer.
- `ExplainLayer.tsx`, `ExplainPopover.tsx`, `PopoverChat.tsx`,
  `PopoverParts.tsx`, `FollowUpField.tsx`: the menu, the popover, its chat,
  its header and handle, and its field. `AskPopover.tsx` and
  `AskField.tsx`: the unsent popover and the field of the question.
  `popover-place.ts` places the popover, and `press-outside.ts` marks the
  presses that keep it open.
- `explain.module.css`: only the rules of the app, such as the highlights,
  the slots, and the places.
- `../state/explain-actions.ts`: `explainQuote` with its `ExplainOutcome`,
  `addEarlierText`, and `sendFollowUp`. `../state/late-sends.ts`:
  `sessionShowing`, the session whose transcript shows a member message.
