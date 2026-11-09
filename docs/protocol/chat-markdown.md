# Chat Markdown

This doc holds the requirements and the decisions in force for the
Markdown of agent messages in the chat, with their tables.
[Chat and events](chat-and-events.md) holds the messages, the live text,
and the work of a turn. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws tables in agent messages
at `app/chat/tables`, and in the open work of a turn at
`app/chat/work/table`.

## Formatting

- An agent message is one message of the agent in a turn. The chat formats
  the text of each agent message with this Markdown:
  - paragraphs, which a blank line ends
  - bulleted lists with `-`, `*`, or `+`, and numbered lists, such as `1.`
    or `1)`
  - code blocks between two lines that start with three backticks
  - inline code between backticks, and strong text between `**` marks
  - tables, as [Tables](#tables) says
- The lines of one paragraph show as one paragraph.
- A heading shows as the text of a paragraph, without its `#` marks.
- A workspace link outside code shows as a chip, as
  [Messages and answers](workspace-links.md#messages-and-answers) says.
- Other Markdown shows as the text that the agent wrote, such as a link
  that is not a workspace link, a quote, or emphasis with one `*`.
- Inline code, strong text, and workspace chips also show in list items
  and table cells. A code block shows its text with no formatting.
- HTML in an agent message shows as text, also in a table.
- Reason: sandbox code is untrusted, as
  [Trust boundaries](../architecture.md#trust-boundaries) says, and it can
  shape the text of an agent message.
- The chat keeps this small set of Markdown. The full Markdown of the file
  preview was rejected for the chat, because it also changes the headings,
  links, and quotes of every agent message.
- A Markdown library was rejected, because it adds a dependency that needs
  a review of its safety. One parser with a setting for each view was
  rejected, because it needs more compatibility work.

## Tables

- A screen reader reads each table as a table, by its rows and its
  columns.
- Tables look the same in agent messages and in the file preview. The
  [mockups](../mockups/design.md) give the look.

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
  also in an open message line.
- The text before and after the table keeps the width of the chat. The
  chat and the workspace keep the width of the window.
- Reason: the table keeps its columns as the agent wrote them, so a reader
  can compare the rows.

## While the agent writes

- Agent text reaches the open tabs while the agent writes it, as
  [What the chat shows](chat-and-events.md#what-the-chat-shows) says. The
  chat shows each update at once.
- Each update shows the text so far in the same way as a complete agent
  message with the same text. So no formatting waits for the end of the
  agent message.
- A header row shows as text, with its pipes, until its separator row
  arrives. The table then shows, with the rows that have arrived.
- The table grows with each row that arrives. A row that the agent still
  writes shows the cells that have arrived.
- A code block without its closing line runs to the end of the agent
  message.
- Reason: agent text shows while the agent writes it. A table that shows
  only after the end of the agent message was rejected for that reason.

## Saved history

- The events and the saved history carry the text of each agent message.
  They carry no table data.
- An agent message from the saved history shows the same formatting and
  the same tables as the same agent message after its last live update.
- The text keeps the cells that a table does not show, such as the cells
  past the width of its header.
- Reason: tables need no change to the events or to the saved history.
  Table data in the events was rejected, because it changes the events and
  the saved history, and the browser still lays out each table.

## Tables in the work of a turn

- An open work fold shows each agent message as one message line, as
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says.
- A closed message line stays one line. It shows each table as its cells
  in row order, from the header row, with a middle dot, `·`, between two
  cells.
- An open message line keeps the text before the first table of the agent
  message. The first table and all that follows it show under the line,
  with their formatting.
- An agent message without a table opens to its full text in its line.
- The line stays in place when it opens or closes.
- Reason: the steps of the work stay close together, also when a message
  holds a table. A table needs the width of the chat to read, so it shows
  under the line.
