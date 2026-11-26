# Message lines

This guide belongs to [Agent text](agent-text.md). It gives the rules of
the code that draws each agent message as a line in an open work fold.
[Chat message lines](../../docs/protocol/chat-message-lines.md) states the
requirements, and the mockups draw them at `app/chat/work`,
`app/chat/headings/work`, `app/chat/formatting/work`, and
`app/chat/lists/tasks-work`.

- `MessageLine` in `components/MessageLine.tsx` reads the text of the
  message with `agentBlocks`, once for each text, as `AgentText` does.
  `LineBlocks` draws its blocks in the line. The app and the mockups share
  `LineBlocks`, in `src/ui/components/chat/LineBlocks.tsx`, with
  the drawing of each view, as [Drawing](agent-text.md#drawing) says.
- A `<summary>` holds only phrasing content and headings, and no
  paragraph, list, quote, rule, or table. So `LineBlocks` draws each block
  as a span, which CSS shows as a block while the line is open. A table
  cannot go into the line, so a closed line shows a table as its cells,
  with a middle dot between two cells.
- `LineBlocks` draws each heading as a span too, although HTML lets a
  summary hold a heading. So the closed line stays one line. The button
  role of a summary also hides a heading from the heading list of a screen
  reader. [Heading parts](agent-text.md#heading-parts) gives the look of
  the span. It also says when a heading draws nothing.
- A quote is a span with the `quote` classes of the shared
  `MessageLine.module.css` and `MarkdownProse.module.css`, around the spans
  of its blocks. A rule is an empty span with their `rule` classes. The
  `<details>` of the line has the `message` class of
  `MessageLine.module.css` and the `prose` class. Closed, that CSS shows a
  quote as its text in the colour of a quote, without its line, and a rule
  as a middle dot. Open, it shows both as blocks.
- `AnswerText` with `line` draws a space before each line break. The CSS
  of the closed line hides each `br`, so the space keeps the words apart.
- `LineBlocks` gets the `LineState` of the line: whether it is open, and
  the drawing of its message. It allows pictures only in a paragraph or a
  list item of an open line. So the closed line shows the image of a
  picture file as its link, and the open line shows its picture, as
  [Pictures in answers](answer-pictures.md) says. A heading
  and a table cell keep the link. The hidden copy of the line gets the
  state of a closed line.
- A task item draws its fixed check box before the words of its first
  paragraph, which stay in the line of the box, as the mockups draw it. The
  item has the `task` class of `MessageLine.module.css`: closed, the box
  stands in the line, and open, it takes the place of the bullet. A
  numbered task item writes no number, as in an answer.
- The line is a button for a screen reader, which reads no check box
  inside it. So each box has the name "done" or "not done", which the name
  of the line holds. The box is disabled, so it never changes. The CSS
  of the `task` class lets a press pass through the box to the line, which
  opens or closes.
- `MessageLine` draws the code blocks of its summary as spans, with no
  button, because a summary is a button. A code block under an open line
  draws through `AgentBlocks`, so it has the button.
- An open line keeps the blocks before the first table in its summary.
  When a list or a quote holds that table, at any depth, the summary keeps
  the blocks before that list or quote. `holdsTable` of the shared
  `LineBlocks.tsx` finds that block, for the app and for the mockups. The
  table or the block that holds it, and the blocks after it, draw under
  the summary through `AgentBlocks`, only while the line is open, so a
  closed line lays out no hidden table. Under the line, a quote and a rule
  are elements, and `MessageLine.module.css` sets their space.
- A line that starts with a table, or with a block that holds one, keeps
  its closed text in a visually hidden span. So the open line keeps a name
  for a screen reader. So does a line whose blocks before the table show
  no readable text, as `blockShowsText` of `markdown/readable-text.ts`
  reads them. An empty heading and an empty fenced code block show no
  text. Readable text before the table, such as the number of a numbered
  list item or the name of a task box, names the open line, which then
  adds no hidden copy.
- `blockShowsText` reads each paragraph and heading with
  `answerShowsWords`, the final check that
  [Heading parts](agent-text.md#heading-parts) gives. `MessageLine` gives
  it the reading of `useAnswerReading` of `markdown/answer-reading.ts`,
  which follows the tree while the line is open with a table. So `![](x)`
  or `## ![](x)` alone before the table adds the hidden copy, while `x`
  names no file of the tree and no web address. When the tree gains a file
  at `x`, the image shows the name of that file. That name names the open
  line, and the hidden copy goes. The blocks need no new parse for such a
  change, because they depend on the text alone.
- A mark without its pair is text, as
  [Formatting](../../docs/protocol/chat-markdown.md#formatting) says. So a
  paragraph of only `**` before the table names the line `**`. A code
  block of `**` names it too.
- That hidden copy shows no chips, and `PlainLinks` of
  `src/shell/ui/text-links.tsx` draws each link in it as its words. A
  `MentionsProvider` without files removes file chips. So the keyboard
  cannot reach a link in it.
- A link in a message line is an anchor, so `useFold` leaves a press on it
  to the link, and the line stays open or closed. A click on a chip there
  stays with the chip, and a click with a modifier key opens a new tab as
  on any link.
