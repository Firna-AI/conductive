# Chat tables

This doc holds the requirements and the decisions in force for the tables
of agent messages in the chat. It belongs to
[Chat Markdown](chat-markdown.md), which defines an agent message and
holds the other Markdown of agent messages. Chat Markdown also says how a
table shows while the agent writes, in the saved history, and in the work
of a turn. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws tables in agent messages
at `app/chat/tables`, and in the open work of a turn at
`app/chat/work/table`.

## Tables

- A screen reader reads each table as a table, by its rows and its
  columns.
- Tables look the same in agent messages and in the file preview. The
  [mockups](../mockups/design-chat.md) give the look.

### Table text

- A table starts with a header row and a separator row directly under it.
- The header row holds at least one pipe, `|`.
- The separator row has as many cells as the header row. Each of its cells
  holds one or more hyphens, `-`, with an optional colon, `:`, at each end.
- A pipe splits a row into cells. A pipe at the start or at the end of a
  row is optional.
- Spaces at the start and at the end of a cell do not show.
- A `\|` shows as a pipe inside its cell, and does not split the row.
- Each line after the separator row is a body row, until a blank line, a
  line without a pipe, or the end of the agent message.
- A table can start directly after a line of a paragraph, with no blank
  line between them.
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
- The text of a cell shows its inline code, its strong text, and its
  workspace chips, as in a paragraph.
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
  it refuses no agent message for its tables.
- Reason: empty cells let a short agent message build a very large table,
  which can freeze each tab that shows it. A span adds no cells, and it
  needs no new limit.
- Empty cells up to a budget for each agent message were rejected. A limit
  on the rows times the columns of each agent message was not chosen.
  Each adds a limit, after which the rest of the agent message shows as
  text.
- A view that draws only the rows and the columns in sight was rejected,
  because it needs much more scroll and focus work.

### Tables and the file preview

- Agent messages and the file preview split table rows into cells in the
  same way. They read column alignment in the same way.
- Short rows differ. The file preview fills a short row with empty cells,
  up to a budget for each file, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
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
