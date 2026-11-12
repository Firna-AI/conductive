# Chat Markdown

This doc holds the requirements and the decisions in force for the
Markdown of agent messages in the chat, with their headings and lists.
Its linked page [Chat tables](chat-tables.md) holds the rules of their
tables. [Chat and events](chat-and-events.md) holds the messages, the live
text, and the work of a turn. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws tables in agent messages
at `app/chat/tables`, and in the open work of a turn at
`app/chat/work/table`. It draws lists inside list items at
`app/chat/lists`. It draws headings at `app/chat/headings`, and in the
open work of a turn at `app/chat/headings/work`.

## Formatting

- An agent message is one message of the agent in a turn. The chat formats
  the text of each agent message with this Markdown:
  - paragraphs, which a blank line ends
  - headings at six levels, as [Headings](#headings) says
  - bulleted lists with `-`, `*`, or `+`, and numbered lists, such as `1.`
    or `1)`, with lists inside their items, as [Lists](#lists) says
  - code blocks between two lines that start with three backticks
  - inline code between backticks, and strong text between `**` marks
  - tables, as [Chat tables](chat-tables.md) says
- The lines of one paragraph show as one paragraph.
- A workspace link outside code shows as a chip, as
  [Messages and answers](workspace-links.md#messages-and-answers) says.
- Other Markdown shows as the text that the agent wrote, such as a link
  that is not a workspace link, a quote, or emphasis with one `*`.
- Inline code, strong text, and workspace chips also show in headings,
  list items, and table cells. A code block shows its text with no
  formatting.
- HTML in an agent message shows as text, also in a table.
- Reason: sandbox code is untrusted, as
  [Trust boundaries](../architecture/data-and-trust.md#trust-boundaries) says, and it can
  shape the text of an agent message.
- The chat keeps this small set of Markdown. The full Markdown of the file
  preview was rejected for the chat, because it also changes the links and
  the quotes of every agent message.
- A Markdown library was rejected, because it adds a dependency that needs
  a review of its safety. One parser with a setting for each view was
  rejected, because it needs more compatibility work.

## Headings

- A heading line starts with one to six `#` marks, then a space or the end
  of the line. The number of marks gives the level of the heading.
- The `#` marks at the end of a heading line do not show when a space
  comes before them, such as the last `##` of `## Title ##`.
- A line that starts with seven or more `#` marks, or with `#` marks and
  text directly after them, shows as text, such as `#482`.
- Each heading is its own block. A heading line ends the paragraph above
  it, and a line directly under a heading starts a new block.
- A heading keeps the level that the agent wrote, so a screen reader reads
  it as a heading of that level.
- Reason: agents write headings often, such as a list of decisions under a
  heading, and plain text hides the sections of a message. Strong text in
  place of headings was rejected, because all levels then look the same,
  and a screen reader cannot move between the sections.
- A heading with no text shows nothing. It still ends the paragraph above
  it.
- Reason: a screen reader meets no empty heading, also while the agent
  writes `## ` before the words.
- Headings have the same size, weight, and colour in agent messages and in
  the file preview. The [mockups](../mockups/design-chat.md) give the look.
- Each level has its own size, from the largest at level 1 to the smallest
  at level 6. Levels 1 to 4 are larger than the text around them. Level 5
  has the size of that text, and level 6 is smaller. All levels have the
  heading weight.
- Reason: each level has its own size, so a reader sees how the sections
  of a message nest.
- Agent messages and the file preview read headings with the same rules,
  the heading rules of CommonMark. Only an underline at the end of an
  agent message differs, as [Underlines](#underlines) says.
- Reason: as for lists and tables, headings cannot differ between the two
  views. Heading rules for the chat alone were rejected for that reason.

### Underlines

- An underline is a line of `=` marks or a line of `-` marks. Directly
  under a paragraph, it turns the paragraph into a heading: level 1 for
  `=`, and level 2 for `-`.
- A line whose indent does not reach the text of a list item is never an
  underline for that item. This holds in both views, as CommonMark says.
- In the chat, an underline counts only when a line break follows it. So
  when an agent message ends on an underline, that line shows as text, as
  a header row shows as text until its separator row arrives.
- Reason: while the agent writes a list directly under a line of text, the
  `-` of the list would show that line as a heading for one update.
- In the chat, an underline turns only the text of a paragraph into a
  heading. A quote line, or a line that CommonMark reads as indented code,
  shows as text and never becomes a heading.
- Reason: CommonMark and the file preview read `> Note` above `---` as a
  quote and a rule.

## Lists

- A list item holds the lines that the agent indents under it: a list,
  more paragraphs, a heading, a code block, or a table. They show inside
  the item, under its text.
- Agent messages and the file preview read lists with the same rules, the
  list rules of CommonMark.
- A line belongs to an item when its indent reaches the text of the item,
  such as 2 spaces under `- `, and 3 spaces under `1. `. A tab counts up
  to the next stop of four columns.
- A numbered list counts up from the number of its first item. The number
  of an item has one to nine digits.
- Lists nest at most 16 levels deep, as in the file preview. Deeper
  content shows as the text of a paragraph.
- A task box, such as `[ ]` at the start of an item, shows as text.
- A code block outside a list keeps its text exactly, with its tabs.
- Reason: each list keeps the structure that the agent wrote, so the
  options of a choice show under that choice. A list under an item that
  shows after the item, at the same level, was rejected, because only the
  order then shows which list belongs to which item.
- Reason: lists cannot differ between agent messages and the file
  preview, as for tables. List rules for the chat alone were rejected for
  that reason.

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
  They carry no heading data and no table data.
- An agent message from the saved history shows the same formatting and
  the same tables as the same agent message after its last live update.
- The text keeps the cells that a table does not show, such as the cells
  past the width of its header.
- Reason: headings and tables need no change to the events or to the
  saved history. Table data in the events was rejected, because it changes
  the events and the saved history, and the browser still lays out each
  table.

## Tables and headings in the work of a turn

- An open work fold shows each agent message as one message line, as
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says.
- A closed message line stays one line. It shows each table as its cells
  in row order, from the header row, with a middle dot, `·`, between two
  cells.
- An open message line keeps the text before the first table of the agent
  message. When a list holds that table, the line keeps the text before
  that list. The table, or the list that holds it, and all that follows
  show under the line, with their formatting.
- An agent message without a table opens to its full text in its line.
- The line stays in place when it opens or closes.
- Reason: the steps of the work stay close together, also when a message
  holds a table. A table needs the width of the chat to read, so it shows
  under the line.
- In a message line, each heading shows as text of the line, in the
  heading weight. A screen reader reads it as text too.
- A closed message line shows the text of a heading in the line.
- An open message line shows each heading on its own line, in the size of
  the text of the line. Under the open line, a heading after the first
  table shows as a heading of its level, in the same look.
- Reason: the closed line stays one line, and the weight shows where a
  heading ends, so the words after it read as new text. The work stays
  quieter than the answer. The line is a button that opens and closes,
  and a screen reader does not list a heading inside a button.
