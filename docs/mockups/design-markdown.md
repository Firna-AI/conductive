# The Markdown of replies

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
Markdown of a reply of the chat and of the Markdown preview of a file: the
tables, the headings, the quotes, the rules, the marks, the task boxes,
the line breaks, the pictures, and the code blocks. It also gives how a
message line in the work of a turn shows each part.
[The chat](design-chat.md) gives the work fold, and
[Links in text](design-links.md) gives the links.

The user chose one `markdown-it` parser for both views on 16 November
2026, with item 3 C of the Markdown plan, and on 17 November 2026, with
item 8 D, that the chat draws each part as the file preview draws it. On
18 November 2026, the user chose items 9 C, 10 B, 11 C, 12 B, and 14 B,
and on 20 November 2026 item 82 B, which this page gives at their parts.
The fixtures write each agent message as the blocks and the inline tree
that the app reads from the Markdown of the agent. The mockups read the
chips, the links, and the files of that tree with `answerParts`, the
reader of the app.

## The parts

- `AgentBlocks` and `LineBlocks` in
  [`src/ui/components/chat/`](../../src/ui/components/chat/) draw the blocks
  of an agent message, typed with `TextBlock` of the app. `AgentBlocks`
  draws an answer and the blocks under an open message line. `LineBlocks`
  draws the blocks in a message line, and its `holdsTable` finds where the
  open line splits. The app draws its agent messages with them too, so
  both views draw each kind of block.
  - Each view gives the blocks its drawing, an `AgentDrawing` of
    `agentDrawing.ts`. The drawing draws the inline text at its place,
    draws a code block, and says whether a heading shows words. The place
    says whether the text is in a message line, and whether a picture can
    show there.
  - `fixtureDrawing.tsx` in `src/components/chat/` gives the drawing of
    the mockups. It draws the text with `AnswerText`, a code block with
    `CodeBlock`, in the colours that [Code blocks](#code-blocks) gives,
    and a heading only when `answerShowsWords` of the app finds words in
    its text.
  - `agentText.ts` in `src/fixtures/` gives the builders of the blocks and
    of the inline text, such as `p`, `heading`, `bullets`, `task`,
    `strong`, and `link`. A string is a text node with exactly its
    characters. No builder reads Markdown, so a fixture copies no bug of
    the reader of the app.
- `MarkdownTable` in
  [`src/ui/components/common/`](../../src/ui/components/common/) draws each
  Markdown table of a reply and of the Markdown preview of a file as a
  native table. The app uses `MarkdownTable` too. Each caller draws the
  content of the cells, such as inline code and line breaks.
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
  - A cell shows a line break where the agent wrote a line-break tag, and
    each row is as high as its highest cell, as
    `app/chat/tables/line-break` and `app/files/markdown` show.
  - Each cell stands at the top of its row, in a reply and in the file
    preview, so a cell of one line stays level with the first line of a
    higher cell. The user chose this on 18 November 2026, with item 12 B
    of the Markdown plan.
- `MarkdownHeadings.module.css` in
  [`src/ui/components/common/`](../../src/ui/components/common/) gives the
  Markdown headings of a reply and of the Markdown preview of a file one
  look, under its `headings` class. It sets the size, the weight, the
  colour, and the letter spacing of each level, and the line under a
  level-one heading. Each view sets the space around its headings, as
  `app/chat/headings` and `app/files/markdown` show.
  - A heading shows at the level that the agent wrote, from `h1` to `h6`.
    Each level has its own size, as a ratio of the text around it: 1.7143,
    1.4286, 1.2857, 1.1429, 1, and 0.9286 times the text size. At the
    13 px text of a reply and of the file preview, the levels are about
    22.3, 18.6, 16.7, 14.9, 13, and 12.1 px. Each level has the heading
    weight and the ink colour, and level 1 has a 1 px line in the border
    colour under it.
  - Bold text has weight 700, which is heavier than the heading weight, as
    `MarkdownProse.module.css` gives. The size step sets levels 1 to 4
    apart from a bold label.
  - In a reply, a heading after another block stands further from it than
    two paragraphs stand from each other: 12 px more for levels 1 and 2,
    and 8 px more for levels 3 to 6. A heading that starts the reply has
    no space above it, and the gap of the reply sets the space under each
    heading. A heading inside a list item or a quote stands as far from
    the block above it as a heading in a reply does. The mockups do not
    draw these cases.
  - In the file preview, a heading of level 1 or 2 has 24 px above it, and
    a smaller heading has 20 px. Level 1 has 10 px under its line, level 2
    has 8 px under it, and the smaller levels have 6 px. The first block of
    the file has no space above it.
  - The text of a heading shows inline code, the marks, and workspace
    chips, as a paragraph does. A heading with no text draws nothing.
- `MarkdownProse.module.css` in
  [`src/ui/components/common/`](../../src/ui/components/common/) gives the
  quotes, the rules, the bold text, the emphasis, the strikethrough, and
  the task boxes of a reply and of the Markdown preview of a file one look,
  under its `prose` class. Each view sets the space above and below its
  quotes and rules, as `app/chat/formatting` and `app/files/markdown` show.
  - A quote has a 2 px line in the strong border colour at its left, 12 px
    from its text, and its text is muted. It has no fill and no other
    border, so the line is no accent. A quote holds blocks, such as
    paragraphs and lists.
  - A rule is a 1 px line in the border colour across the width of the
    text.
  - Bold text has weight 700 in both views, from item 11 C of the
    Markdown plan, also inside a heading or a header cell. Emphasis is
    italic, and strikethrough draws a line through its text. The three
    marks keep the size and the colour of the text around them, so bold
    text in a quote stays muted. Before, the file preview gave bold text
    the ink colour. Its text has the second ink colour, so bold text stood
    out by its colour there, but not in a reply. With the colour of its
    text, bold text has one look in both views.
  - A task item of a list, `- [ ]` or `- [x]`, shows a fixed check box in
    the place of its bullet, in the indent of the list, from item 14 B of
    the Markdown plan. The box is a disabled check box, so it shows
    whether the task is done, a press changes nothing, and a screen reader
    reads its state. In an item with more blocks, the box starts the first
    paragraph of the item, as on GitHub, so it stays on the line of its
    words, as the last task of `app/chat/lists/tasks` shows.
    `app/files/markdown` shows the box in the file preview.
    `markdownTasks.ts` in `src/components/common/` reads the box at the
    start of an item of the file preview. `TaskBox` in
    [`src/ui/components/common/`](../../src/ui/components/common/) draws
    it. A fixture of a reply writes the state of the box with `task` of
    `agentText.ts`.
  - The box has the look of the design, not of the browser, in both views
    and in a message line, from item 82 B of the Markdown plan. The
    browser drew a done box in light grey in the light scheme, so its
    check was hard to see. The box has the size of the box of the browser,
    13 px, and the small radius. An open box is empty, with a 1 px border
    in the muted colour. A done box has the ink fill and a check in the
    surface colour: a dark box with a light check in the light scheme, and
    a light box with a dark check in the dark scheme. The `taskBox` class
    of `MarkdownProse.module.css` gives the look. A mask in the shape of
    the check cuts the check from a layer in the surface colour, so the
    check takes the colours of the scheme. The box keeps its colours when
    the page prints, and with forced colours it takes the look of the
    system.
  - In a reply, a quote lays out its blocks as the reply does, with the
    same gap, and a rule has 16 px above and below it. In the file preview,
    a quote has 10 px under it, as a paragraph does, and a rule has 16 px
    above and below it.

## Marks and line breaks

- The marks of a reply and of a file preview follow CommonMark and
  `markdown-it`: `**` and `__` around bold text, `*` and `_` around
  emphasis, and `~~` around strikethrough. A fixture of a reply writes
  each mark as a node of its tree, as the app reads it. `markdownMarks.ts`
  in `src/components/common/` reads the marks of a file preview.
  `markFlanking.ts` beside it gives the flanking rules of CommonMark, which
  decide whether a mark can open or close. `MarkedNodes` beside it draws
  each mark of a file preview as `strong`, `em`, or `del`.
  - A mark pairs only where CommonMark lets it open and close, so a mark
    without a pair shows as typed: the `**` and the `*` of a file pattern
    such as `tests/**/*.test.ts`, a `*` between two spaces, and a single
    `~`, as `app/chat/formatting/as-typed` shows. A `_` inside a word
    stays text.
  - While the agent writes, a mark that opens and has no pair yet closes
    at the end of the text, so `**Next:` shows `Next:` in bold at once, as
    `app/chat/formatting/writing` shows. The user chose this on
    18 November 2026, with item 9 C of the Markdown plan. The rule closes
    only a mark that can open and cannot close, such as a `**` after a
    space and before a letter. A mark that can also close, such as the
    `**` of `tests/**/*.test.ts`, stays text, so a file pattern never
    turns the rest of the text bold. A finished message shows a mark
    without a pair as typed. The fixture of a message that the agent
    still writes holds the tree that the app reads then, with the open
    mark closed.
  - Bold text around code holds the code, so a chip from code inside bold
    text is bold too, from design call 7 of the Markdown plan.
- `answerParts` in `src/chat/markdown/answer-parts.ts` of the app reads
  the inline tree of a fixture. The tree holds code, links, images, line
  breaks, and marks as nodes. So the marks do not read into code, links,
  or chips, and a path keeps its `_`. In the text nodes, the reader finds
  the mentions and the bare addresses. A mention can start right after a
  mark, as in `*@src/app.ts*`, and it ends before the closing mark, from
  design call 11. `AnswerText` in `src/components/chat/` draws the text,
  and `PreviewText` in `src/components/files/` draws the text of a file
  preview.
- A line-break tag, `<br>`, `<br/>`, or `<br />` in any letter case, draws
  a line break in a paragraph, a heading, a list item, or a table cell, of
  a reply and of a file preview, from item 1 of the Markdown plan.
  `markdownBreaks.ts` in `src/components/common/` reads the tags of a
  file preview. A fixture of a reply writes each break as a node of its
  tree. Other HTML shows as text, as the `<kbd>` tags of
  `app/chat/formatting/as-typed` show, and so does a tag in code.
  - A break at the start or at the end of a block draws nothing, so a
    block of only breaks draws nothing. Two or more breaks in a row draw
    at most one empty line. `answerParts` keeps the breaks of a reply by
    the rule of `src/markdown/kept-breaks.ts` of the app. The mockups do
    not draw these cases.
  - `app/chat/formatting` shows an address on two lines.
- A Markdown image of a reply whose target is no file of the workspace
  shows its alt text, and no picture loads, from item 5 A of the Markdown
  plan. At a web address, the alt text is a link, as
  [Links in text](design-links.md#links-in-chat-text) says.
- The file preview shows a picture at a web address in the same way: its
  alt text is a link, and no picture loads, from item 10 B of the
  Markdown plan of 18 November 2026. `PreviewText` draws it with
  `WebImagePart` of the chat, as the picture of the suggestions in
  `app/files/markdown` shows.

## Code blocks

A code block of a reply and of the Markdown preview of a file shows its
text in a box in the mono font, with the `block` look of
[MarkdownView.module.css](../../src/ui/components/files/MarkdownView.module.css).
The user chose on 26 November 2026, with A of code colours decision 1,
that the fence label of a block, the word after its opening fence, gives
its colours.

- A block whose label names a known language, such as `rust` or `ts`,
  shows the colours of a file tab of that language. Keywords, types,
  strings, and numbers take their code colours, and comments are italic.
  `highlightLines` and the language families of
  [`src/files/code/`](../../src/files/code/) give the colours, and
  `TokenSpans` of its code view draws them, so the same code looks the
  same in a reply and in a file tab. `app/chat/code-blocks` shows a Rust
  block, and `app/files/markdown` shows a TypeScript block.
- A block without a label, with a label of no known language, or with a
  label for text, such as `text`, `console`, or `log`, stays plain, from
  design call 4 of the code colours plan, as the requests of
  `app/chat/code-blocks` and the test commands of `app/files/markdown`
  show. No block shows the name of its language.
- The colours are spans inside the one `pre` of the block, with the line
  feeds of its text, so the block keeps its text as written, and Copy code
  copies that text.
- `CodeBlockText` in `src/components/common/` draws the text of a block
  for `CodeBlock` of the chat and for `MarkdownView` of the file preview.
  The blocks of the app keep no fence label, so the fixtures stand for the
  label of a block with a file name, such as `example.rs` for `rust`.
  `codeBlockNames` in `src/fixtures/codeBlockConversations.ts` names each
  labelled block of a chat fixture, and a code block of a Markdown fixture
  holds its name.
- An open message line in the work of a turn shows its code blocks in
  colour too, and a closed line shows a code block as plain text in the
  line, from design call 2 of the code colours plan. The mockups do not
  draw this case, because `LineBlocks` draws the code block of a line as
  plain text.

## In the work of a turn

The open work fold shows each agent message as a message line, as
[the chat](design-chat.md) gives. A message line is a `<summary>`, so it
holds no table, no heading, no quote, and no rule element. Emphasis,
strikethrough, links, and chips show in the line, closed and open.

- Closed, the line shows a table as its cells, row by row, with a dot
  between two cells. Open, the line keeps the paragraphs before the first
  table, and the table and the rest of the message show under the line,
  at the left edge of its text, as `app/chat/work/table` shows. A list or
  a quote that holds a table, at any depth, counts as that table.
- A summary may hold a heading, but its button role hides the heading
  from the heading list of a screen reader. Each heading of the line has
  the heading weight and the size of the text of the line. Closed, the
  line shows the text of a heading in the line, so the line stays one
  line, and the weight shows where the heading ends. Open, the line shows
  each heading on its own line, 10 px under the block above it, as
  `app/chat/headings/work` shows. A heading after the first table shows
  under the line as a heading element, in the same look.
- The line draws each quote and each rule as a span with the look of
  `MarkdownProse.module.css`, and `MessageLine.module.css` gives the rest
  of their look in the line, from design call 13 of the Markdown plan.
  Closed, the line shows a quote as its text, in the muted colour of a
  quote and without its line, so the words after it read as new text, and
  a rule as a middle dot, `·`. Open, the line shows a quote as a block,
  6 px from the blocks around it, and a rule as a line, 10 px from them,
  as `app/chat/formatting/work` shows. A quote or a rule after the first
  table shows under the line as an element, in the look of a reply.
- Closed, the line shows each line break as a space, so the line stays one
  line, also in the cells of a table. Open, the line breaks, from design
  call 3 of the Markdown plan.
- The line shows the fixed check box of each task item, from item 14 B
  of the Markdown plan. Closed, the box stands in the line before the
  words of its task, 4 px from them, so the line keeps the state of each
  task in view. Open, the box takes the place of the bullet, as in a
  reply, as `app/chat/lists/tasks-work` shows. A press on the box opens or
  closes the line, as a press on its words does. `MessageLine.module.css`
  places the box.
