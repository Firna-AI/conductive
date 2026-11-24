# The design of the chat

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives attached
files with their drops. Its linked page
[Workspace, session, file, and skill chips](design-chips.md) gives these
chips in a line of text, with the lists of `@` and `/`.
[Links in text](design-links.md) gives the other links of the chat.
This page also gives the picture of an image file, the work fold of a
turn, and the data that the chat does not have.
[The end of a turn](design-turn-ends.md) gives the files that the cloud
computer could not read, the line of a stopped turn, the end of a turn at
the time limit of background work, the end of a fast turn that ran at
standard speed, and the line that wakes a session when a turn that it
watched ends. [The Markdown of replies](design-markdown.md) gives the
tables, the headings, the quotes, the rules, the marks, and the line
breaks of a reply and of a file preview. [Explain](#explain) gives the
marks of explanations, the Explain button, and the popover of an
explanation. [The model menu](design-model-menu.md) gives the model
picker of the composer, its favourites, and the Favourites section of
Preferences.

- A session tab shows a muted spinner in place of its chat icon while its
  agent works. The spinner keeps the icon's size and stays visible on
  background tabs and while the user drags a tab. An idle tab shows the
  chat icon.
- `DraftFileChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws each attached file of a draft as a chip at its place in the text
  of the message box. It is one unit of the text, as a file chip is, with
  the size of a file chip, from decisions 262 and 263.
  - Its icon cell shows the kind of the file, or its upload: a ring with the
    share of the file that the browser sent, such as "64%". Before the first
    measurement, the spinner of a working agent and "Uploading" show, so no
    chip shows a made-up share. A failed upload tints the whole chip rose
    and shows an alert.
  - The name and a muted label follow: the share, "Uploading", the size, or
    "Failed". A failed chip ends with Try again, which takes the keyboard
    focus. A press on the name opens nothing.
  - The × of the icon cell removes the chip under a pointer, and the × at
    the end removes it where no pointer hovers, as for each chip of the
    text. Backspace and Delete remove it whole.
  - `AttachedFileChip.module.css` holds the styles of its parts and states,
    and `attachmentCopy.ts` holds their words. The draft text holds a mark
    at the place of each file, and its other text is escaped, as
    [`draft-marks.ts`](../../src/app/draft-marks.ts) of the app says. The
    mockups and the app share that module. Send waits for each upload.
- A file over 1 GB never becomes a chip: a notice over the composer names
  it, gives the limit, and offers "Attach a smaller file", as
  `app/attachments/too-large` shows. A dropped folder becomes one zip
  chip, such as `checkout-screens.zip`, at its place among the files of
  the drop, as `app/attachments/drop/folder` shows. A zip over 1 GB gets
  the notice of a file over 1 GB. A folder that the browser cannot read
  is not attached: its notice names it, says that it could not be read and
  to attach the files in it, and offers "Attach files", as
  `app/attachments/drop/unreadable-folder` shows.
- The whole message box takes a drop of files. While files hover over it,
  the box shows the drop state, a full border in the accent colour, from
  `dropping` in `Composer.module.css`. In the New workspace dialog, the
  whole card is the message box, and `dropping` in
  `NewWorkspaceDialog.module.css` gives the card the same border, as the
  `drop` variant of `app/new-workspace/dialog/files` shows.
- During a file drag over the text, `DraftText` draws the drop caret where
  a drop puts the files: 2 px wide, as high as the line, in the accent
  colour. The real caret moves only at the drop, so a cancelled drag
  leaves the selection as it was, as `app/attachments/drop` shows. A phone
  shows a pick at the caret in place of the drag.
- `SentFileChip` draws each attached file of a sent message as a chip at
  the place of its mention: the icon of its kind, its name, and its size in
  a muted colour. A sent message holds `@` and the copy path of each file,
  and the chip finds its file by that path. A press opens the copy in the
  temporary tab, as `app/attachments/open` shows. The chip of a message that
  waits for the cloud computer opens nothing. `SentFiles` lists the files
  that the text does not show under the message, at the right, with
  `AttachmentChips.module.css` and `AttachmentStates.module.css`.
- A later try of a sent message uses the copies of its files in the cloud
  computer, because the app deletes its stored copy of each file once the
  cloud computer has it. When a copy is no longer there, the turn fails
  with the notice of a failed turn: "This turn stopped", the cause, and
  Try again. The cause names each file that is gone, and asks to attach it
  again in a new message, as `app/attachments/missing` shows. Only the
  newest failed turn of a session offers Try again. The `older` mark of an
  `error` item in `conversations.ts` draws an older failed turn without it.
- The app uses both chips of an attached file too, so they live in
  [`src/ui/components/chat/`](../../src/ui/components/chat/).
  The New workspace page and dialog use the same chips before the
  workspace exists, as `app/new-workspace/files` and
  `app/new-workspace/dialog/files` show. In the dialog, the notice of a
  file over 1 GB sits with its other notices, under the message.
- `ImageView` in [`src/ui/components/files/`](../../src/ui/components/files/)
  draws the picture of a PNG, JPEG, GIF, or WebP file in its tab, from
  decision 265 B. The picture keeps its
  proportions, in the middle of the tab, at its own size or smaller, so
  that it fits the width and the height of the tab. The header keeps
  Download, and Copy is off. An image that the browser cannot draw shows
  "Download this file to open it", as `app/files/image/cannot-draw` shows.
- [The Markdown of replies](design-markdown.md) gives `MarkdownTable`,
  `MarkdownHeadings.module.css`, and `MarkdownProse.module.css`. They give
  the tables, the headings, the quotes, the rules, the emphasis, and the
  strikethrough of a reply and of the Markdown preview of a file one look.
  The page also gives the marks and the line breaks of both views.
- When a turn ends, the work before its answer folds into one line, from
  decision 150. The work is the agent messages and the tool calls, with
  the Mac command cards and the lost lines among them. The answer is the
  last agent message, with the agent messages right before it.
  - `groupItems.ts` in `src/components/chat/` finds the turns, because the
    mockup items have no turn IDs. The items after a member message, up to
    a turn end, a stop, an error, or the lost line of a turn end, form one
    turn. A message with `during` joins its turn and starts a new part.
    Each part folds its own work and keeps its own answer in view.
  - The work after the answer stays in view, such as the calls that a stop
    cut off. A part without an agent message does not fold, and a run
    folds only when it holds a tool call or a message. While a turn runs,
    each message shows, and each run of tool calls folds on its own.
    Only the newest run of the running turn shows each call, also between
    two calls and after a message that follows it, as
    `app/chat/tables/rows` shows. Each earlier run of the turn stays
    folded, as `app/chat/turns` shows.
  - `WorkFold` draws the fold. Its line reads "11 tool calls, 2 messages",
    with the icons of the tool kinds and the left-out output. `FoldLine` in
    `ToolGroup.tsx` draws the line of both kinds of fold. A Mac command
    card and a lost line fold at their place, with no count and no mark,
    from decision 151. The card of a run with secrets folds in the same way.
    A late request for secrets is not work, so it stays at its place, as
    [secrets and Capabilities](design-secrets.md) gives.
  - The open fold lists its steps in order, in the indented list of an
    open run of tool calls: the call line that `ToolGroup` shares, a
    message as its first words on one line, the Mac command card, and the
    lost line, which starts at the left edge. A click on a message line
    grows it to the full text, with its paragraphs, headings, bullets,
    quotes, and rules.
  - A message line is a `<summary>`, so it holds no table, no heading, no
    quote, and no rule element.
    [In the work of a turn](design-markdown.md#in-the-work-of-a-turn)
    gives how the line shows each of them, and each line break, closed
    and open.
  - The `fold` state of the workspace opens the folds, and `open-message`
    also opens the last message line of each. A view runs no script, so a
    chat with open folds starts at its top.
- Data that the chat does not have shows in plain words, from decision 76.
  `lostCopy.ts` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  holds the words. A tool call whose output the runner shortened shows the
  size that it left out, such as "1.2 MB left out", and
  the line of its fold shows the total. A turn with more than 200 files ends its
  list with plain text, such as "47 more files". A stopped turn shows no
  file list, so its line ends with the count, such as
  "You stopped the agent · 5 changed files not listed".
  The user kept this rule on 10 November 2026: Changes shows the changed
  files of the branch. A file row above the stopped line was rejected, and so
  was a count that opens the list.
  `LostLine` draws a refused runner event as one centred, muted line at its
  place, which names the lost data and why, such as "A tool update was lost
  because it was too large". It never shows the lost data, and a phone wraps
  it into balanced lines. A lost line among the work of an ended turn folds
  with that work.

## Workspace, session, file, and skill chips

[Workspace, session, file, and skill chips](design-chips.md) gives the
chips in a line of text. It also gives the code block of an answer, and
the lists of `@` and `/`.

## Explain

`app/chat/explain` draws the parts of Explain, and of Ask, which works as
Explain does after the member writes a question. They live in
`src/components/explain/`. The app uses `MarkGlyph`, the words in
`explainCopy.ts`, and the styles of `MarkedText`, `ExplainButton`,
`ExplainPopover`, and `FollowUpField` too. These files live in
[`src/ui/components/explain/`](../../src/ui/components/explain/).
The shared styles of `ExplainButton` and `MarkedText` also hold the looks
of Ask: the bar of Explain and Ask, and the kept text of an Ask before
Send.
The docs call the panel by the mark a popover, because "preview" names
port previews.

- `MarkedText` draws a text of a message with the marks of its
  explanations and the selection of the member. `ChatMarks` gives the chat
  the marks of each message, and `ChatItemView` draws them in a member
  message, and in each text of an answer through `markedDrawing`. The text
  is cut only at the ends of a quote, so a quote holds whole code and
  whole bold.
  - A mark has the soft amber fill that also marks the lines of a file
    tab. Its text keeps its colour, so the mark reads as a highlight and not
    as a link. A mark that wraps keeps its fill on each line. Under the
    pointer, and while the popover of its explanation is open, the fill is
    deeper, in the `warningBorder` colour. The open mark names the anchor
    `--explain-mark`, which the popover keeps to.
  - `MarkGlyph` ends each mark with the state of its explanation: the icon
    of Explain when its turn ended, the spinner of a session tab while it
    runs, the Needs input mark of the header while it waits for a member,
    and the alert of a failed turn, in the danger colour, when its turn
    failed. Each state has its own shape. Screen readers hear the title of
    the explanation and its state, such as "Needs input", and the pointer
    over a mark shows the title.
  - Where two marks overlap, the fill is deeper, and a press opens a short
    menu of their explanations: below the overlap on a computer, and in a
    sheet on a phone. Each row shows the state and the title of an
    explanation.
  - `WholeMark` draws a mark whose text no longer matches. The whole
    message takes the fill of a mark, a little wider than its text, with
    the glyph at its top right. The fill tints the whole box, and no edge
    has a strip.
  - The selection takes the colours of a selection of the system. On a
    phone the screen draws the handles of the phone and its selection menu
    above the selection.
  - Before Send, an Ask keeps its text in the colours of a selection, with
    no handles and no selection menu, because the focus is in the field of
    its popover. It takes no mark until Send. The kept text names the
    anchor that the popover keeps to, as the open mark does.
- `FloatingExplain` draws Explain, then Ask, as plain buttons in one bar
  just above the middle of a selection. The bar has the hairline outline
  and the fill of a menu, and the shadow of a menu. So it covers none of
  the text that the member reads next. Where the chat has no room past the
  selection, such as in a bubble, it lines up with the end of the
  selection. On a phone, `PhoneExplain` puts the bar above the composer,
  in the middle, away from the selection menu and the handles of the
  phone. Tab reaches Explain, then Ask, and Ask has no key of its own.
  - A press on Explain sends the prompt that the app writes at once, and
    the popover opens. Explain has no prompt field.
  - A press on Ask opens the popover at once, with a field for the
    question. Nothing starts before Send. The question is the first line
    of the written prompt, so it gives the title of the explanation.
- `ExplainPopover` draws the popover of an explanation. Its header shows
  the quote, cut to two lines, then Expand and the close button. The
  popover shows no written prompt, so the quote names what its chat is
  about. Under the header a compact `ChatPane` draws the chat of the
  explanation, as its tab does: the work of each turn, the answers, the
  follow-up messages, the requests that wait for a member, the notice of a
  failed turn with Try again, and the line of a stopped turn. Its `hide`
  leaves out the written prompt, which still starts the first turn, so the
  work of that turn folds. While the cloud computer starts, the steps of
  the start show in place of the turn.
  - On a computer the popover is a panel 400 px wide by its mark, over the
    app frame. It keeps to the anchor of the open mark through CSS anchor
    positioning. It opens below the mark, from the start of the mark, and
    above the mark when the frame has more room there, so it never covers
    the marked text. Its highest height is 420 px, or the room on its side
    of the mark less its 6 px margins. Its chat scrolls inside it, and its
    newest line stays in view. It has the full hairline outline of a card
    and the shadow of a menu. No dim lies over the app, because the parent
    chat stays live around it.
  - On a phone the popover is a sheet at half the height of the screen,
    with no dim, so the marked text stays in view above it. A drag of its
    handle takes it to full height, where it stops under the tab row.
    While a request waits for the member, the sheet opens at full height,
    so the request card and the chat above it both have room.
  - Before Send, the popover of an Ask has the same width, highest height,
    and place by its kept text. On a phone it is the same sheet at half
    height. Its header shows the quote and the close button, with no
    Expand, because no session exists yet. Its chat is empty, and the field
    at its foot has the focus, with Send off while it is empty. A close
    before Send drops the question and starts nothing. After Send, the
    field is empty again for a follow-up, the text takes its mark, and the
    popover shows the chat of the new session as for Explain.
- `FollowUpField` draws the box at the foot of the popover: one line that
  grows to four, Stop while a turn runs, and Send. A follow-up is a message
  of the session, so while a turn runs it steers that turn. The box has no
  model picker and no attach button, and Expand gives the whole composer
  of the tab. A closed explanation shows the notice "The tab is closed"
  over the box. While the cloud computer does not run, the bar of a tab,
  `SandboxBar`, takes the place of the box and of that notice, as it takes
  the place of the composer: Resume while the cloud computer is stopped.
  A read-only workspace shows no box and no bar. Before Send, an Ask holds
  the same box for its question, with the placeholder "Ask about this
  text" and no Stop.
