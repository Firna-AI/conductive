# The design of the chat

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives workspace,
session, and file chips with the list of `@`, and attached files with their
drops. [Links in text](design-links.md) gives the other links of the chat. It gives the picture of an image file, the work fold of a turn, and the
line of a stopped turn. It also gives the data that the chat does not
have, the files that the cloud computer could not read, the end of a turn at the time limit of
background work, and the end of a fast turn that ran at standard speed.
[The Markdown of replies](design-markdown.md) gives the tables, the
headings, the quotes, the rules, the marks, and the line breaks of a reply
and of a file preview. [The model menu](design-model-menu.md) gives the
model picker of the composer, its favourites, and the Favourites section
of Preferences.

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

## Workspace, session, and file chips

- `WorkspaceChip` in `src/components/chat/` draws a link to a workspace of
  the org as a chip in a line of text: a small rounded pill with the list
  mark of the workspace, `WorkspaceMark`, its label in a muted colour, and
  its current name. `WorkspaceName`, which [the marks](design-marks.md)
  give, draws the name. The name of a workspace with unread output takes the
  strong weight of 600, as in the list, in place of the chip's 500. Its
  height is the height of the line less 2 px, so a line with a chip keeps
  its height. A chip is never wider than its line or than 22 times the
  size of its font, and a long name is cut short. It takes no fixtures, so
  the app can use it too.
  - `MessageText` shows the chips in sent messages, and `AnswerText` in
    answers, as links to the screens of the workspaces. In an answer, a
    chip inside bold text is bold too. A Markdown link to a workspace
    shows as the chip alone. A link in code is no chip. A link
    to another org, or to a workspace that the list does not hold, is a
    link, as [Links in text](design-links.md) says.
  - The chat finds each workspace in the list of the org, with the
    archived ones, the removed ones, and the states of the list, through
    `ChatWorkspaces`. A phone finds the same workspaces with no list on
    the screen. An archived workspace keeps its chip, with the archived
    mark. A removed workspace, whose 14 days ended, keeps that chip too,
    and a press on it opens its read-only chat, from decision 519 B, as
    `user-flows/open-a-removed-workspace` shows.
  - A pasted link becomes a chip in the message box at once: in the chat,
    and in New workspace as a page or a dialog. `MessageField` gives each
    box its field. A draft with a workspace link or a file mention shows
    in `ChipTextField`: plain text with each chip as one unit, with the
    sizes and the line limits of the plain text field. The draft keeps the
    plain link.
  - `InlineChip.module.css` beside it holds the pill of every chip in a
    line of text, so a workspace chip and a file chip have the same size.
  - In a message box each chip starts with the cell of its icon, from
    `ChipIconCell` in `ChipRemove.tsx`. While a pointer is over the cell, a
    × takes the place of the icon, and a press removes the chip. Where no
    pointer hovers, as on a phone, the icon stays, and `ChipEndRemove`
    puts a × at the end of the chip. Attached files are chips of the text
    too, so they follow the same rule.
  - The bubble of a sent message is never wider than its column, and in a
    message box the box around a chip is never wider than the chip. So a
    chip with a long name is cut short in place, with no gap after it, and
    it never pushes a bubble past the edge of the chat.
- `SessionChip` in `src/components/chat/` draws a link to a session as a
  chip of the same size: the list mark, `WorkspaceMark`, and the label of the workspace
  of the session, the icon of a session tab, and the title of the session,
  or Untitled. The icon tells it from a workspace chip, whose name takes
  the same place. Its title is the whole title of the session, and screen
  readers hear "Session" before it. It takes no fixtures, so the app can
  use it too.
  It renders through `WorkspaceChip`, which draws the title with
  `WorkspaceName`, as it draws the name of a workspace. So both chip forms
  share the mark, state words, removal cells, and bold unread title.
  - `MessageText` and `AnswerText` show a session chip for a link to the
    address of a session that the chat read. `ChatWorkspaces` gives each linked
    workspace the sessions that the chat read when it loaded, open and
    closed. A link to any other session shows the chip of its workspace.
    `LinkText` beside it shows one link in the same way, such as the
    session in the line of a stop from a session.
  - A press on a session chip shows the session. A press on the chip of a
    closed session opens the page of its workspace, so no tab reopens for
    the other members. In a message box a session chip works as a
    workspace chip does.
- `FileChip` in `src/components/chat/` draws a file or a folder of the
  workspace as a chip of the same size: the icon that All files gives it,
  and its name. Its title is the whole path. `EntryIcon` in
  `src/components/files/` gives the icon to All files, the chips, and the
  list. It is the one icon map of the mockups and the app: a folder, a
  Markdown file, a code file, or another file. A file is code when the
  code view of the app gives it syntax colours, as `fileKind` in
  `src/files/code/file-kind.ts` of the app says, so one list of languages
  sets both. The user chose this on 10 November 2026. A sent message shows
  each file chip as a link to the tab of the
  file. It takes no fixtures, so the app can use it too.
  - An answer shows a file chip for each `@` mention of an entry of the
    tree, and for each inline code whose whole text is the path of an
    entry, from answer chip decisions 1 and 2 of 13 November 2026. The
    path can be relative, or absolute under the repository folder.
    `answerPaths.ts` beside it reads the path and its line target. A code
    block, a path in another repository, and code of one word without a
    `/` or a `.` stay code. A chip from code inside bold text is bold too,
    as code inside bold text is.
  - A line target, such as `:19-22`, adds `:19-22` to the name and to the
    title of the chip. A press opens the file tab at the lines, which
    `CodeView` in `src/components/files/` marks with the soft amber fill
    and scrolls so that the first line sits in the middle of the view.
  - `MentionChip` beside it draws the chip of a mention part, with its
    line target and the page that a press opens.
- `CodeBlock` in `src/components/chat/` draws a code block of an answer
  with the look of a code block of a Markdown file. On a phone a Copy code
  button shows in its top corner. With a mouse the button shows only while
  the pointer is on the block, so a desktop view draws none.
- `FileMentionList` in `src/components/chat/` draws the list of `@` above
  the message box: the icon, the name, and the folder of each entry that
  matches the query, with the first row highlighted. One line takes the
  place of the rows while the tree loads, when no tree is available, and
  when nothing matches. `fileMentions.ts` beside it reads the mentions of
  a text and orders the rows.
