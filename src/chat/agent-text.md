# Agent text

This guide belongs to [the chat](README.md). It gives the rules of the code
that formats the text of agent messages: in the chat, and in a message line
of an open work fold.
[Chat Markdown](../../docs/protocol/chat-markdown.md),
[Chat tables](../../docs/protocol/chat-tables.md), and
[Chat message lines](../../docs/protocol/chat-message-lines.md) state the
requirements. Two linked guides hold the rest of the code:

- [Message lines](message-lines.md) gives the code of a message line in
  the work of a turn.
- [Text links](text-links.md) gives the web links, the workspace chips,
  and the file chips of sent messages and answers.

## The chat adapter

`markdown/` reads the Markdown of an agent message with the shared parser
of `src/markdown/parser.ts`. Its modules are pure functions and import no
React.

- `agentBlocks` in `markdown/agent-blocks.ts` reads the whole text of a
  message at each update. So a live message and the same message from the
  saved history show the same blocks. It gives a `TextBlock` for each
  paragraph, heading, list, code block, quote, rule, and table. A
  paragraph, a heading, and a table cell hold `InlineText`, the inline
  tree of `markdown/agent-inline.ts`.
- The inline tree holds text, inline code, line breaks, marks, links, and
  images. A mark is bold text, emphasis, or strikethrough, around its own
  nodes. A soft line break is a space of the text. A link keeps the text
  that the agent wrote around its label, from `linkTail` of the parser, so
  a link that opens nothing shows as typed.
- `keptBreaks` in `markdown/agent-breaks.ts` gives the line breaks that a
  block draws, as [Line breaks](../../docs/protocol/chat-markdown.md#line-breaks)
  says. A block that then draws nothing, such as a heading with no text or
  a paragraph of only line breaks, is not a block. An empty quote is not a
  block either.
- Lists and quotes nest at most 16 deep. `agentBlocks` shows a deeper list
  or quote as one paragraph of its source lines, with their list marks and
  their own quote marks. `markdown/agent-source.ts` removes the marks of
  the quotes around the lines. The parser drops lines past its own nesting
  limit, and `agentBlocks` shows them as paragraph text too, so no text is
  lost.
- An underline counts only when a line break follows it. `agentBlocks`
  turns a heading whose underline is the last line of the message back
  into the text of a paragraph, with the underline.
- A fence and an indented code block are `code` blocks, with their text
  as the agent wrote it, without the line break at the end.
- `answerParts` in `markdown/answer-parts.ts` reads the inline tree of one
  block with the context of the chat: the workspaces, the web links of the
  screen, and the file tree. [Text links](text-links.md) gives its rules.

## Drawing

- `AgentText` in `components/AgentText.tsx` draws an answer. It parses the
  text once for each text, with `useMemo`. `AgentBlocks` draws the blocks
  in order, and the open body of `MessageLine` shares it.
- An item of one paragraph draws its text alone, in `AgentText` and in a
  message line, as in the file preview. Another item draws its blocks.
- A quote is a `blockquote` with its own blocks, and a rule is an `hr`.
  The `prose` class of the mockups' `MarkdownProse.module.css` gives them
  their look, and the look of emphasis and strikethrough. `AgentText` adds
  the class to the element around the blocks, beside the `agent` class of
  `ChatItemView.module.css`, which sets the space around them.
- `AnswerText` in `markdown/AnswerText.tsx` draws the text of a paragraph,
  a heading, a list item, and a table cell: `strong`, `em`, and `del` for
  the marks, `br` for a line break, and the chips and links of
  `answerParts`. With `line`, as in a message line, a space comes before
  each `br`.
- A numbered list counts up from the number of its first item, as
  Markdown numbers it. `AgentText` gives that number to the `start` of the
  `ol`. A message line writes each number from it. As in CommonMark, a
  number has one to nine digits, so a longer number starts no list.
- `AgentBlocks` draws each code block through `CodeBlock`. Inside a
  `CodeCopyProvider`, `CodeBlock` adds a Copy code button beside the
  `<pre>`, so the text of the `<pre>` stays the code alone. `ChatBody` in
  `WorkspaceChat` gives the provider around the chat of the open session.
  Its copy uses the `copy` services of the chat and shows a toast with the
  result. Outside a provider, a code block has no button. The size of the
  button comes from the control sizes, so the block keeps room for the
  40 px button on a phone.
- `AgentText`, `AnswerText`, and `MessageLine` draw React text and
  elements only, so no HTML of a message reaches the page. The parser
  reads HTML as text, apart from a line-break tag.
  [Formatting](../../docs/protocol/chat-markdown.md#formatting) gives the
  rule for HTML in a message.
- Each live update parses the whole message and draws each block again.
  For an answer of 100 KiB, the parse takes about 15 ms in Node, and the
  drawing takes most of the time of an update. `answer=long` of
  [the development page](dev/README.md) shows such an answer.

## List parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#lists) says that agent
messages and the file preview share their list rules, the list rules of
CommonMark. Both views read their lists through the shared parser of
`src/markdown/parser.ts`:

- `src/markdown/token-read.ts` holds the depth limit of 16 that both views
  apply to lists and quotes. Deeper content, and each line that the parser
  drops, shows as paragraph text.
- The file preview reads task boxes, with `preview-tasks.ts` of
  `src/files/markdown/`. The chat reads none, so it shows them as text.

## Heading parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#headings) says that
agent messages and the file preview read headings with the same rules, the
heading rules of CommonMark. It also gives the rules that only the chat
has. These parts read and draw the headings:

- The chat reads its headings through the shared parser. `agentBlocks`
  keeps the level of each heading, and leaves out a heading with no text,
  such as `## ` while the agent writes. The heading still ends the
  paragraph above it.
- The file preview reads its headings through the same parser, in
  `preview-blocks.ts` of `src/files/markdown/`.
- `AgentText` draws a heading as `h1` to `h6`, at its level, with its text
  through `AnswerText`.
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
  list item or a quote. `src/files/markdown/MarkdownView.module.css` sets
  it for the file preview. `components/chat.module.css` sets it for a
  heading of a message line after a code block, and for a heading in a
  list item under an open line.

## Table parts

[Chat tables](../../docs/protocol/chat-tables.md#tables-and-the-file-preview)
says that agent messages and the file preview share their table rules.
These parts read and draw the tables of the chat, the file preview, and the
mockups:

- The chat reads its tables through the shared parser.
  `markdown/agent-tables.ts` turns the tokens of a table into a
  `TextTable`. The parser fills a short row with empty cells, so the
  adapter counts the cells of the source line of each row with
  `readTableRow`, and keeps only those cells, up to the width of the
  header. It removes the quote marks of the line first.
- `rowsInTable` in `markdown/agent-tables.ts` says which body rows stay in
  the table. Today each row that the parser reads stays in it, also a line
  without a pipe. The rows after its count show as paragraph text.
- `src/markdown/table-tokens.ts` reads the tokens of a table for both
  views. `src/markdown/table-rows.ts` holds `readTableRow`, which reads the
  cells of a source row, with escaped pipes and the optional outer pipes.
  `CellAlign` and `TableCells` are the shared types.
- The file preview fills short rows with empty cells, as
  [the Markdown preview](../files/markdown-preview.md#safety-limits) says.
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
