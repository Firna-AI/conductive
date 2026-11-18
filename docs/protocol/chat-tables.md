# Chat tables

This doc holds the requirements and the decisions in force for the tables
of agent messages in the chat. It belongs to
[Chat Markdown](chat-markdown.md), which defines an agent message and
holds the other Markdown of agent messages. Chat Markdown also says how a
table shows while the agent writes and in the saved history.
[Chat message lines](chat-message-lines.md) says how a table shows in the
work of a turn. The terms are those of the
[architecture doc](../architecture.md#terms). A Markdown parser decision,
such as Markdown parser decision 13 A, is a decision of the change that
reads Markdown with one parser, as [Chat Markdown](chat-markdown.md) says.
The [mockup catalogue](../mockups/catalogue.md) draws tables in agent
messages at `app/chat/tables`, and in the open work of a turn at
`app/chat/work/table`. It draws cells with line breaks at
`app/chat/tables/line-break`.

## Tables

- A screen reader reads each table as a table, by its rows and its
  columns.
- Tables look the same in agent messages and in the file preview. The
  [mockups](../mockups/design-markdown.md#the-parts) give the look.

### Table text

- A table starts with a header row and a separator row directly under it.
- The header row holds at least one pipe, `|`.
- The separator row has as many cells as the header row. Each of its cells
  holds one or more hyphens, `-`, with an optional colon, `:`, at each end.
- A pipe splits a row into cells. A pipe at the start or at the end of a
  row is optional.
- Spaces at the start and at the end of a cell do not show.
- A `\|` shows as a pipe inside its cell, and does not split the row.
- Each line after the separator row is a body row, also a line without a
  pipe, which gives a row of one cell (Markdown parser decision 13 A,
  18 November 2026).
- The body rows end at a blank line or at the end of the agent message.
  They also end at a line that starts a list item, a quote, a heading, a
  rule, or a code block. In a list item or a quote, they end at a line
  outside that item or quote.
- Reason: `markdown-it` and GitHub read a line without a pipe as a row, so
  a table reads in the same way in both views and on GitHub. An end of the
  table at such a line, in the chat alone or in both views, was not
  chosen.
- A table can start directly after a line of a paragraph, with no blank
  line between them.
- A line that starts a list item, a quote, or a heading starts that block,
  also when a separator row follows it. Its mark never shows in a cell of
  a table (Markdown parser decision 18 B, 18 November 2026).
- Reason: GitHub reads such a line as its block, so the list, the quote,
  or the heading stays. The reading of `markdown-it`, with the mark in the
  first header cell, was not chosen. This rule in the chat alone was not
  chosen, because the two views then read tables in two ways.
- The lines of a table directly under the text of a list item, without the
  indent of the item, continue that text, as CommonMark says (Markdown
  parser decision 17 A, 18 November 2026). They show as text of the item,
  with their pipes. By the same rule of CommonMark, lines without `>`
  under the text of a quote continue the text of the quote.
- Reason: both views then read such lines as CommonMark and GitHub do. A
  table under the list, in the chat alone or in both views through a
  change of the text before the parse, was not chosen.
- Text in a code block stays code, also when it looks like a table.
- Text that does not form a table shows as text, with its pipes. Examples
  are a header row without a separator row, and a separator row with
  another number of cells.

### Columns and cells

- The header row sets the columns of the table.
- A colon at the start of a separator cell aligns its column to the left.
  A colon at the end aligns it to the right. A colon at each end centres
  it.
- With no colon, the column keeps its text at the start.
- The header cell of a column takes the alignment of its column too.
- The text of a cell shows its inline code, its strong text, its
  emphasis, its strikethrough, its links, its workspace chips, and its
  file chips, as in a paragraph.
- A line-break tag in a cell shows as a line break, as
  [Line breaks](chat-markdown.md#line-breaks) says. So one cell can show
  more than one line.
- Each cell stands at the top of its row, in both views, so a cell of one
  line stays level with the first line of a higher cell (Markdown parser
  decision 12 B, 18 November 2026).
- Reason: the cells of a row then start on one line, so the row reads
  across from its top. A cell in the middle of its row was not chosen.
- A row with more cells than the header row shows only the cells under
  the columns. The other cells do not show.

### Short rows

- A short row is a body row with fewer cells than the header row.
- A short row adds no empty cells. It shows only its own cells, and its
  last cell spans the columns that the row misses.
- A cell that spans keeps its text at its start, whatever the alignment of
  the columns that it spans.
- Reason: with the alignment of a right-aligned column, the text would
  stand under a column that it does not belong to.
- A cell spans at most 1,000 columns, the most that
  [HTML allows](https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-colspan).
  In a row that misses more columns, the columns after the span stay
  empty.
- The chat adds no limit for tables. It shows every row of each table, and
  it refuses no agent message for its tables. The file preview keeps its
  budget, as [Tables and the file preview](#tables-and-the-file-preview)
  says.
- Reason: empty cells let a short agent message build a very large table,
  which can freeze each tab that shows it. A span adds no cells, and it
  needs no new limit.
- Empty cells up to a budget for each agent message were rejected. A limit
  on the rows times the columns of each agent message was not chosen.
  Each adds a limit, after which the rest of the agent message shows as
  text.
- `markdown-it` ends a table at the row where its short rows miss more
  than 65,536 cells in all. This stop was not chosen for the chat either
  (Markdown parser decision 15 B, 18 November 2026). A span adds no cells,
  so the stop would only show the rest of the table as text.
- A view that draws only the rows and the columns in sight was rejected,
  because it needs much more scroll and focus work.

### Tables and the file preview

- Agent messages and the file preview read where a table starts and ends,
  and split its rows into cells, in the same way. They read column
  alignment and the line breaks of a cell in the same way.
- Short rows differ. The file preview fills a short row with empty cells,
  up to a budget for each file, as
  [Files and changes](workspace-tools.md#files-and-changes) says. So only
  the file preview can end a table at its budget.
- Reason: agent messages and the file preview share their table rules, so
  escaped pipes and alignment cannot differ between them. Table rules for
  the chat alone were rejected for that reason.

### Wide tables

- A table wider than the chat scrolls sideways inside its agent message,
  also in a list item and in an open message line.
- The text before and after the table keeps the width of the chat. The
  chat and the workspace keep the width of the window.
- Reason: the table keeps its columns as the agent wrote them, so a reader
  can compare the rows.
