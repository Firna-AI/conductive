# The Markdown preview

This guide belongs to [the Files screens](README.md). It gives the worker
that parses the Markdown of a preview, the rules that the preview adds to
the shared parser, and the limits of its parse.
[Safety](README.md#safety) gives the safety rules of every screen.

## The worker

A module worker parses the Markdown of a preview with the parser that the
chat uses too, `markdownParser` of `src/markdown/parser.ts`, by the rules
of CommonMark with the tables and the strikethrough of GitHub. The
preview adapter, `previewDocument`, turns the tokens of the parser into
the `MarkdownDocument` that `MarkdownView` draws. Vite bundles the worker,
so the shell injects nothing for it. The worker loads from the origin of
the app, so a Content-Security-Policy of the app must allow
`worker-src 'self'`. Until the first parse arrives, the preview shows that
the file opens. A new version of the file keeps the last rendered version
on screen until its own parse arrives.

When no worker can start or parse, the preview shows that the file didn't
open, with Try again, as a failed read does. Try again parses the text in
a new worker. A page that shows no file, such as a skill tab, gives the
wait and the failure its own words with `states` of `MarkdownView`. A
static render, as in a test, cannot wait for a worker. It
passes `previewDocument` as `markdownParser` of `FileContent`, or as
`parser` of `MarkdownView`, and the parse runs on the calling thread.

## The adapter

The adapter keeps the blocks that the parser reads, and adds the rules of
the preview:

- A task box, `[ ]`, `[x]`, or `[X]`, at the start of the first paragraph
  of a list item shows as a check box, as on GitHub. A space, a tab, or
  the end of the line follows the box as typed. The parser reads no task
  box, so `readTaskBox` of `src/markdown/task-boxes.ts` reads it, for the
  preview and for the chat. `MarkdownItem` of `src/markdown/MarkdownItem.tsx`
  draws each list item in both views, with the box at the start of the
  first paragraph, so a task with sub-tasks keeps its box on the line of
  its words.
- Lists and quotes nest at most 16 levels deep, as in the chat. A deeper
  list or quote shows as one paragraph of its source lines, with their
  marks. The parser reads one more level, inside which list and quote
  marks stay text, so it drops no line, and no text of the file is lost.
- A link opens only an absolute `http`, `https`, or `mailto` address. Any
  other link shows its label as text. The parser makes no link of a
  script or a data address, so such a link shows as typed. A link in the
  label of a link shows as its text.
- An image shows its alt text, and no picture loads. At a web address,
  an absolute `http` or `https` address, the alt text is a link to that
  address, with the link rule above, as
  [Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
  says. In the label of a link, and at any other address, an image shows
  its alt text alone.
- A line-break tag and a hard line break show as a line break. Each block
  draws its line breaks by the rule of `src/markdown/kept-breaks.ts`,
  which the chat shares, as
  [Line breaks](../../docs/protocol/chat-markdown.md#line-breaks) says.
  The rule reads the label of a link as text of its block. A link that
  holds nothing, such as `[](https://example.com)`, stays an empty link,
  as CommonMark draws it, and the rule counts nothing for it.
- A soft line break stays a line of the text, so the browser shows it as
  a space.
- A fence keeps its `label`, which `fenceLabel` of
  `src/markdown/fence-label.ts` reads, as for the chat. An indented code
  block has no label. The parse in the worker also colours the lines of a
  block whose label names a language, with `languageOfLabel` and
  `highlightLines` of `src/files/code/`. So the colours of a long or
  crafted file stay off the thread of the page too. `MarkdownView` draws
  the coloured lines with `CodeText` of `src/files/code/`. Any other block
  shows plain text, as
  [Colours](../../docs/protocol/chat-code-blocks.md#colours) says.
- Each row that the parser reads stays in its table, also a line without
  a pipe, within the table budget below.

## Safety limits

The parser pairs the marks of emphasis, strong emphasis, and
strikethrough by the rules of CommonMark. Emphasis, strong emphasis,
strikethrough, links, and images nest at most 12 levels deep, as
`src/markdown/inline-depth.ts` sets for the preview and the chat. A deeper
mark or link shows its Markdown as typed around its content, and a deeper
image shows its Markdown as typed.

A run of more than 256 characters without a space renders as adjacent
text nodes that end between whole graphemes. The text and its lines stay
the same, and the browser lays the run out in linear time. Text with
spaces stays one text node. The part length is a rendering detail, not a
read limit.

A table row with fewer cells than its header gets empty cells. All tables
of one file, also in quotes and lists, add at most 65,536 empty cells.
The row that would pass that count ends its table. From that row on, the
rest of the file shows as text, as typed: with its line breaks, and with
no Markdown. Each file starts with the whole count, so its cells stay in
proportion to its size.
[Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
states this budget. Agent messages add no empty cells to a short row, as
[Chat tables](../../docs/protocol/chat-tables.md#short-rows) says.

The preview counts the cells of a row as the parser does, so a row of one
pipe, `|`, has no cell of its own. The parser also ends a table at the row
whose empty cells would pass 65,536 in that one table. That row passes the
count of the file too, so the rest of the file shows as text from that
row.
