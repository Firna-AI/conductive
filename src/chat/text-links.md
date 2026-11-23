# Text links

This guide belongs to [Agent text](agent-text.md). It gives the rules of
the code that reads and draws the links of chat text: web links, the
workspace chips of sent messages and answers, and the file chips of
answers. Its linked guide [Pictures in answers](answer-pictures.md) gives
the pictures of answers. [Chat links](../../docs/protocol/chat-links.md),
[Workspace links](../../docs/protocol/workspace-links.md), and
[File mentions](../../docs/protocol/file-mentions-answers.md) state the
requirements.

Two readers share the parts below. `answerParts` in
`markdown/answer-parts.ts` reads the inline tree of each block of an agent
message, as [the chat adapter](agent-text.md#the-chat-adapter) gives it.
`chatParts` in `links/chat-parts.ts` reads the text of a sent message,
which shows its Markdown as typed.

## Web addresses

- `src/markdown/web-links.ts` reads web addresses for chat text, the
  message field, and the mockups. It imports no React or app module.
  `bareAddressAt` reads a bare address without trailing punctuation or
  marks. A `)` or a `]` at its end stays in only when it closes a `(`
  or a `[` inside the address. `webAddressParts` splits plain text into
  addresses and text, with an optional Markdown label.
- A bare address starts with `http://` or `https://` in any case, such as
  `HTTPS://` or `Http://`. RFC 3986 makes a scheme case-insensitive.
  `webAddressStartAt` holds this rule. It tests only the position that it
  gets. It gives the index after `://`, or null when no scheme starts
  there. It reads at most eight characters, so a reader that tries each
  position stays linear.
- `bareAddressAt`, `webAddressParts`, the tokenizer of
  `links/chat-tokens.ts`, `textParts` in `markdown/answer-text.ts`, and
  the `bare_address` rule of `src/markdown/parser.ts` find each start with
  `webAddressStartAt`. Inline code reads its one address through
  `bareAddressAt`. Keep one start test, so that no reader drifts from the
  others.
- `webLink` checks an address and gives its kind: an app page, a local
  server with its port, or another web page. The caller supplies the app
  origin and a page check built on `parseRoute`. `appAddress` joins the
  raw path segments with one slash, then adds the query and hash.
- A bare address shows as the text has it, also in its case, as
  [Bare addresses and Markdown links](../../docs/protocol/chat-links.md#bare-addresses-and-markdown-links)
  says. `bareAddressAt` gives the address as typed, and its link shows
  that text. Its `WebLink` holds the form of the URL parser, with the
  scheme and the host in lowercase. The link leads where that form says,
  and its title shows that form. In a sent message, the source of a
  Markdown address keeps its case in the same way.
- `labelHidesAddress` tests a Markdown label as it shows. A label that
  then shows nothing, holds `://`, or starts with `www.` hides where its
  link leads. `answerParts` gives it the text that the label nodes show,
  without the marks of code, bold, emphasis, and strikethrough.
- The parser reads the address of each link of an agent message. It
  writes the address in punycode and percent-encoding. Where an answer
  shows an address as words, it shows the readable form from
  `normalizeLinkText` of the parser.
- `answerParts` reads each bare address in the text nodes of the tree with
  `bareAddressAt`. Before marks pair, the parser keeps each bare address as
  plain text, with the existing trailing-mark boundaries.
- The `bare_address` rule of the parser keeps bare addresses only in the
  read that makes the tokens. Keep it so. `markdown-it` also calls each
  inline rule with `silent`, to find the `]` that ends a label. Those
  calls add no text to `state.pending`, which still holds the text
  before the link. An address that the rule read in the label could take
  in its `]`, and the parser would then read no link.
- `src/markdown/markdown-destination.ts` holds `readInlineTarget`. It
  reads the target of an inline link after its `(`: the spaces and line
  breaks around the address, the address, an optional link title, and the
  `)`. Sent messages and the message field share it through
  `lineTargets`, also in the mockups, with its address boundaries, its
  escape decoding, and its length limits.
- One scan reads an address in angle brackets. As in CommonMark, it ends
  at the first `>` that no backslash escapes. It refuses an address with
  a `<` that no backslash escapes, or with an LF. A backslash does not
  escape an LF. An escaped `<` or `>` stays in the address. Keep these
  rules in this one scan, so that no second test reads the escapes in
  another way.
- Each target gives its address in two forms. `destination` is the
  decoded address: each backslash escape, such as `\(`, becomes the
  character after the backslash. `start` and `end` mark the source of the
  address, as typed, inside any angle brackets. A link or a chip leads to
  the decoded address. Where the Markdown shows as typed, the address
  shows its source.
- Sent messages and the message field read each target through
  `lineTargets` of the same module, also in the mockups. It keeps each
  Markdown link on one line, as its label is. A line break inside its
  parentheses makes it no Markdown link, so no chip of a sent message or
  of the field takes in a line break.
- `lineTargets` reads each target of a text once. Keep it so. The readers
  try a link at each `[`, and many `[` can reach the same `(`. One read
  for each `[` would take seconds for a crafted message.
- `lineLabelEnds` of `src/markdown/markdown-labels.ts` finds where the
  label of each `[` ends, in one pass over the text. Keep it so. One scan
  for each `[` would take seconds for a long line of `[`.
- A label ends at the first `]` after its `[`, on the same line. Labels
  do not nest, so a `[` in a label does not move its end. When no `(`
  comes directly after that `]`, the `[` starts no link. `chatParts`
  reads labels in the `code` mode, where each backtick after the `[`
  starts or ends code. A `]` in code ends no label. `webAddressParts`
  reads labels in the `plain` mode, where a backtick is text.
- `chatParts` uses `bareAddressAt`, `lineTargets`, and `lineLabelEnds`,
  through the tokenizer of `links/chat-tokens.ts`. The message field uses
  `webAddressParts` and reads no code, so its addresses stay text.

## Web links

[Chat links](../../docs/protocol/chat-links.md) states the links of chat
text. These parts read and draw them:

- In an answer, `answerParts` gives a `link` part for each link token of
  the parser that is no file and no chip, when the `web` reader accepts
  its address. The part holds the `WebLink` and its words: the label, with
  its code, its marks, and its line breaks, or the readable address when
  the label hides it. Its link title does not show. An address in angle
  brackets shows its address.
- A link whose address the `web` reader refuses shows as typed: the text
  that the agent wrote before the label, the label with its formatting,
  and the rest of the link, from `linkTail` of the parser. An address in
  angle brackets shows its brackets.
- No picture at a web address loads. An image of a file of the tree is a
  link to the file, or its picture, as
  [Pictures in answers](answer-pictures.md) says. An image whose address
  the `web` reader accepts shows its alt text as a link, by the rules of a
  label. Another image shows its alt text only. An
  image in a label shows its alt text as words of the label.
- In a sent message, `chatParts` gives a `LinkPart` of `links/link-parts.ts`
  for each address that is no chip and that its `web` reader accepts. The
  part holds the `WebLink` and the address as the text has it. A Markdown
  link shows as typed. Its brackets, its label, and its link title read
  again as text and code, with no link. Its address is a chip, a link, or
  text, as a bare address is. The Markdown of an image, `![alt](address)`,
  shows as typed in the same way.
- The token of a Markdown link in `links/chat-tokens.ts` keeps both forms
  of its address: the decoded `href`, and the source in
  `MarkdownLink.address`. `href` decides whether the address is a chip, a
  link, or text. It also gives the title of a link and the page that a
  chip or a link opens. The address shows its source, exactly as typed,
  as the words of its link or as text.
- Inline code whose text, without the spaces at its ends, is one address
  that the reader accepts holds that link, as `CodePart.link`. A
  workspace link alone in code is such a link, not a chip. Code in a label
  holds no link.
- `AnswerText` and `useChatParts` take the `linkOf` of `useTextLinks`, from
  `src/shell/ui/text-links.tsx`, as the `web` reader. The workspace screen
  gives that module the app origin, the page check, and the port previews
  of the workspace, as
  [The chat of the workspace](../shell/workspace/screen-parts.md#the-chat-of-the-workspace)
  says. Without them, as on the development page, each link opens a new
  tab. Where no server runs, such as in a read-only workspace, a local
  address stays text, so a Markdown link to it shows as typed.
- `ChatWebLink`, `WebLinkText`, and `CodeText` in `links/WebLinkText.tsx`
  draw the links with the shared `TextLink` and the `opener` of
  `useTextLinks`. A link of the app is an `AppLink` of
  `src/shell/ui/AppLink.tsx`: a plain click opens its page in the same
  window, and replaces the address when that page already shows. A local
  address is an anchor of the app: a plain click opens the port preview in
  the same window. A click with a modifier key on either stays with the
  browser. Every other link opens a new tab with `noopener noreferrer`. In
  the plain mode of `PlainLinks`, a link draws its words alone.
- A copy of chat text gives the words of each link, as the browser copies
  a link. `mention-copy.ts` keeps the browser's own copy while each chip
  shows its copy text.

## Workspace chips

- Sent messages and agent answers show each workspace link as a chip, as
  [Workspace links](../../docs/protocol/workspace-links.md) says.
  `linkTarget` in `links/workspace-links.ts` reads each link with the URL
  parser and `parseRoute`. It builds the chip address with `appAddress` of
  `src/markdown/web-links.ts`. A link is a chip only when it has the
  origin of the links of the list, and the router reads a page of a
  workspace of the org in that list.
- In an answer, `answerParts` sends each link token and each bare address
  through `linkTarget`, so a Markdown link to a workspace shows as its
  chip alone, also inside bold text or with a bold or code label. A link
  in code is no chip, because the parser reads code first.
- In a sent message, one tokenizer, `tokens` in `links/chat-tokens.ts`,
  reads the text in one pass from left to right, and `chatParts` turns its
  tokens into parts. A backtick starts code first, so a link in code is no
  chip. A Markdown link whose brackets stand outside code is one unit,
  also when its label holds code, so it shows as its chip alone. Then bare
  links count.
- The chip shows the current name, in bold while the workspace has unread
  output, as the list does. Its list mark shows the state and the GitHub
  state, from `chipOf` in `links/LinksContext.tsx`, as
  [The list mark](../../docs/protocol/workspace-life.md#the-list-mark)
  says. The chip opens the page that the router read, with its tab path,
  query, and hash. `LinkChip` in `links/LinkedText.tsx` draws it.
- A link whose path names a session that the reader knows shows as the
  shared session chip instead: `useLinkedSession` in
  `links/session-links.ts` finds a live session of the chat's workspace,
  or a session from the one read of another workspace for the load of the
  chat. Its mark follows the workspace list, as a workspace chip does.
  While that read runs, after it fails, and for a session that the
  workspace does not hold, the link keeps the chip of its workspace.
- Every other address is a link or text, as [Web links](#web-links) says.
  The message field reads its text with `webAddressParts`, which reads no
  code.

## File chips in answers

- `AnswerText` in `markdown/AnswerText.tsx` reads and draws the text of
  each block of an answer with `answerParts`. A message of a member reads
  its parts with `useChatParts` and draws them with `ChatText`, in
  `UserBubble` of `components/TranscriptItem.tsx`. It reads mentions but
  keeps its code.
- `answerParts` gives a `file` part for a mention or inline code that
  names an entry of the tree. `links/file-targets.ts` reads both:
  `mentionTarget` finds the entry of a mention, with a line target and an
  end mark of a sentence after it. `codeTarget` finds the entry of inline
  code, inside the repository or under its folder. The line targets come
  from `splitLineTarget` in `src/shared/line-target.ts`. `FileLink` in
  `links/FileChips.tsx` draws the chip.
- A link or an image of an answer whose target is an entry of the tree
  gives a `file-link` part: `fileLinkTarget` reads the target, and
  `FileTextLink` in `markdown/FileTextLink.tsx` draws a normal link with
  the label, which opens the file. A label that shows nothing shows the
  name of the entry. An image of a picture file can show as its picture
  instead, as [Pictures in answers](answer-pictures.md) says.
- `textParts` in `markdown/answer-text.ts` reads the mentions of a text
  node. A mention starts at the start of the block, after a space or a
  line break, right after a mark, or right after a `*`, `_`, or `~~` that
  the text keeps as typed. It ends before the next `*` or `~~` of the
  text, and a mark that closes ends its text node, as
  [The text of a mention](../../docs/protocol/file-mentions.md#the-text-of-a-mention)
  says.
- Code in a label stays code, and a label holds no chip.
- A block follows the tree only when its text holds `@`, inline code, a
  link, or an image, as `namesFiles` says. So a change of the tree draws
  only the blocks that can change.
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

[Pictures in answers](answer-pictures.md) gives the rules of the code that
reads and draws the pictures of answers.
