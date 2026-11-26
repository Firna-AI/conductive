# Code blocks

This guide belongs to [Agent text](agent-text.md). It gives the rules of
the code that draws the code blocks of agent messages: their colours,
their Copy code button, and their place in a message line.
[Chat code blocks](../../docs/protocol/chat-code-blocks.md) states the
requirements, and the mockups draw them at `app/chat/code-blocks`.
[The chat adapter](agent-text.md#the-chat-adapter) gives the `code` block
with its label.

- In the app, `AgentBlocks` draws each code block through `CodeBlock`, the
  `code` of `answerDrawing`. `CodeBlock` finds the language of the label
  with `languageOfLabel` of `src/files/code/fence-languages.ts`. It colours
  the lines with `highlightLines` of `src/files/code/highlight.ts`, and
  draws them with `CodeText` of `src/files/code/`, so the code has the
  colours of a file tab. A label of no language gives plain lines, as
  [Colours](../../docs/protocol/chat-code-blocks.md#colours) says.
- `CodeText` draws each line as its own memoized part, with a line feed
  between two lines, inside the one `<pre>`. So a live block draws again
  only the lines that change. The text of the `<pre>` stays the code as the
  agent wrote it, which Copy code and Explain read.
- Inside a `CodeCopyProvider`, `CodeBlock` adds a Copy code button beside
  the `<pre>`, so the text of the `<pre>` stays the code alone. `ChatBody`
  in `WorkspaceChat` gives the provider around the chat of the open
  session. Its copy uses the `copy` services of the chat and shows a toast
  with the result. Outside a provider, a code block has no button. The
  size of the button comes from the control sizes, so the block keeps room
  for the 40 px button on a phone.
- In an open message line, `LineBlocks` draws each code block through the
  drawing too, in the colours of an answer, with no button. A closed line
  draws the text of the block with no colours, as
  [Chat message lines](../../docs/protocol/chat-message-lines.md) says.
  [Message lines](message-lines.md) gives the rest of the code of a line.
