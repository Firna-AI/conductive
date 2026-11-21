# The design of the chat

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives attached
files with their drops. Its linked page
[Workspace, session, file, and skill chips](design-chips.md) gives these
chips in a line of text, with the lists of `@` and `/`.
[Links in text](design-links.md) gives the other links of the chat. This
page also gives the picture of an image file, the work fold of a turn, and
the line of a stopped turn. It also gives the data that the chat does not
have, the files that the cloud computer could not read, the end of a turn
at the time limit of background work, and the end of a fast turn that ran
at standard speed. [The Markdown of replies](design-markdown.md) gives the
tables, the headings, the quotes, the rules, the marks, and the line
breaks of a reply and of a file preview.

- A session tab shows a muted spinner in place of its chat icon while its
  agent works. The spinner keeps the icon's size and stays visible on
  background tabs and while the user drags a tab. An idle tab shows the
  chat icon.
- `DraftFileChip` in `src/components/chat/` draws each attached file of a
  draft as a chip at its place in the text of the message box. It is one
  unit of the text, as a file chip is, with the size of a file chip, from
  decisions 262 and 263.
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
- Both chips of an attached file take no fixtures, so the app can use them.
  The New workspace page and dialog use the same chips before the
  workspace exists, as `app/new-workspace/files` and
  `app/new-workspace/dialog/files` show. In the dialog, the notice of a
  file over 1 GB sits with its other notices, under the message.
- `ImageView` in `src/components/files/` draws the picture of a PNG, JPEG,
  GIF, or WebP file in its tab, from decision 265 B. The picture keeps its
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
  `lostCopy.ts` in `src/components/chat/` holds the words. A tool call whose
  output the runner shortened shows the size that it left out, such as "1.2 MB left out", and
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
- Files that the cloud computer could not read never show as an empty list.
  A finished turn still ends with its duration, then "Changed files
  unavailable" in muted text in place of its files. A stopped turn ends its
  line with the same words. All files keeps the list that it saved before,
  under the notice "The latest list of all files is unavailable", which has
  no time. With no saved list, All files says "The list of all files is
  unavailable" in place of the tree. `lostCopy.ts` holds these words too.
- `StopLine` in `src/components/chat/` draws the line of a stopped turn:
  the stop icon, who stopped the turn, then each note of the turn after a
  dot, such as "Changed files unavailable". `stopCopy.ts` beside it holds
  the words, for the chat and for the copy of a transcript.
  - A Stop of a member shows "You stopped the agent" to that member and
    "Priya stopped the agent" to the others. A stop with no Stop, such as
    when the cloud computer stops, shows "The agent stopped".
  - A stop by the agent of a session with a workspace tool, also through a
    close of the session, names no member, from decision 279. The line
    says "Stopped from", then the session chip of that session, as
    `app/chat/agent-stops` shows. A press on the chip opens the session,
    as in a message. The copy of a transcript gives the session link in
    place of the chip.
  - The line is centred and muted, as `LostLine` is. A narrow chat wraps
    it into balanced lines, and the chip moves to the next line whole. It
    takes no fixtures, so the app can use it too.
- A turn that waits for the background work of its agent shows as any
  running turn, as `app/chat/background-limit/waiting` shows. When the
  time limit stops that work, the turn still ends as finished, with its
  duration and its files. One line above that row names the cause:
  "Background work stopped at the time limit".
  - `EndReasonLine` in `src/components/chat/` draws the line, centred and
    muted as the other event lines, with a timer icon. `endReasonCopy.ts`
    beside it holds the words of each end reason. The line takes no
    fixtures, so the app can use it too.
  - `TurnEnd` puts the line 8 px above the row, closer than two items of
    the chat, so the two read as one end. The row keeps its own marks,
    such as "Changed files unavailable".
  - The words name what stopped, not the number of the limit, because the
    member cannot change it.
- A fast turn that ran at standard speed still ends as finished, with its
  duration and its files, from fast mode decision 257. A note beside the
  duration names the speed and the cause, such as "Standard speed · Fast
  limit reached", and the files go under the note.
  - `StandardSpeedNote` in `src/components/chat/` draws the note: muted
    text with a gauge icon. One line has the height of a chip. A narrow
    chat wraps the note, and the icon stays on its first line. It takes no
    fixtures, so the app can use it too.
  - `speedCopy.ts` beside it holds the words of each cause: "Fast limit
    reached" for the fast limit of Claude, and "Older cloud computer
    software" for a cloud computer whose software ignores fast mode.
  - The words name no time until a limit resets, because the note stays in
    the chat after the reset.
  - A stopped turn ends its line with the same words after a dot, before
    the notes of its files, such as "You stopped the agent · Standard speed
    · Fast limit reached".
  - A fast turn that ran at fast speed, and a turn without fast mode, show
    no note.

## Workspace, session, file, and skill chips

[Workspace, session, file, and skill chips](design-chips.md) gives the
chips in a line of text. It also gives the code block of an answer, and
the lists of `@` and `/`.
