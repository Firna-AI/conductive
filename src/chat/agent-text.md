# Agent text

This guide belongs to [the chat](README.md). It gives the rules of the code
that formats the text of agent messages: in the chat, and in a message line
of an open work fold.
[Chat Markdown](../../docs/protocol/chat-markdown.md),
[Chat tables](../../docs/protocol/chat-tables.md),
[Chat code blocks](../../docs/protocol/chat-code-blocks.md), and
[Chat message lines](../../docs/protocol/chat-message-lines.md) state the
requirements. Three linked guides hold the rest of the code:

- [Message lines](message-lines.md) gives the code of a message line in
  the work of a turn.
- [Code blocks](code-blocks.md) gives the colours and the Copy code button
  of code blocks.
- [Text links](text-links.md) gives the web links, the workspace chips,
  and the file chips of sent messages and answers. Its linked guide
  [Pictures in answers](answer-pictures.md) gives the pictures of answers.

## The chat adapter

`markdown/` reads the Markdown of an agent message with the shared parser
of `src/markdown/parser.ts`. Its modules are pure functions and import no
React.

- `agentBlocks` in `markdown/agent-blocks.ts` reads the whole text of a
  message at each change of the text. The parser splits the text at each
  line ending of CommonMark: CRLF, CR, and LF. It does not split at U+2028
  or U+2029, because CommonMark reads them as text. So a CRLF that arrives
  in two live updates still counts as one line ending. A fenced code block
  keeps its tabs. It gives a `TextBlock` for each paragraph,
  heading, list, code block, quote, rule, and table. A paragraph, a
  heading, and a table cell hold `InlineText`, the inline tree of
  `markdown/agent-inline.ts`. `markdown/agent-paragraphs.ts` reads the
  text of each paragraph and heading.
- With `live`, `agentBlocks` reads a message that the agent still writes,
  as [While the agent writes](../../docs/protocol/chat-markdown.md#while-the-agent-writes)
  says. `liveEnd` in `markdown/live-end.ts` finds the paragraph, the
  heading, or the table cell where the text ends: the last line of the
  text is in it, a paragraph also when only a line break follows it, and
  no pipe closes the cell. In that block alone, `closedMarks` in
  `markdown/live-marks.ts` closes each open mark at the end of the text.
  It reads the inline text of the block again with the rules of the
  parser, and adds a closing mark for each mark that can open and cannot
  close, has no pair, and stands outside each pair and each link, the last
  mark first. The parser and the tokens of the whole message stay as they
  are. The read of the block gets the reference definitions of the whole
  message, from `references` of the parse, so a reference link reads as
  in the whole message. Without `live`, a
  message reads each mark as CommonMark does, so a complete message from
  the saved history shows each open mark as typed.
- The inline tree holds text, inline code, line breaks, marks, links, and
  images. It keeps each line break that the parser read, also in a link
  label and in the alt text of an image. A mark is bold text, emphasis, or
  strikethrough, around its own nodes. A soft line break is a space of the
  text. A link keeps the text that the agent wrote around its label, from
  `linkTail` of the parser, so a link that opens nothing shows as typed.
- A block whose inline text shows nothing, such as a heading with no text
  or a paragraph of only line breaks, is not a block. `showsInline` in
  `markdown/agent-breaks.ts` gives this test. An empty quote is not a
  block either.
- Lists and quotes nest at most 16 deep, as `maxDepth` of
  `src/markdown/parser.ts` says. `agentBlocks` shows a deeper list or
  quote as one paragraph of its source lines, with their list marks and
  their own quote marks. `markdown/agent-source.ts` removes the marks of
  the quotes around the lines. The parser reads one more level, inside
  which list and quote marks stay text, so it drops no line, and no text
  is lost.
- An underline counts only when a line break follows it. `agentBlocks`
  turns a heading whose underline is the last line of the message back
  into the text of a paragraph, with the underline. In live text, its open
  marks close after the underline.
- A list item is a `TextItem`: the state of its task box, and its blocks.
  `readTaskBox` of `src/markdown/task-boxes.ts`, which the file preview
  shares, reads a task box at the start of the first paragraph of the
  item, as [Lists](../../docs/protocol/chat-markdown.md#lists) says, and
  takes it out of the text.
- A fence and an indented code block are `code` blocks, with their text
  as the agent wrote it, without the line break at the end. A fence also
  keeps its `label`. `fenceLabel` of `src/markdown/fence-label.ts` reads
  it from the info string of the fence: the first word, in lower case.
  White space or a comma ends the word. The file preview reads its labels
  with the same function. An indented code block has no label, so its
  `label` is `null`. The label is a string, so the block stays plain data
  for `samePlainData`.
- `answerParts` in `markdown/answer-parts.ts` reads the inline tree of one
  block with the context of the chat: the workspaces, the web links of the
  screen, and the file tree. [Text links](text-links.md) gives its rules.
- Last, `answerParts` gives the line breaks that the block draws, as
  [Line breaks](../../docs/protocol/chat-markdown.md#line-breaks) says,
  with `answerBreaks` of `markdown/agent-breaks.ts`. This one pass reads
  the parts that the chat draws, in the order in which they show, also
  inside marks and links. So a line break in a link label counts where the
  link shows it: in the words of a web link or a link to a file, between
  the brackets of a link that opens nothing, and not at all when the link
  shows as a chip or as its address.

## Drawing

- `AgentText` in `components/AgentText.tsx` draws an answer. It parses the
  text once for each text and `live`, with `useMemo`. `MessageLine` keeps
  its blocks in the same way, so a render for another change, such as a
  line that opens, reads no text again. `AgentBlocks` draws the blocks in
  order, and the open body of `MessageLine` shares it.
- The app and the mockups share one renderer of the blocks, as they share
  `MarkdownTable`. `AgentBlocks` and `LineBlocks` live in
  `src/ui/components/chat/`, typed with `TextBlock`. The mockup
  fixtures write the same blocks and inline trees with the builders of
  `docs/mockups/src/fixtures/agentText.ts`. No builder reads Markdown, so
  the fixtures copy no bug of the chat adapter.
- Each view gives the blocks an `AgentDrawing`, from `agentDrawing.ts`
  beside them. Its `text` draws an inline tree at its `TextPlace`: in a
  message line or not, and with pictures or not. Its `code` draws a code
  block of an answer with the colours of its label. `LineBlocks` gives an
  open message line the same colours with `FenceText`. Its `ShowsWords` draws a heading
  only while the text of the heading shows words where it draws.
- `answerDrawing` in `components/answer-drawing.tsx` gives the drawing of
  the app for one message: `AnswerText`, `CodeBlock`, and `useShowsWords`,
  with the pictures of that message. The mockups give `fixtureDrawing`,
  which draws with their own parts. `AgentText` and `MessageLine` keep one
  drawing for each message ID, with `useMemo`. A block compares its
  drawing too, and `samePlainData` counts a function only as the same
  value. So a new drawing at each render would draw each block again.
- `ItemRow` of `components/transcript-rows.tsx` gives `live` to the answer
  that the agent writes now, through `ItemView` of
  `components/TranscriptItem.tsx`. `TranscriptRows` of
  `components/TranscriptView.tsx` names it: the newest item of the running
  turn, when that item is an agent message that is not complete. `agentItem` of `src/shared/transcript/turn-events.ts` marks a
  message `complete` at its `assistant.completed` event. A later step of
  the turn, such as a tool call, or the end of the turn also shows that
  the message is complete.
- `MarkdownItem` of `src/markdown/MarkdownItem.tsx` draws each list item,
  in an answer and in the file preview. An item of one paragraph draws its
  text alone. Another item draws its blocks. A task item draws the fixed
  check box of the shared `TaskBox` at the start of its first paragraph,
  so a task with sub-tasks keeps its box on the line of its words. The box
  is a disabled check box in the look of the design, from the `taskBox`
  class of `MarkdownProse.module.css`, so a press changes nothing.
- A quote is a `blockquote` with its own blocks, and a rule is an `hr`.
  The `prose` class of the shared `MarkdownProse.module.css` gives them
  their look, and the look of bold text, emphasis, strikethrough, and task
  items. `AgentText` adds the class to the element around the blocks,
  beside the `agent` class of `ChatItemView.module.css`, which sets the
  space around them.
- `AnswerText` in `markdown/AnswerText.tsx` draws the text of a paragraph,
  a heading, a list item, and a table cell: `strong`, `em`, and `del` for
  the marks, `br` for a line break, and the chips and links of
  `answerParts`. With `line`, as in a message line, a space comes before
  each `br`. With `pictures`, the image of a picture file shows as its
  picture, as [Pictures in answers](answer-pictures.md) says.
- A numbered list counts up from the number of its first item, as
  Markdown numbers it. `AgentBlocks` gives that number to the `start` of
  the `ol`. A message line writes each number from it. As in CommonMark, a
  number has one to nine digits, so a longer number starts no list.
- In the app, `AgentBlocks` draws each code block through `CodeBlock`, the
  `code` of `answerDrawing`. [Code blocks](code-blocks.md) gives its
  colours, its Copy code button, and the code blocks of a message line.
- `AgentText`, `AnswerText`, and `MessageLine` draw React text and
  elements only, so no HTML of a message reaches the page. The parser
  reads HTML as text, apart from a line-break tag.
  [Formatting](../../docs/protocol/chat-markdown.md#formatting) gives the
  rule for HTML in a message.
- Each live update parses the whole message, and draws again only the
  blocks whose data changed. `AgentText` draws nothing again while its
  text and `live` stay the same. Each block and each `AnswerText` compares
  its new data with its last data, with `samePlainData` of
  `components/same-data.ts`, and draws again only on a change. `AnswerText`
  reads the workspaces, the tree, and the links of the screen itself, so
  a change of them still draws its chips and links again. For an answer of
  100 KiB, the parse takes about 15 ms in Node. `answer=long` of
  [the development page](dev/README.md) shows such an answer.

## List parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#lists) says that agent
messages and the file preview share their list rules, the list rules of
CommonMark. Both views read their lists through the shared parser of
`src/markdown/parser.ts`:

- `src/markdown/empty-item-lists.ts` keeps a later item in the list of an
  empty item, also after two or more blank lines, as CommonMark does.
  `markdown-it` 15.0.3 starts a new list there. The rule joins such a list
  to the list before it, which is then loose.
- `maxDepth` of `src/markdown/parser.ts` is the depth limit of 16 that
  both views apply to lists and quotes. Deeper content shows as paragraph
  text. `src/markdown/block-depth.ts` keeps the parser one level past that
  limit, so the parser drops no line. `src/markdown/token-read.ts` gives
  both views the source lines of a deeper list or quote.
- Both views read task boxes with `readTaskBox` of
  `src/markdown/task-boxes.ts`, and draw their list items with
  `MarkdownItem` of `src/markdown/MarkdownItem.tsx`. A message line draws
  its task boxes in the shared `LineBlocks`, as
  [Message lines](message-lines.md) says.

## Heading parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#headings) says that
agent messages and the file preview read headings with the same rules, the
heading rules of CommonMark. It also gives the rules that only the chat
has. These parts read and draw the headings:

- The chat reads its headings through the shared parser. `agentBlocks`
  keeps the level of each heading, and leaves out a heading with no text,
  such as `## ` while the agent writes. The heading still ends the
  paragraph above it.
- In an early check, `heading` of `markdown/agent-paragraphs.ts` also
  leaves out a heading that cannot show words, from its text alone, as
  `showsWords` of `markdown/readable-text.ts` says. Such a heading holds no
  link and no image, and no text or code node in it holds a character
  other than white space. So `` ## ` ` `` draws nothing. A mark without its
  pair is text, so `## **` shows `**`, as
  [Formatting](../../docs/protocol/chat-markdown.md#formatting) says. The
  early check needs no tree and no workspace list, so the blocks depend
  only on the text.
- A heading with a link or an image stays a block, because the tree and
  the links of the screen decide what it shows. It still ends the
  paragraph above it, also when it draws nothing. When the heading draws,
  the final check, `answerShowsWords` of `markdown/answer-parts.ts`,
  decides whether its parts show words. Parts show words when they hold a
  chip, or text or code with a character other than white space, also
  inside a mark or a link.
- In the app, `AgentBlocks` and `LineBlocks` call the final check through
  the `ShowsWords` of `answerDrawing`. It calls `useShowsWords` of
  `markdown/answer-reading.ts`, with the workspaces, the tree, and the
  links of the screen that `AnswerText` reads. The hidden name of a
  message line uses the same final check, as
  [Message lines](message-lines.md) says.
- A heading shows no picture, so the image of a picture file shows as its
  link there, as [Pictures in answers](answer-pictures.md) says. With no
  alt text, an image of a file of the tree shows the name of the file.
  With no alt text, an image at a web address shows that address, and any
  other image shows nothing. So `## ![](x)` draws nothing
  while `x` names no file of the tree and no web address, also while the
  chat has no tree. When the tree gains a file at `x`, the heading shows
  the name of that file, until the file goes.
- The file preview reads its headings through the same parser, in
  `preview-blocks.ts` of `src/files/markdown/`.
- `AgentBlocks` draws a heading as `h1` to `h6`, at its level, with its
  text through `AnswerText`. It draws nothing for a heading whose parts
  show no words, so a screen reader meets no empty heading.
- `MessageLine` draws a heading as a span with the `heading` class of the
  shared `ToolGroup.module.css`. That class gives the heading weight,
  closed and open. Open, the span shows on its own line. Under an open
  line, a heading after the first table draws through `AgentBlocks` as a
  heading element. The `.messageBody` rules of `ToolGroup.module.css` give
  it the look of a heading of the open line. `LineBlocks` draws nothing
  for a heading whose parts show no words, also no space.
- `MarkdownHeadings.module.css`, in `src/ui/components/common/`,
  gives the headings of an answer and of the file preview one look, under
  its `headings` class. It sets the size of each level, the weight, the
  colour, the letter spacing, the line height, and the line under `h1`.
  `AgentText` and the `MarkdownView` of the file preview add the class to
  the element around their blocks.
- Each view sets the space around its headings. The shared
  `ChatItemView.module.css` sets it for an answer, also for a heading in a
  list item or a quote. `src/files/markdown/MarkdownView.module.css` sets
  it for the file preview. The shared `ToolGroup.module.css` sets it for
  a heading of a message line after a paragraph, a list, or a heading.
  `LineBlocks.module.css` beside it sets it after a code block, and for a
  heading in a list item under an open line.

## Table parts

[Chat tables](../../docs/protocol/chat-tables.md#tables-and-the-file-preview)
says that agent messages and the file preview share their table rules.
These parts read and draw the tables of the chat, the file preview, and the
mockups:

- The chat reads its tables through the shared parser.
  `markdown/agent-tables.ts` turns the tokens of a table into a
  `TextTable`. The table rule of the parser, `src/markdown/table-rule.ts`,
  gives each row only the cells that its source line has, up to the width
  of the header. A body row with no source cell gets one empty cell, so it
  stays visible. The table budgets still count the missing source cells.
  Each row that the parser reads stays in the table, also a line without
  a pipe.
- `src/markdown/table-tokens.ts` reads the tokens of a table for both
  views. `src/markdown/table-rows.ts` holds `CellAlign` and `TableCells`,
  the shared types.
- The file preview fills short rows with empty cells, as
  [the Markdown preview](../files/markdown-preview.md#safety-limits) says.
- `table-rows.ts` imports no React. The mockup fixtures import its types,
  and the worker tests compile those fixtures without JSX. A fixture that
  imports a `.tsx` module fails `npm run typecheck` with TS6142.
- `MarkdownTable`, in `src/ui/components/common/`, draws a table
  as a native table. The chat and the file preview draw their tables
  through it. Each caller draws the content of its cells. Cells
  past the width of the header do not show. The last cell of a short row
  spans the missing columns, up to 1,000, and a cell that spans takes no
  alignment.
- Its styles draw separate borders with no spacing, so one 1 px line
  stands between two cells. Keep them. With collapsed borders, Chrome lays
  out a table in time that grows with the width of its header times its
  rows, also when a short row spans the missing columns.
- Its styles also stand each cell at the top of its row, in both views, as
  [Columns and cells](../../docs/protocol/chat-tables.md#columns-and-cells)
  says.
