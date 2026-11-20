# Agent text

This guide belongs to [the chat](README.md). It gives the rules of the code
that formats the text of agent messages: in the chat, and in a message line
of an open work fold. It also gives the workspace chips of sent messages
and answers, and the file chips and the pictures of answers.
[Chat Markdown](../../docs/protocol/chat-markdown.md),
[Chat tables](../../docs/protocol/chat-tables.md),
[Workspace links](../../docs/protocol/workspace-links.md), and
[File mentions](../../docs/protocol/file-mentions-answers.md)
state the requirements.

- `textBlocks` reads the whole text of a message at each change of the
  text. So a live message and the same message from the saved history show
  the same blocks. `AgentText` and `MessageLine` keep the blocks while the
  text stays the same, so a render for another change reads no text again.
- `textBlocks` checks for a code fence before it checks for a table, so a
  table in a code block stays code. A `table` block, `TextTable`, can start
  directly after a line of a paragraph or a list.
- `textBlocks` reads each list with the list reader that it shares with
  the file preview, as [List parts](#list-parts) says. It parses the lines
  of each item with its own block rules, so a `TextItem` holds the lists,
  paragraphs, headings, code blocks, and tables that the agent indents
  under the item. Past `maxNesting` levels, the lines of an item join into
  one paragraph.
- `textBlocks` replaces tabs with spaces before it reads the structure, as
  the file preview does. A code block outside a list takes its text from
  the lines with their tabs, so it keeps them.
- An item of one paragraph draws its text alone, in `AgentText` and in a
  message line, as in the file preview. Another item draws its blocks.
- `AgentBlocks` draws the blocks of a message in order. `AgentText` and the
  open body of `MessageLine` share it. A table draws through
  `MarkdownTable`. A paragraph, a heading, a list item, and a table cell
  draw their text through `AnswerText`, with bold, so a workspace link in a
  cell shows as a chip.
- A numbered list counts up from the number of its first item, as
  Markdown numbers it. So a list that starts at 2, such as the rest of a
  list after a bulleted list, shows 2. `AgentText` gives that number to
  the `start` of the `ol`. A message line writes each number from it. As
  in CommonMark, a number has one to nine digits, so a longer number
  starts no list.
- `AgentBlocks` draws each code block through `CodeBlock`. Inside a
  `CodeCopyProvider`, `CodeBlock` adds a Copy code button beside the
  `<pre>`, so the text of the `<pre>` stays the code alone. `ChatBody` in
  `WorkspaceChat` gives the provider around the chat of the open session.
  Its copy uses the `copy` services of the chat and shows a toast with the
  result. Outside a provider, a code block has no button. The size of the
  button comes from the control sizes, so the block keeps room for the
  40 px button on a phone.
- `MessageLine` draws the code blocks of its summary as spans, with no
  button, because a summary is a button. A code block under an open line
  draws through `AgentBlocks`, so it has the button.
- `AgentText`, `AnswerText`, and `MessageLine` draw React text and
  elements only. So HTML in a message shows as text.
- A `<summary>` holds only phrasing content and headings, and no
  paragraph, list, or table. So `MessageLine` draws each block as a span,
  which CSS shows as a block while the line is open. A table cannot go into
  the line, so a closed line shows a table as its cells, with a middle dot
  between two cells.
- `MessageLine` draws each heading as a span too, although HTML lets a
  summary hold a heading. So the closed line stays one line. The button
  role of a summary also hides a heading from the heading list of a screen
  reader. [Heading parts](#heading-parts) gives the look of the span.
- An open line keeps the blocks before the first table in its summary.
  When a list holds that table, at any depth, the summary keeps the blocks
  before that list. The table or its list, and the blocks after it, draw
  under the summary, only while the line is open, so a closed line lays
  out no hidden table.
- A line that starts with a table, or with a list that holds one, keeps
  its closed text in a visually hidden span. So the open line keeps a name
  for a screen reader. An empty heading before the table counts as no
  text, because it draws nothing. That hidden copy shows no chips, and
  `PlainLinks` of `src/shell/ui/text-links.tsx` draws each link in it as
  its words. A `MentionsProvider` without files removes file chips. So
  the keyboard cannot reach a link in it.

## Web addresses

- `src/markdown/web-links.ts` reads web addresses for chat text, the
  message field, and the mockups. It imports no React or app module.
  `bareAddressAt` reads a bare address without trailing punctuation or
  marks. A `)` or a `]` at its end stays in only when it closes a `(`
  or a `[` inside the address. `webAddressParts` splits plain text into
  addresses and text, with an optional Markdown label.
- `webLink` checks an address and gives its kind: an app page, a local
  server with its port, or another web page. The caller supplies the app
  origin and a page check built on `parseRoute`. `appAddress` joins the
  raw path segments with one slash, then adds the query and hash.
- `labelHidesAddress` tests a Markdown label as it shows, without code
  marks, bold marks, invisible characters, or spaces at its ends. A label
  that then shows nothing, holds `://`, or starts with `www.` hides where
  its link leads.
- `src/markdown/markdown-destination.ts` supplies `readInlineTarget`. It
  reads the target of an inline link after its `(`: the spaces and line
  breaks around the address, the address, an optional link title, and the
  `)`. Chat text, the message field, the mockups, and the file preview
  share it, with its address boundaries, its escape decoding, and its
  length limits. It returns the decoded address, its source offsets, and
  the index after the `)`.
- Chat text, the message field, and the mockups read each target through
  `lineTargets` of the same module. It keeps each Markdown link on one
  line, as its label is. A line break inside its parentheses makes it no
  Markdown link, so no chip of a sent message or of the field takes in a
  line break. An answer joins the lines of a paragraph before it reads
  them, so it reads a link that spans lines as the file preview does.
- `lineTargets` reads each target of a text once. Keep it so. The readers
  try a link at each `[`, and many `[` can reach the same `(`. One read
  for each `[` would take seconds for a crafted answer.
- `chatParts` uses `bareAddressAt` and `lineTargets`, through the
  tokenizer of `links/chat-tokens.ts`. The message field uses
  `webAddressParts` and reads no code, so its addresses stay text.

## Web links

[Chat links](../../docs/protocol/chat-links.md) states the links of chat
text. These parts read and draw them:

- `chatParts` gives a `LinkPart` of `links/link-parts.ts` for each address
  that is no chip and that its `web` reader accepts. The part holds the
  `WebLink` and its words. A bare address shows as the text has it. In an
  answer, a Markdown link shows as its label, with the code and bold of the
  label. Its `**` marks bold only inside the label, and its link title
  does not show. A label that hides the address, by `labelHidesAddress`,
  shows the address as the text has it.
- In a sent message, a Markdown link shows as typed. Its brackets, its
  label, and its link title read again as text and code, with no link, and
  its address reads as a bare address: a chip, a link, or text. The
  Markdown of an image, `![alt](address)`, shows as typed in the same way,
  also in an answer, unless its target names a file of the workspace.
  A file target shows its label as a link that opens the file, or its
  picture, as [Pictures in answers](#pictures-in-answers) says. Each other
  Markdown link whose address is no link shows as typed, with its code
  and bold.
- Inline code whose text, without the spaces at its ends, is one address
  that the reader accepts holds that link, as `CodePart.link`. A
  workspace link alone in code is such a link, not a chip. Code in a label
  that shows as typed holds no link.
- `useChatParts` gives `chatParts` the `linkOf` of `useTextLinks`, from
  `src/shell/ui/text-links.tsx`. The workspace screen gives that module
  the app origin, the page check, and the port previews of the workspace,
  as
  [The chat of the workspace](../shell/workspace/screen-parts.md#the-chat-of-the-workspace)
  says. Without them, as on the development page, each link opens a new
  tab. Where no server runs, such as in a read-only workspace, a local
  address stays text, so a Markdown link to it shows as typed.
- `WebLinkText` and `CodeText` in `links/WebLinkText.tsx` draw the parts
  with the mockups' `TextLink` and the `opener` of `useTextLinks`. A link
  of the app is an `AppLink` of `src/shell/ui/AppLink.tsx`: a plain click
  opens its page in the same window, and replaces the address when that
  page already shows. A local address is an anchor of the app: a plain
  click opens the port preview in the same window. A click with a
  modifier key on either stays with the browser. Every other link opens a
  new tab with `noopener noreferrer`. In the plain mode of `PlainLinks`, a
  link draws its words alone.
- A link in a message line is an anchor, so `useFold` leaves a press on it
  to the link, and the line stays open or closed.
- A copy of chat text gives the words of each link, as the browser copies
  a link. `mention-copy.ts` keeps the browser's own copy while each chip
  shows its copy text.

## Workspace chips

- Sent messages and agent answers show each workspace link as a chip, as
  [Workspace links](../../docs/protocol/workspace-links.md) says. One
  tokenizer, `tokens` in `links/chat-tokens.ts`, reads both, in one pass
  from left to right, and `chatParts` in `links/chat-parts.ts` turns its
  tokens into parts. A backtick starts code first, so a link in code
  is no chip. A Markdown link whose brackets stand outside code is one
  unit, also when its label holds code or bold, so it shows as its chip
  alone. Then bare links count. In an answer, `**` marks bold around text,
  chips, and links, and a bare link ends before a mark. Bold ends at code,
  as before. A Markdown link of no workspace is a link or shows as typed,
  as [Web links](#web-links) says. `links/workspace-links.ts` reads each link with the
  URL parser and `parseRoute`. It builds the chip address with
  `appAddress` of `src/markdown/web-links.ts`. A link is a chip only when
  it has the origin of the links of the list, and the router reads a page of a
  workspace of the org in that list. The chip shows the current name, in
  bold while the workspace has unread output, as the list does. Its
  list mark shows the state and the GitHub state, from `chipOf` in
  `links/LinksContext.tsx`, as
  [The list mark](../../docs/protocol/workspace-life.md#the-list-mark)
  says. The chip opens the page that the router read, with its tab path,
  query, and hash. A link whose path names a session that the reader knows
  shows as the session chip of the mockups instead: `useLinkedSession` in
  `links/session-links.ts` finds a live session of the chat's workspace, or
  a session from the one read of another workspace for the load of the
  chat. Its mark follows the workspace list, as a workspace chip does.
  While that read runs, after it fails, and for a session that the
  workspace does not hold, the link keeps the chip of its workspace. Every
  other address is a link or text, as [Web links](#web-links) says. The
  message field reads its text with `webAddressParts`, which reads no code.
  A message line of
  a work fold shows chips too. A click on a chip there stays with the
  chip, so the line does not toggle, and a click with a modifier key opens
  a new tab as on any link.

## File chips in answers

- `AnswerText` in `links/LinkedText.tsx` draws the text of an answer:
  `AgentText` and `MessageLine` use it for each paragraph, heading, list
  item, and table cell. It reads bold, workspace links, `@` mentions, and
  paths in inline code. A message of a member reads its parts with
  `useChatParts` and draws them with `ChatText`, in `UserBubble` of
  `components/TranscriptItem.tsx`. It reads mentions but keeps its code.
- `chatParts` gives a `file` part for a mention or inline code that names
  an entry of the tree. `links/file-targets.ts` reads both:
  `mentionTarget` finds the entry of a mention, with a line target and an
  end mark of a sentence after it. `codeTarget` finds the entry of inline
  code, inside the repository or under its folder. The line targets come
  from `splitLineTarget` in `src/shared/line-target.ts`.
- A Markdown link or image of an answer whose target is an entry of the
  tree gives a `file-link` part: `fileLinkTarget` reads the target, and
  `FileTextLink` draws a normal link with the label, which opens the file.
  An image of a picture file can show as its picture instead, as
  [Pictures in answers](#pictures-in-answers) says. `chat-tokens.ts` reads
  a target that is not a web address only where paths count, as in an
  answer.
- Code in the label of a Markdown link stays code. Where `**` marks bold, a
  mention ends before the mark.
- A text follows the tree only when it holds `@`, or in an answer a
  backtick or `](`. So a change of the tree draws only the texts that can
  change.
- The folder of the repository comes from the read of the saved view, in
  `ChatSnapshot.repositoryFolder`. `WorkspaceChat` gives it to
  `MentionsProvider`, and `useRepositoryFolder` reads it. A record of the
  workspace with another repository clears the folder, and
  `afterRepositoryMove` in `state/workspace-records.ts` reads the view
  again for the folder of the new repository. The chat drops a reply that
  comes after a later change. After a failed read, the chat has no folder
  until the next change or load, so no path of the old folder is a chip.
- The chip of a file with lines shows them after its name, and its press
  calls `openFile` with the lines. The shell opens the file tab as text at
  the lines.

## Pictures in answers

[Pictures in answers](../../docs/protocol/file-mentions-answers.md#pictures-in-answers)
states the requirements. These parts read and draw the pictures:

- `chatParts` sets `picture` on the `file-link` part of the image form,
  `![label](path)`, of a PNG, JPEG, GIF, or WebP file, which
  `pictureType` of `src/files/page/file-view.ts` knows by the name. A
  link without `!`, a folder, and each other file, such as an SVG file,
  keep `picture` false. The part does not know where it shows, so one
  reading serves each place.
- `AnswerText` and `ChatText` take `pictures`, an `AnswerPictures` with the
  ID of the agent message. `Part` draws a part with `picture` as
  `FilePicture` only with `pictures`, else as `FileTextLink`. `AgentText`
  gives `pictures`, with the ID of its item in the transcript, to its
  paragraphs and list items. A heading and a table cell get none, so the
  image keeps its link there.
- `MessageLine` gives `pictures` only while the line is open, also to the
  blocks that open under the line. So the closed line shows the link and
  stays one line. The hidden copy of a line that starts with a table gets
  none.
- `FilePicture`, in `links/FilePicture.tsx`, draws the mockups'
  `AnswerPicture` with an opener: the link of `fileOpener`. So a plain
  press opens the file tab in each state, and a press with a modifier key
  stays with the browser. The title is the path. The alternative text and
  the label of the box are the label without its code and bold marks. The
  link shows the label with its code and bold, through `labelText` of
  `links/FileTextLink.tsx`, so it looks as the link of each other file.
- Without `ChatMentions.pictures`, the picture shows the link and watches
  nothing. With a reader, the box of the label shows until the read and
  the decode end. `useNearView`, in `ui/near-view.ts`, watches the box
  with an `IntersectionObserver`. The read starts when the box comes
  within 400 CSS px of the part of the chat that shows.
- `ChatPane` gives its scroll box to the observer as its root, through
  `NearViewRoot`. Reason: a scroll box clips each element at its own
  edges, so a margin around the window does not reach into the chat.
  Outside a chat, the margin applies to the window. Without
  `IntersectionObserver`, the read starts at once.
- `usePictureRead`, in `links/picture-read.ts`, reads the path with
  `ChatPictures.read`, with the ID of the agent message as `message`.
  Then `decodePicture` of `src/files/page/decode-picture.ts` gives the
  size. A failed read and bytes that the browser cannot draw show the
  link. An unmount, or a change of the reader, the path, or the message,
  aborts the read and stops the decode.
- When the shell takes the reader away, as when the sandbox stops, each
  picture shows its link. When the reader comes back, the read gives the
  result that the reader kept, and the picture shows again.
- A picture is a link, so a press on a picture in an open message line
  opens the file, and `useFold` leaves the line open.
- In the box and the picture states, `FilePicture` puts its link in a
  span with `data-mention`, beside a `ChipCopyText` with the Markdown
  image as the agent wrote it. So a copy gives that Markdown, as a copy of
  a chip gives its mention, and the copy holds no picture bytes. The link
  state has no such span, so a copy gives the label, as for each other
  link.

## List parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#lists) says that agent
messages and the file preview share their list rules, the list rules of
CommonMark. These parts read the lists of both:

- `src/markdown/list-items.ts` holds them. `listMarker` reads the marker
  of an item. `readList` reads the items of one list and the lines that
  belong to each item: the lines indented to its text, and lazy lines that
  continue its paragraph. `maxNesting` is the depth limit of both views.
- Each caller of `readList` gives its own rules. `startsBlock` says which
  line ends the text of an item. `parseItem` parses the lines of one item
  with the block rules of the caller. `tasks` says whether `[ ]` starts a
  task box. The file preview reads task boxes, and the chat shows them as
  text.
- `readList` passes `parseItem` the unindented lines of the item. Each
  parser stops at the first of them that continues no paragraph, such as
  a line after a code block or a table, and returns `end`. That line then
  leaves the item, as in CommonMark.
- `interruptsParagraph` says whether a list can start directly after a
  line of a paragraph: a bullet with text, or the number 1 with text. The
  chat and the file preview both use it. The chat tracks whether its
  paragraph is open. A heading ends the paragraph, and a rule, which shows
  as text, closes it, so a list of any number can start under either. A
  list marker comes before a table, so `- a | b` with a separator row
  under it starts a list.
- `src/markdown/lines.ts` holds the line tests that both readers share,
  such as `expandTabs`. Like `table-rows.ts`, these modules import no
  React.

## Heading parts

[Chat Markdown](../../docs/protocol/chat-markdown.md#headings) says that
agent messages and the file preview read headings with the same rules, the
heading rules of CommonMark. It also gives the rules that only the chat
has. These parts read and draw the headings of the chat and the file
preview:

- `src/markdown/headings.ts` holds the heading levels and the rules for
  hash headings and underline headings. `atxHeading` reads a line of one
  to six hashes, without its closing hashes. `setextLevel` reads an
  underline of `=` or `-`. Both views read headings with it, and it
  imports no React.
- `textBlocks` checks for a hash heading after a code fence and before a
  list or a table, as the file preview does. A heading line ends the
  paragraph above it, and the line under it starts a new block. A heading
  with no text, such as `## ` while the agent writes, is a `heading` block
  with empty text.
- `Paragraph`, in `components/agent-paragraph.ts`, holds the lines of the
  open paragraph. The chat shows a quote, a rule, and indented code as
  text, so one paragraph can hold them. CommonMark reads none of them as
  the text of a paragraph. So an underline turns only the text after the
  last of them into a heading, and the lines before that text stay a
  paragraph. A quote line also takes the lines after it, as lazy lines of
  the quote. A lazy line of a list item is never an underline.
- An underline counts only when a line break follows it. `parseLines`
  gets `ends`, which says whether the last of its lines ends the text. So
  an underline on the last line of a list item counts when a line break
  follows the item.
- `AgentText` draws a heading as `h1` to `h6`, at its level, with its text
  through `AnswerText`. A heading with no text draws nothing, so a screen
  reader meets no empty heading.
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
  list item. `src/files/markdown/MarkdownView.module.css` sets it for the
  file preview. `components/chat.module.css` sets it for a heading of a
  message line after a code block, and for a heading in a list item under
  an open line.

## Table parts

[Chat tables](../../docs/protocol/chat-tables.md#tables-and-the-file-preview)
says that agent messages and the file preview share their table rules.
These parts read and draw the tables of the chat, the file preview, and the
mockups:

- `src/markdown/table-rows.ts` reads table text. `tableStarts` finds a
  header row with its separator row. `readTableRow` reads the cells of a
  row, with escaped pipes and the optional outer pipes.
  `readTableSeparator` reads the alignment of each column. `CellAlign` and
  `TableCells` are the shared types.
- Each caller of these readers ends the table body. It also handles short
  rows and the cells past the width of the header. The file preview fills
  short rows with empty cells, as
  [the Markdown preview](../files/markdown-preview.md#safety-limits) says.
  The chat, in `readTable` of `components/agent-text.ts`, keeps only the
  cells of each row, up to the width of the header, and adds no empty
  cells.
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
