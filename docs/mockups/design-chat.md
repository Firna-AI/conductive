# The design of the chat

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives workspace,
session, and file chips with the list of `@`, attached files, the Markdown
tables of a reply and of a file preview, the work fold of a turn, and the
skill lines. It also gives the data that the chat does not have, and the
files that the cloud computer could not read.

- `AttachmentChips` in `src/components/chat/` draws each attached file as a
  chip: a glyph, the name, a label, and its actions. While a file uploads,
  a ring takes the place of its icon, and the share of the file that the
  browser sent, such as "64%", the place of its size. Before the first
  measurement, the spinner of a working agent and "Uploading" show, so no
  chip shows a made-up share. A failed upload tints the whole chip
  rose and offers Try again and Remove. Send waits for both states. In the
  composer the glyph sits in the cell of its icon, so the × that takes its
  place under a pointer is Remove, in each state.
  `AttachmentStates.module.css` holds the styles of the states, and
  `attachmentCopy.ts` holds their words. A file over 25 MB never becomes a
  chip: a notice over the composer names it, gives the limit, and offers
  "Attach a smaller file", as `app/attachments/too-large` shows. The files
  of a sent message show under it, at the right, without Remove. The New
  workspace page and dialog use the same chips before the workspace exists,
  as `app/new-workspace/files` and `app/new-workspace/dialog/files` show.
  In the dialog, the notice of a file over 25 MB sits with its other
  notices, under the message.
- `MarkdownTable` in `src/components/common/` draws each Markdown table of
  a reply and of the Markdown preview of a file as a native table. It
  imports no fixture, so the app can use it too. Each caller draws the
  content of the cells, such as inline code.
  - The header row has the raised fill and the strong weight. One 1 px line
    in the border colour stands between two cells and around the table.
    The text of the table has the small size, one step under the text of a
    reply.
  - Each column takes the alignment of its separator cell, also in the
    header row. A table wider than its place scrolls sideways inside its
    box, so the text around it keeps its width, as
    `app/chat/tables/wide` shows.
  - A short row of a reply keeps only the cells that the agent wrote. Its
    last cell spans the missing columns, up to 1,000, the most that HTML
    allows, and any columns after that stay empty. The user chose the span
    on 9 November 2026. The cell that spans keeps its text at its start,
    so the text never stands under a column that it does not belong to,
    as `app/chat/tables/short-row` shows. The file preview fills a short
    row of a file with empty cells instead.
  - While the agent writes, a header row shows as its text, with its
    pipes, until a separator row with as many cells follows it. Then the
    table shows the rows that have arrived, as `app/chat/tables/header`
    and `app/chat/tables/rows` show.
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
  - `WorkFold` draws the fold. Its line reads "11 tool calls, 2 messages",
    with the icons of the tool kinds and the left-out output. `FoldLine` in
    `ToolGroup.tsx` draws the line of both kinds of fold. A Mac command
    card and a lost line fold at their place, with no count and no mark,
    from decision 151.
  - The open fold lists its steps in order, in the indented list of an
    open run of tool calls: the call line that `ToolGroup` shares, a
    message as its first words on one line, the Mac command card, and the
    lost line, which starts at the left edge. A click on a message line
    grows it to the full text, with its paragraphs and bullets.
  - A message line holds no table, because a summary holds only phrasing
    content. Closed, the line shows a table as its cells, row by row, with
    a dot between two cells. Open, the line keeps the paragraphs before
    the first table, and the table and the rest of the message show under
    the line, at the left edge of its text, as `app/chat/work/table`
    shows.
  - The `fold` state of the workspace opens the folds, and `open-message`
    also opens the last message line of each. A view runs no script, so a
    chat with open folds starts at its top.
- A tool call that loads a skill shows as a skill line at its place among
  the calls, from decision 277. A skill is a folder with a `SKILL.md` file
  of instructions. `CallLine` in `ToolGroup.tsx` draws the line of each call
  that has `skills`.
  - The line starts with `BookOpen` from `lucide-react`, an open book. Then
    it says "Using skill" while the call runs and "Used skill" after it, from
    decision 279. A command that loads two skills says "Using skills" and
    "Used skills". The skill names follow, joined by ", ", as the agent gives
    them, such as `release-notes`. Then the detail follows: the arguments of
    a Claude skill call, such as "high", as `app/chat/work` shows, or the
    command of a Codex call that read the skill files, as
    `app/chat/work/five-skills` shows.
  - The call keeps its tool kind: `other` for a Claude skill call, and `run`
    for a Codex command. Its target holds the skill names. The names and the
    detail form one text, and an ellipsis cuts the end of that text. So a
    narrow chat cuts the detail before the names.
  - Each fold line names the skills of its calls after its counts, such as
    "4 tool calls · Skill: brainstorming" or "13 tool calls, 2 messages ·
    Skills: brainstorming, testing". It names each skill once, in
    the order of first use, and no skill of a stopped call. Among the icons
    of the tool kinds, the open book takes the place of the kind icon of a
    skill call, as `app/chat/turns` shows.
  - On a narrow chat, the text of such a fold line wraps beside the chevron,
    which stays at the first line. The text wraps only after the dot, after
    "Skills:", or between two names. A name keeps its comma and never breaks
    at its hyphen, and the icons stay with the last name, as
    `app/chat/work/five-skills` shows.
  - A session runs one agent, so a chat never mixes the skill lines of
    Claude and Codex. `sessionChoices.ts` in `src/fixtures/` names the
    agent of each chat whose session runs Codex. The screen gives the
    workspace that choice, so the model picker of
    `app/chat/work/five-skills` shows "GPT-6.1 Sol Medium". A Codex read of
    another file stays a plain command line.
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

## Workspace, session, and file chips

- `WorkspaceChip` in `src/components/chat/` draws a link to a workspace of
  the org as a chip in a line of text: a small rounded pill with the
  `StatusGlyph` of the workspace, its label in a muted colour, and its
  current name. Its height is the height of the line less 2 px, so a line
  with a chip keeps its height. A chip is never wider than its line or
  than 22 times the size of its font, and a long name is cut short. It
  takes no fixtures, so the app can use it too.
  - `MessageText` shows the chips in sent messages and in answers, as
    links to the screens of the workspaces. A Markdown link to a
    workspace shows as the chip alone, and a link in code stays code. A
    link to another org, or to a workspace that the list does not hold,
    stays plain text, and a long link breaks to fit the line.
  - The chat finds each workspace in the list of the org, with the
    archived ones and with the states of the list, through
    `ChatWorkspaces`. A phone finds the same workspaces with no list on
    the screen. An archived workspace keeps its chip, with the archived
    mark.
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
    puts a × at the end of the chip. Attached files follow the same rule,
    and on a phone they keep their × button of touch size.
  - The bubble of a sent message is never wider than its column, and in a
    message box the box around a chip is never wider than the chip. So a
    chip with a long name is cut short in place, with no gap after it, and
    it never pushes a bubble past the edge of the chat.
- `SessionChip` in `src/components/chat/` draws a link to a session as a
  chip of the same size: the `StatusGlyph` and the label of the workspace
  of the session, the icon of a session tab, and the title of the session,
  or Untitled. The icon tells it from a workspace chip, whose name takes
  the same place. Its title is the whole title of the session, and screen
  readers hear "Session" before it. It takes no fixtures, so the app can
  use it too.
  - `MessageText` shows a session chip for a link to the address of a
    session that the chat read. `ChatWorkspaces` gives each linked
    workspace the sessions that the chat read when it loaded, open and
    closed. A link to any other session shows the chip of its workspace.
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
  file, and an answer shows none. It takes no fixtures, so the app can use
  it too.
- `FileMentionList` in `src/components/chat/` draws the list of `@` above
  the message box: the icon, the name, and the folder of each entry that
  matches the query, with the first row highlighted. One line takes the
  place of the rows while the tree loads, when no tree is available, and
  when nothing matches. `fileMentions.ts` beside it reads the mentions of
  a text and orders the rows.
