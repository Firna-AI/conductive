# Chat code blocks

This doc holds the requirements and the decisions in force for the code
blocks of agent messages in the chat: their colours and their Copy code
button. It belongs to [Chat Markdown](chat-markdown.md), which defines an
agent message and holds the other Markdown of agent messages. Chat
Markdown also says which text is a code block, and how a code block shows
while the agent writes and in the saved history.
[Chat message lines](chat-message-lines.md) says how a code block shows in
the line of a message in the work of a turn. The terms are those of the
[architecture doc](../architecture.md#terms) and the terms below. The
[mockup catalogue](../mockups/catalogue.md) draws code blocks in agent
messages at `app/chat/code-blocks`, and in the Markdown preview of a file
at `app/files/markdown`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A code
colours decision, such as code colours decision 1 A, is a decision of the
change that colours code blocks by their fence labels. Its pull request
keeps the record. A Markdown parser decision, such as Markdown parser
decision 8 D, is a decision of the change that reads Markdown with one
parser, as [Chat Markdown](chat-markdown.md) says.

## Terms

- **Fence:** a line of three or more backticks or tildes that opens or
  closes a code block.
- **Fence label:** the first word after the backticks or the tildes of the
  opening fence, such as `rust` in the fence ```` ```rust ````. White space
  or a comma ends the word. An indented code block has no fence, so it has
  no fence label.

## Colours

- When the fence label of a code block names a language that a file tab
  colours, the block shows the colours of that language. They are the
  colours of a file tab of that language (code colours decision 1 A,
  26 November 2026).
- A fence label names a language by its name, such as `typescript`, or by
  the extension of its files, such as `ts`.
- The app ignores the letter case of a fence label.
- The app does not guess the language of a code block.
- Reason: agents usually label their code, so most code blocks get
  colours. The colours of a file tab make the same code look the same in
  an answer and in a file tab. They add nothing to the download of the
  app. Their work grows in step with the length of the code, also for
  crafted text.
- A guess of the language of a block without a label was rejected, because
  a wrong guess colours logs and command output. A colour library, such as
  Prism or highlight.js, was rejected, because it adds to the download and
  looks different from a file tab.
- A code block without a fence label shows plain text.
- A code block whose fence label names no language that a file tab colours
  shows plain text.
- A fence label that marks the block as text or output shows plain text.
  These labels are `text`, `txt`, `plain`, `plaintext`, `console`,
  `output`, `log`, and `none`.
- Reason: wrong colours are worse than none.
- A code block longer than 200,000 characters shows plain text, also with
  a fence label that names a language (code colours decision 7 B,
  26 November 2026). Reason: a huge or crafted block would give millions
  of coloured parts and stop the chat or the preview for seconds. A
  block of that length as plain text stays one part. Drawing only the
  lines on the screen was rejected for now, because it costs much more.
- A `diff` or `patch` block shows plain text. Reason: the colours of the
  lines of a diff are a new look, which a later proposal can add.
- Inline code shows plain text, because it has no fence label.
- A code block shows no name of its language. Reason: no requirement or
  mockup asks for one.
- The colours keep the text of a code block as the agent wrote it, with
  its tabs and its line breaks. So [Copy code](#copy-code) and
  [Explain](explain.md) read the same text as from a plain code block.
- The file preview colours the code blocks of a Markdown file by the same
  rules. Reason: the chat draws each part of the Markdown as the file
  preview draws it (Markdown parser decision 8 D, 17 November 2026).
- A sent message shows its code with no colours. Reason: a sent message
  shows the text as the member typed it, as
  [Chat links](chat-links.md#links) says.
- The agent instructions ask the agent to label each code block, as
  [What the instructions hold](agent-instructions.md#what-the-instructions-hold)
  says.

## Copy code

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
