# Chat Markdown

This doc holds the requirements and the decisions in force for the
Markdown of agent messages in the chat, with their headings, lists,
quotes, and line breaks. Its linked page [Chat tables](chat-tables.md)
holds the rules of their tables. Its linked page
[Chat links](chat-links.md) holds the rules of the links of chat text,
and of the images of agent messages. Its linked page
[Chat message lines](chat-message-lines.md) holds the rules of the
message lines of the work of a turn. [Chat and events](chat-and-events.md)
holds the messages, the live text, and the work of a turn. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A Markdown
parser decision, such as Markdown parser decision 8 D, is a decision of
the change that reads the Markdown of the chat and of the file preview
with one parser. Its pull request keeps the record. The
[mockup catalogue](../mockups/catalogue.md) draws tables in agent messages
at `app/chat/tables`. It draws lists inside list items at
`app/chat/lists`, task boxes at `app/chat/lists/tasks`, and headings at
`app/chat/headings`. It draws quotes, rules, marks, line breaks, and
images at `app/chat/formatting`, and links at `app/chat/links`.

## Formatting

- An agent message is one message of the agent in a turn. The chat reads
  the Markdown of each agent message by the rules of
  [CommonMark](https://spec.commonmark.org/), with the tables and the
  strikethrough of GitHub. The file preview reads a Markdown file by the
  same rules.
- The chat and the file preview read Markdown with one parser, the
  `markdown-it` library (Markdown parser decision 3 C, 16 November 2026).
  The app builds each element that it shows from the parts that the parser
  gives, so no HTML from the parser reaches the page.
- Reason: only a parser that its project tests against CommonMark removes
  the class of reader bugs. Readers written for this app, with a fix for
  each bug or with a reference test against `commonmark.js`, were not
  chosen for that reason. `react-markdown` with `remark` was not chosen
  either.
- A link library was rejected, because it adds code that needs a review of
  its safety. The chat finds web addresses by the rules of
  [Chat links](chat-links.md).
- The chat draws each part of the Markdown as the file preview draws it
  (Markdown parser decision 8 D, 17 November 2026). The parts are:
  - paragraphs, which a blank line ends
  - headings at six levels, as [Headings](#headings) says
  - bulleted lists with `-`, `*`, or `+`, and numbered lists, such as `1.`
    or `1)`, with lists inside their items and task boxes, as
    [Lists](#lists) says
  - quotes and rules, as [Quotes and rules](#quotes-and-rules) says
  - code blocks, between two lines of three or more backticks or tildes,
    or indented by four spaces
  - inline code between backticks, strong text between `**` or `__`
    marks, emphasis between `*` or `_` marks, and strikethrough between
    `~~` marks
  - line breaks, as [Line breaks](#line-breaks) says
  - Markdown links, images, and bare web addresses, as
    [Chat links](chat-links.md) says
  - tables, as [Chat tables](chat-tables.md) says
- The chat draws these parts in its own way:
  - the text while the agent writes, as
    [While the agent writes](#while-the-agent-writes) says
  - the images of picture files of the workspace, which show as pictures,
    as [Pictures in answers](file-mentions-answers.md#pictures-in-answers)
    says
  - short table rows, as [Short rows](chat-tables.md#short-rows) says
  - the agent messages in the work of a turn, as
    [Chat message lines](chat-message-lines.md) says
- Reason: agents often write quotes and emphasis, and the chat then shows
  them without their `>` and `*` marks. The chat also needs no code that
  turns parsed parts back into the text that the agent wrote. A smaller
  set of Markdown, with the other parts as typed, was not chosen for that
  reason. Emphasis and strikethrough alone, a look for the chat alone, and
  file chips for the images of workspace files were not chosen either.
- The lines of one paragraph show as one paragraph, apart from the line
  breaks that [Line breaks](#line-breaks) gives.
- A workspace link outside code shows as a chip, as
  [Messages and answers](workspace-links.md#messages-and-answers) says.
- A `@` mention of a file or a folder of the file tree of the workspace shows as a file
  chip. Inline code whose whole text is the path of such an entry shows
  as a file chip too, as [Files in answers](file-mentions-answers.md#files-in-answers)
  says. A code block stays code.
- A Markdown link or image whose target is a file of the file tree of the workspace shows
  as a link with its label, which opens the file, as
  [Files in answers](file-mentions-answers.md#files-in-answers) says.
- A Markdown image of a PNG, JPEG, GIF, or WebP file of the file tree of the workspace
  shows as a small picture instead, which opens the file.
  [Pictures in answers](file-mentions-answers.md#pictures-in-answers)
  says where the picture shows, and when the image shows as the link.
- The chat reads marks, entities, and escapes as CommonMark does. A mark
  without its pair shows as typed, such as one `**`, or the `**` and the
  `*` of a file pattern such as `tests/**/*.test.ts`. The one exception is
  an open mark while the agent writes, as
  [While the agent writes](#while-the-agent-writes) says. An entity, such
  as `&amp;`, shows its character. A backslash before a mark shows the
  mark as typed, such as `\*`.
- Inline code between two or more backticks can hold a backtick. Strong
  text, emphasis, and strikethrough can hold inline code, links, and
  chips.
- Together, strong text, emphasis, strikethrough, links, and images nest
  at most 12 levels deep, as in the file preview. A deeper one shows its
  Markdown as typed, around its text. No text of the agent message is
  lost.
- Reason: sandbox code can shape the text of an agent message. Without
  the limit, a crafted agent message with deeply nested marks could stop
  the chat.
- Inline code, strong text, emphasis, strikethrough, line breaks, links,
  workspace chips, and file chips also show in headings, list items,
  quotes, and table cells. A code block shows its text with no formatting.
- Each code block of an agent message has a Copy code button in its top
  corner. The button copies the text of the code block exactly as the
  agent wrote it, with its tabs and blank lines, and without the fence
  lines. A toast says whether the copy worked, as for Copy link.
- With a mouse, the button shows while the pointer is on the code block,
  or while the button has the focus. On a touch screen, it always shows.
- Reason: a reader copies a command or a file from an answer often. A
  selection by hand can miss a line or take text around the block.
- A code block in the line of a message in the work of a turn has no Copy
  code button. That line is a button that opens and closes, and a button
  cannot hold another button. A code block under an open line, after a
  table, has the button.
- HTML in an agent message shows as text, also in a table, apart from a
  line-break tag, as [Line breaks](#line-breaks) says.
- Reason: sandbox code is untrusted, as
  [Trust boundaries](../architecture/data-and-trust.md#trust-boundaries) says, and it can
  shape the text of an agent message.

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
  the file preview. The [mockups](../mockups/design-markdown.md#the-parts)
  give the look.
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
- Lists and quotes nest at most 16 levels deep, as in the file preview.
  Deeper content shows as the text of a paragraph. No text of the agent
  message is lost.
- A code block outside a list keeps its text exactly, with its tabs.
- Reason: each list keeps the structure that the agent wrote, so the
  options of a choice show under that choice. A list under an item that
  shows after the item, at the same level, was rejected, because only the
  order then shows which list belongs to which item.
- Reason: lists cannot differ between agent messages and the file
  preview, as for tables. List rules for the chat alone were rejected for
  that reason.
- A task box, `[ ]`, `[x]`, or `[X]` at the start of the first paragraph
  of a list item, shows as a fixed check box, as in the file preview
  (Markdown parser decision 14 B, 18 November 2026). The box shows
  whether the task is done, and a press does not change it. The
  [mockups](../mockups/design-markdown.md#the-parts) give the look.
- Reason: as for quotes and emphasis, the chat draws the part as the file
  preview draws it. A task box as text was not chosen for that reason.

## Quotes and rules

- A quote shows its blocks with a line at its start. It can hold each
  block of [Formatting](#formatting), such as paragraphs, lists, code
  blocks, and tables.
- A rule, such as `---`, shows as a line across the width of the text.
- Quotes, rules, strong text, emphasis, and strikethrough have the same
  look in agent messages and in the file preview. The
  [mockups](../mockups/design-markdown.md#the-parts) give the look.
- Strong text has one weight in both views, which is heavier than the
  weight of a heading (Markdown parser decision 11 C, 18 November 2026).
- Reason: as for headings and tables, the same Markdown cannot look
  different in the two views. A look for each view, and strong text in
  the weight of a heading, were not chosen.

## Line breaks

- A line-break tag is `<br>`, `<br/>`, or `<br />`, in any letter case.
  Outside code, a line-break tag shows as a line break, in a paragraph, a
  heading, a list item, a quote, and a table cell (Markdown parser
  decision 1, 16 November 2026). The file preview shows it in the same
  way.
- A closing tag, `</br>`, a tag with attributes, and a tag in code show as
  text, as other HTML does.
- Reason: a row of a Markdown table cannot hold a line break, so agents
  write a line-break tag in a cell. The tag as text makes the cell hard to
  read. A line break in the chat alone was not chosen, because a table of
  a Markdown file then reads in another way in the file preview. Other
  HTML tags as elements, such as `<b>` or `<kbd>`, were not chosen.
- A hard line break of CommonMark, a backslash or two spaces at the end of
  a line, also shows as a line break.
- A line break at the start or at the end of a block shows nothing, so a
  block of only line breaks shows nothing. Two or more line breaks in a
  row show at most one empty line.
- Reason: CommonMark drops a hard line break at the end of a block. A long
  run of line-break tags then adds no tall gap to the chat.
- A closed message line in the work of a turn shows each line break as a
  space, as [Chat message lines](chat-message-lines.md) says.

## While the agent writes

- Agent text reaches the open tabs while the agent writes it, as
  [What the chat shows](chat-and-events.md#what-the-chat-shows) says. The
  chat shows each update at once.
- Each update shows the text so far in the same way as a complete agent
  message with the same text, apart from an open mark. So no formatting
  waits for the end of the agent message.
- An open mark opens strong text, emphasis, or strikethrough, and has no
  pair yet. It stands in the paragraph, heading, or table cell where the
  text so far ends. While the agent writes, an open mark closes at the end
  of the text (Markdown parser decision 9 C, 18 November 2026). So
  `**Next:` shows `Next:` in bold at once.
- Only a mark that can open and cannot close, by the rules of CommonMark,
  is an open mark. So a mark that can also close stays text, such as the
  `**` of `tests/**/*.test.ts`, as in a complete agent message.
- Reason: words show their formatting while the agent writes them, and
  keep it when the pair arrives. A mark as typed until its pair arrives,
  and a hidden mark, were not chosen.
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
  They carry no heading data, no table data, and no link data.
- An agent message from the saved history shows the same formatting, the
  same tables, and the same links as a live tab shows once the agent
  message is complete.
- The text keeps the cells that a table does not show, such as the cells
  past the width of its header.
- Reason: headings, tables, and links need no change to the events or to
  the saved history. Table data or link data in the events was rejected,
  because it changes the events and the saved history. The browser still
  lays out each table and checks each link.

## In the work of a turn

- [Chat message lines](chat-message-lines.md) says how each agent message
  shows in the work of a turn.
