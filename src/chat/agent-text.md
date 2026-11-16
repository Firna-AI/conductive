# Agent text

This guide belongs to [the chat](README.md). It gives the rules of the code
that formats the text of agent messages: in the chat, and in a message line
of an open work fold. It also gives the workspace chips of sent messages
and answers. [Chat Markdown](../../docs/protocol/chat-markdown.md),
[Chat tables](../../docs/protocol/chat-tables.md), and
[Workspace links](../../docs/protocol/workspace-links.md) state the
requirements.

- `textBlocks` reads the whole text of a message at each update. So a live
  message and the same message from the saved history show the same blocks.
- `textBlocks` checks for a code fence before it checks for a table, so a
  table in a code block stays code. A `table` block, `TextTable`, can start
  directly after a line of a paragraph or a list.
- `textBlocks` reads each list with the list reader that it shares with
  the file preview, as [List parts](#list-parts) says. It parses the lines
  of each item with its own block rules, so a `TextItem` holds the lists,
  paragraphs, headings, code blocks, and tables that the agent indents
  under the item. Past `maxNesting` levels, the lines of an item join into
  one paragraph.
- `textBlocks` replaces tabs with spaces before it reads the structure, as
  the file preview does. A code block outside a list takes its text from
  the lines with their tabs, so it keeps them.
- An item of one paragraph draws its text alone, in `AgentText` and in a
  message line, as in the file preview. Another item draws its blocks.
- `AgentBlocks` draws the blocks of a message in order. `AgentText` and the
  open body of `MessageLine` share it. A table draws through
  `MarkdownTable`. A paragraph, a heading, a list item, and a table cell
  draw their text through `LinkedText`, with bold, so a workspace link in a
  cell shows as a chip.
- A numbered list counts up from the number of its first item, as
  Markdown numbers it. So a list that starts at 2, such as the rest of a
  list after a bulleted list, shows 2. `AgentText` gives that number to
  the `start` of the `ol`. A message line writes each number from it. As
  in CommonMark, a number has one to nine digits, so a longer number
  starts no list.
- `AgentBlocks` draws each code block through `CodeBlock`. Inside a
  `CodeCopyProvider`, `CodeBlock` adds a Copy code button beside the
  `<pre>`, so the text of the `<pre>` stays the code alone. `ChatBody` in
  `WorkspaceChat` gives the provider around the chat of the open session.
  Its copy uses the `copy` services of the chat and shows a toast with the
  result. Outside a provider, a code block has no button. The size of the
  button comes from the control sizes, so the block keeps room for the
  40 px button on a phone.
- `MessageLine` draws the code blocks of its summary as spans, with no
  button, because a summary is a button. A code block under an open line
  draws through `AgentBlocks`, so it has the button.
- `AgentText`, `LinkedText`, and `MessageLine` draw React text and
  elements only. So HTML in a message shows as text.
- A `<summary>` holds only phrasing content and headings, and no
  paragraph, list, or table. So `MessageLine` draws each block as a span,
  which CSS shows as a block while the line is open. A table cannot go into
  the line, so a closed line shows a table as its cells, with a middle dot
  between two cells.
- `MessageLine` draws each heading as a span too, although HTML lets a
  summary hold a heading. So the closed line stays one line. The button
  role of a summary also hides a heading from the heading list of a screen
  reader. [Heading parts](#heading-parts) gives the look of the span.
- An open line keeps the blocks before the first table in its summary.
  When a list holds that table, at any depth, the summary keeps the blocks
  before that list. The table or its list, and the blocks after it, draw
  under the summary, only while the line is open, so a closed line lays
  out no hidden table.
- A line that starts with a table, or with a list that holds one, keeps
  its closed text in a visually hidden span. So the open line keeps a name
  for a screen reader. An empty heading before the table counts as no
  text, because it draws nothing. That hidden copy shows no chips, so the
  keyboard cannot reach a link in it.

## Workspace chips

- Sent messages and agent answers show each workspace link as a chip, as
  [Workspace links](../../docs/protocol/workspace-links.md) says. One
  tokenizer, `chatParts` in `links/chat-parts.ts`, reads both, in one pass
  from left to right. A backtick starts code first, so a link in code
  stays code. A Markdown link whose brackets stand outside code is one
  unit, also when its label holds code or bold, so it shows as its chip
  alone. Then bare links count. In an answer, `**` marks bold around text
  and chips, and a bare link ends before a mark. Bold ends at code, as
  before. A Markdown link of no workspace shows its source with its code
  and bold, as before. `links/workspace-links.ts` reads each link with the
  URL parser and `parseRoute`. A link is a chip only when it has the
  origin of the links of the list, and the router reads a page of a
  workspace of the org in that list. The chip shows the current name, in
  bold while the workspace has unread output, as the list does. Its
  list mark shows the state and the GitHub state, from `chipOf` in
  `links/LinksContext.tsx`, as
  [The list mark](../../docs/protocol/workspace-life.md#the-list-mark)
  says. The chip opens the page that the router read, with its tab path,
  query, and hash. A link whose path names a session that the reader knows
  shows as the session chip of the mockups instead: `useLinkedSession` in
  `links/session-links.ts` finds a live session of the chat's workspace, or
  a session from the one read of another workspace for the load of the
  chat. Its mark follows the workspace list, as a workspace chip does.
  While that read runs, after it fails, and for a session that the
  workspace does not hold, the link keeps the chip of its workspace. Every
  other link stays as the text has it. The message
  field reads its text with `textParts`, which reads no code. A message line of
  a work fold shows chips too. A click on a chip there stays with the
  chip, so the line does not toggle, and a click with a modifier key opens
  a new tab as on any link.

## List parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#lists) says that agent
messages and the file preview share their list rules, the list rules of
CommonMark. These parts read the lists of both:

- `src/markdown/list-items.ts` holds them. `listMarker` reads the marker
  of an item. `readList` reads the items of one list and the lines that
  belong to each item: the lines indented to its text, and lazy lines that
  continue its paragraph. `maxNesting` is the depth limit of both views.
- Each caller of `readList` gives its own rules. `startsBlock` says which
  line ends the text of an item. `parseItem` parses the lines of one item
  with the block rules of the caller. `tasks` says whether `[ ]` starts a
  task box. The file preview reads task boxes, and the chat shows them as
  text.
- `readList` passes `parseItem` the unindented lines of the item. Each
  parser stops at the first of them that continues no paragraph, such as
  a line after a code block or a table, and returns `end`. That line then
  leaves the item, as in CommonMark.
- `interruptsParagraph` says whether a list can start directly after a
  line of a paragraph: a bullet with text, or the number 1 with text. The
  chat and the file preview both use it. The chat tracks whether its
  paragraph is open. A heading ends the paragraph, and a rule, which shows
  as text, closes it, so a list of any number can start under either. A
  list marker comes before a table, so `- a | b` with a separator row
  under it starts a list.
- `src/markdown/lines.ts` holds the line tests that both readers share,
  such as `expandTabs`. Like `table-rows.ts`, these modules import no
  React.

## Heading parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#headings) says that
agent messages and the file preview read headings with the same rules, the
heading rules of CommonMark. It also gives the rules that only the chat
has. These parts read and draw the headings of the chat and the file
preview:

- `src/markdown/headings.ts` holds the heading levels and the rules for
  hash headings and underline headings. `atxHeading` reads a line of one
  to six hashes, without its closing hashes. `setextLevel` reads an
  underline of `=` or `-`. Both views read headings with it, and it
  imports no React.
- `textBlocks` checks for a hash heading after a code fence and before a
  list or a table, as the file preview does. A heading line ends the
  paragraph above it, and the line under it starts a new block. A heading
  with no text, such as `## ` while the agent writes, is a `heading` block
  with empty text.
- `Paragraph`, in `components/agent-paragraph.ts`, holds the lines of the
  open paragraph. The chat shows a quote, a rule, and indented code as
  text, so one paragraph can hold them. CommonMark reads none of them as
  the text of a paragraph. So an underline turns only the text after the
  last of them into a heading, and the lines before that text stay a
  paragraph. A quote line also takes the lines after it, as lazy lines of
  the quote. A lazy line of a list item is never an underline.
- An underline counts only when a line break follows it. `parseLines`
  gets `ends`, which says whether the last of its lines ends the text. So
  an underline on the last line of a list item counts when a line break
  follows the item.
- `AgentText` draws a heading as `h1` to `h6`, at its level, with its text
  through `LinkedText`. A heading with no text draws nothing, so a screen
  reader meets no empty heading.
- `MessageLine` draws a heading as a span with the `heading` class of the
  mockups' `ToolGroup.module.css`. That class gives the heading weight,
  closed and open. Open, the span shows on its own line. Under an open
  line, a heading after the first table draws through `AgentBlocks` as a
  heading element. The `.messageBody` rules of `ToolGroup.module.css` give
  it the look of a heading of the open line.
- `MarkdownHeadings.module.css`, in `docs/mockups/src/components/common/`,
  gives the headings of an answer and of the file preview one look, under
  its `headings` class. It sets the size of each level, the weight, the
  colour, the letter spacing, the line height, and the line under `h1`.
  `AgentText` and the `MarkdownView` of the file preview add the class to
  the element around their blocks.
- Each view sets the space around its headings. The mockups'
  `ChatItemView.module.css` sets it for an answer, also for a heading in a
  list item. `src/files/markdown/MarkdownView.module.css` sets it for the
  file preview. `components/chat.module.css` sets it for a heading of a
  message line after a code block, and for a heading in a list item under
  an open line.

## Table parts

[Chat tables](../../docs/protocol/chat-tables.md#tables-and-the-file-preview)
says that agent messages and the file preview share their table rules.
These parts read and draw the tables of the chat, the file preview, and the
mockups:

- `src/markdown/table-rows.ts` reads table text. `tableStarts` finds a
  header row with its separator row. `readTableRow` reads the cells of a
  row, with escaped pipes and the optional outer pipes.
  `readTableSeparator` reads the alignment of each column. `CellAlign` and
  `TableCells` are the shared types.
- Each caller of these readers ends the table body. It also handles short
  rows and the cells past the width of the header. The file preview fills
  short rows with empty cells, as
  [the Markdown preview](../files/markdown-preview.md#safety-limits) says.
  The chat, in `readTable` of `components/agent-text.ts`, keeps only the
  cells of each row, up to the width of the header, and adds no empty
  cells.
- `table-rows.ts` imports no React. The mockup fixtures import its types,
  and the worker tests compile those fixtures without JSX. A fixture that
  imports a `.tsx` module fails `npm run typecheck` with TS6142.
- `MarkdownTable`, in `docs/mockups/src/components/common/`, draws a table
  as a native table. The chat and the file preview draw their tables
  through it. Each caller draws the content of its cells. Cells
  past the width of the header do not show. The last cell of a short row
  spans the missing columns, up to 1,000, and a cell that spans takes no
  alignment.
- Its styles draw separate borders with no spacing, so one 1 px line
  stands between two cells. Keep them. With collapsed borders, Chrome lays
  out a table in time that grows with the width of its header times its
  rows, also when a short row spans the missing columns.
