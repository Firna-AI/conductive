# Agent text

This guide belongs to [the chat](README.md). It gives the rules of the code
that formats the text of agent messages: in the chat, and in a message line
of an open work fold.
[Chat Markdown](../../docs/protocol/chat-markdown.md) states the
requirements.

- `textBlocks` reads the whole text of a message at each update. So a live
  message and the same message from the saved history show the same blocks.
- `textBlocks` checks for a code fence before it checks for a table, so a
  table in a code block stays code. A `table` block, `TextTable`, can start
  directly after a line of a paragraph or a list.
- `AgentBlocks` draws the blocks of a message in order. `AgentText` and the
  open body of `MessageLine` share it. A table draws through
  `MarkdownTable`, and each cell through `InlineMarkdown`.
- `AgentText`, `InlineMarkdown`, and `MessageLine` draw React text and
  elements only. So HTML in a message shows as text.
- A `<summary>` holds only phrasing content. So `MessageLine` draws each
  block as a span, which CSS shows as a block while the line is open. A
  table cannot go into the line, so a closed line shows a table as its
  cells, with a middle dot between two cells.
- An open line keeps the blocks before the first table in its summary. The
  table and the blocks after it draw under the summary, only while the line
  is open, so a closed line lays out no hidden table.
- A line that starts with a table keeps its closed text in a visually
  hidden span. So the open line keeps a name for a screen reader.

## Table parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#tables-and-the-file-preview)
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
