# The Markdown of replies

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
Markdown of a reply of the chat and of the Markdown preview of a file: the
tables, the headings, the quotes, the rules, the marks, the task boxes,
the line breaks, and the pictures. It also gives how a message line in the
work of a turn shows each part. [The chat](design-chat.md) gives the work
fold, and [Links in text](design-links.md) gives the links.

The user chose one `markdown-it` parser for both views on 16 November
2026, with item 3 C of the Markdown plan, and on 17 November 2026, with
item 8 D, that the chat draws each part as the file preview draws it. On
18 November 2026, the user chose items 9 C, 10 B, 11 C, 12 B, and 14 B,
which this page gives at their parts. The mockups draw typed fixtures, so
they read the inline Markdown of the fixtures with their own small reader.

## The parts

- `MarkdownTable` in `src/components/common/` draws each Markdown table of
  a reply and of the Markdown preview of a file as a native table. It
  imports no fixture, so the app can use it too. Each caller draws the
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
- `MarkdownHeadings.module.css` in `src/components/common/` gives the
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
- `MarkdownProse.module.css` in `src/components/common/` gives the quotes,
  the rules, the bold text, the emphasis, the strikethrough, and the task
  boxes of a reply and of the Markdown preview of a file one look, under
  its `prose` class. Each view sets the space above and below its quotes
  and rules, as `app/chat/formatting` and `app/files/markdown` show.
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
    the Markdown plan. The box is the check box of the browser, disabled,
    so it shows whether the task is done and a press changes nothing. In
    an item with more blocks, the box starts the first paragraph of the
    item, as on GitHub, so it stays on the line of its words, as the last
    task of `app/chat/lists/tasks` shows. `app/files/markdown` shows the
    box in the file preview. `markdownTasks.ts` reads the box at the start
    of an item, and `TaskBox` draws it, both in `src/components/common/`.
  - In a reply, a quote lays out its blocks as the reply does, with the
    same gap, and a rule has 16 px above and below it. In the file preview,
    a quote has 10 px under it, as a paragraph does, and a rule has 16 px
    above and below it.

## Marks and line breaks

- `markdownMarks.ts` in `src/components/common/` reads the marks of a
  reply and of a file preview as CommonMark and `markdown-it` read them:
  `**` and `__` around bold text, `*` and `_` around emphasis, and `~~`
  around strikethrough. `markFlanking.ts` beside it gives the flanking
  rules of CommonMark, which decide whether a mark can open or close.
  `MarkedNodes` beside it draws each pair as `strong`, `em`, or `del`.
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
    without a pair as typed. A fixture marks a message that the agent
    still writes with `live`, and the mockups close the open marks of its
    last paragraph.
  - Bold text around code holds the code, so a chip from code inside bold
    text is bold too, from design call 7 of the Markdown plan.
- `answerNodes.ts` in `src/components/chat/` reads the text of an answer
  in the order in which the parser reads it: code first, then Markdown
  links and images, then line breaks, then the marks, and last, in the
  text between the marks, the mentions and the bare addresses. So code,
  links, and chips are units that the marks do not read into, and a path
  keeps its `_`. A mention can start right after a mark, as in
  `*@src/app.ts*`, and it ends before the closing mark, from design call
  11. `AnswerText` beside it draws the text, and `PreviewText` in
  `src/components/files/` draws the text of a file preview.
- A line-break tag, `<br>`, `<br/>`, or `<br />` in any letter case, draws
  a line break in a paragraph, a heading, a list item, or a table cell, of
  a reply and of a file preview, from item 1 of the Markdown plan.
  `markdownBreaks.ts` in `src/components/common/` reads the tags. Other
  HTML shows as text, as the `<kbd>` tags of
  `app/chat/formatting/as-typed` show, and so does a tag in code.
  - A break at the start or at the end of a block draws nothing, so a
    block of only breaks draws nothing. Two or more breaks in a row draw
    at most one empty line. The mockups do not draw these cases.
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

## In the work of a turn

The open work fold shows each agent message as a message line, as
[the chat](design-chat.md) gives. A message line is a `<summary>`, so it
holds no table, no heading, no quote, and no rule element. Emphasis,
strikethrough, links, and chips show in the line, closed and open.

- Closed, the line shows a table as its cells, row by row, with a dot
  between two cells. Open, the line keeps the paragraphs before the first
  table, and the table and the rest of the message show under the line,
  at the left edge of its text, as `app/chat/work/table` shows. A quote
  that holds a table counts as that table.
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
