# The Markdown preview

This guide belongs to [the Files screens](README.md). It gives the worker
that parses the Markdown of a preview, and the limits of its parse.
[Safety](README.md#safety) gives the safety rules of every screen.

## The worker

A module worker parses the Markdown of a preview: its blocks, its inline
content, and its link references. Vite bundles the worker, so the shell
injects nothing for it. The worker loads from the origin of the app, so a
Content-Security-Policy of the app must allow `worker-src 'self'`. Until
the first parse arrives, the preview shows that the file opens. A new
version of the file keeps the last rendered version on screen until its
own parse arrives.

When no worker can start or parse, the preview shows that the file didn't
open, with Try again, as a failed read does. Try again parses the text in
a new worker. A static render, as in a test, cannot wait for a worker. It
passes `parseMarkdown` as `markdownParser` of `FileContent`, or as
`parser` of `MarkdownView`, and the parse runs on the calling thread.

## Safety limits

Emphasis and strong emphasis pair their `*` and `_` markers by the
CommonMark rules. A marker in the text of a link, an image, or a
strikethrough pairs only inside that text. Code spans and link addresses
do not supply markers. The parser keeps escaped `*` and `_` characters as
text. Emphasis, strong emphasis, strikethrough, and links nest at most 12
levels deep. Deeper emphasis markers show as text. Deeper links, images,
and strikethrough show their source as text.

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
[Chat Markdown](../../docs/protocol/chat-markdown.md#short-rows) says.
