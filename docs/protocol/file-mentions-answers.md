# File mentions: files in answers

This page belongs to [File mentions](file-mentions.md), which states the
list of `@`, the chips of files and folders, and the text of a mention.
It states the file chips, the file links, and the pictures in the answers
of the agents, and their line targets. The tree is the file tree of the
workspace, as [The list](file-mentions.md#the-list) says. It holds only
the entries that its report lists. So a path that the report omits names
no entry, and it shows as the rules below give for such a path.
[Chat Markdown](chat-markdown.md) states the other Markdown of agent
messages. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/file-mentions/answers` and its child pages, at
`app/files/code/at-line`, at `app/files/image/from-answer`, and in the
flow `user-flows/open-a-file-from-an-answer`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An answer
chip decision number names a decision of the change that added file chips
to answers. A screenshot decision number names a decision of the change
that shows the screenshots of agents as pictures in their answers.

## Files in answers

- An answer of an agent shows a file chip for each mention that names an
  entry of the tree, as a sent message does (answer chip decision 1). An
  answer has no attached files.
- An answer also shows a file chip for inline code whose whole text is the
  path of an entry of the tree (answer chip decision 1). The path can
  start with `./`. An absolute path counts when it starts with the
  repository folder of the workspace and a `/`.
- A folder can end with `/`. Inline code without a final `/` names a file,
  or a folder when no file has that path.
- Inline code stays code in each of these cases:
  - Its text names no entry, or names a path in another repository or
    outside the repository folder.
  - It is one word with no `/`, no `.`, and no line target. Reason: words
    such as `runner` name ideas as often as folders.
  - It has a space at its start or its end, or a line break.
  - It stands in the label of a Markdown link. Reason: no chip sits in a
    link.
  - It stands in a code block.
- Reason: agents name the files that they write, such as screenshots in
  the context folder, as absolute paths in inline code. A member then
  opens each file from the answer. Paths in plain text were rejected,
  because plain words can become chips by mistake.
- A Markdown link of an answer whose target is the path of an entry of the
  tree shows as a normal link with its label, not as a chip (answer chip
  decision 4). A Markdown image, such as `![Login flow](docs/flow.svg)`,
  shows the same way. An image with no label takes the name of the file
  as its label.
- A Markdown image of a picture file shows as a picture instead, except
  in the cases that [Pictures in answers](#pictures-in-answers) gives.
- A press on such a link opens the file, as a press on its file chip does.
  The target reads as a path of inline code does, with its line target,
  and one word counts too. A `%` escape in the target, such as `%20`, reads
  as its character. A target in angle brackets can hold a space.
- A Markdown link whose target names no entry stays the text that the
  agent wrote. A Markdown image whose target names no entry shows its alt
  text, as [Chat links](chat-links.md#bare-addresses-and-markdown-links)
  says.
- Reason: agents write screenshots as Markdown images, and the label reads
  better as a link than as a chip. The user asked for normal links on
  13 November 2026.
- A copy of such a link gives its label, as for each other link.
- The agent instructions ask agents to name files as mentions, as
  [Agent instructions](agent-instructions.md#what-the-instructions-hold)
  says. Reason: one form is the form that agents use, and the chat reads
  both forms.
- A copy of a chip of an answer gives its text as the answer wrote it: the
  mention, or the text of the code without backticks.
- In a chat without a tree, such as the chat of an archived workspace,
  each path stays code and each mention stays text. A chip shows when the
  tree loads.
- The Worker gives the repository folder with the saved view of the
  workspace. Without a folder, such as before the first start, only paths
  inside the repository give chips.

### Pictures in answers

- A picture file is a PNG, JPEG, GIF, or WebP file. The file tab knows
  such a file by the extension of its name, and shows it as a picture, as
  [Pictures in file tabs](file-pictures.md) says.
- A Markdown image of an answer whose target is a picture file of the tree
  shows as a small picture (screenshot decision 2 B).
- Reason: the agent knows which images show its result, and this is the
  smaller change. The agent instructions ask the agent to show a
  screenshot of its interface work in this way, as
  [Agent instructions](agent-instructions.md#what-the-instructions-hold)
  says.
- Only the image form, such as `![Phone view](.context/after.png)`, shows
  a picture. A Markdown link to a picture file stays a link. Reason: the
  agent asks for a picture with the image form.
- An image of any other file, such as an SVG file, stays a link. Reason:
  the file tab and the answer then share one rule for pictures.
- The picture stands in the line of text at the place of the image. The
  text of the line keeps to the top edge of the picture. An image alone in
  its paragraph stands on a line of its own.
- Reason: the sentence keeps its order and reads on from the line above.
  Two screenshots of a phone can stand side by side.
- The picture keeps its proportions. It is never wider than the answer,
  and never higher than 240 CSS pixels. A smaller picture keeps its own
  size.
- Reason: the answer stays short to read, and a larger copy blurs. The
  file tab shows the full size.
- The alternative text of the picture is its label. Its title is the
  path, as for the link. The
  [mockups](../mockups/design-links.md#files-in-answers) give the look.
- A press on the picture opens the file tab, as a press on the link does.
  A click with a modifier key keeps the action of the browser.
- The chat reads a picture with the file read of the file tab, with the
  same access checks and read limit. Pictures add no route, no event
  field, and no storage.
- The chat reads a picture only while the cloud computer runs. It never
  starts or resumes the cloud computer for a picture.
- Reason: a resume that the member did not ask for costs money.
  [The resume](stop-and-resume.md#the-resume) also avoids a start that the
  member did not ask for.
- A read starts only when the picture comes near the view. At most two
  reads run at one time. One open chat reads each path once for each
  agent message. So a newer answer reads a reused name again.
- Reason: one read can carry up to 5 MiB, and a long chat can hold many
  pictures.
- While the read runs, a box takes the place of the picture. The box shows
  the icon of a picture and the label. A press on the box opens the file
  tab.
- The box is as wide as the answer and 240 CSS pixels high, because the
  size of the picture is known only after the read.
- Reason: most screenshots fill that height, so the answer moves little
  when the picture comes, and the box never grows.
- The image shows as the link in each of these cases:
  - The cloud computer does not run.
  - The read fails, or the file is larger than the read limit.
  - The browser cannot draw the bytes.
- Reason: the link still opens the file tab, which gives the reason when
  the file does not show.
- A picture shows in the paragraphs and the list items of each agent
  message, also inside a quote. In a heading or a table cell, the image
  shows as the link. Reason: a picture breaks the layout of the heading or
  of the row.
- A closed message line in the work of a turn shows the image as the link.
  An open message line shows the picture. Reason: a closed line stays one
  line, as
  [Chat message lines](chat-message-lines.md#in-the-work-of-a-turn)
  says.
- A copy of chat text with a picture gives the Markdown image as the agent
  wrote it, as a copy of a chip gives its text. A copy of the loading box
  gives the same text, because the box takes the place of the picture. The
  [transcript](session-transcripts.md) of the session keeps the Markdown
  image as text. Reason: a copy gives the text as written.
- Risk: a picture shows its file as the read found it. When an agent saves
  a new picture under an old name, an older answer shows the new picture
  in a chat that opens later. The file tab has the same behaviour.
- Risk: a picture hides no secret value. File content hides no value
  either, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- These ways were rejected (screenshot decision 2):
  - Chips with the names of the images at the end of the turn. They show
    no picture.
  - A picture at the end of the turn for each image file that a read call
    names. It shows images that the member does not need, such as
    attached files and failed attempts. It also needs a mapping of the
    image views of Codex.
  - A small copy of each image that the agent reads, which the runner
    stores in the chat event. It needs a new event field and an image
    library, and the secret filter cannot hide a value in a picture.

### Line targets

- A path can end with a line target (answer chip decision 2). The chat
  reads these forms: `:N`, `:N-M`, `:N:C`, `#LN`, `#LN-LM`, and `#LNCC`. A
  column `C` does not count.
- A line target counts in a mention of a file, in the path of inline
  code, and in the target of a Markdown link or image of an answer. A
  link with a line target opens the file at the lines, as its chip
  does. A range whose end comes before its start is not a line target.
- The chip of a file with a line target adds the line or the range to its
  name, such as `app.ts:42` or `app.ts:42-50`. Its title is the whole
  path with the same target.
- A press on such a chip opens the file tab as text, also for a Markdown
  file, with the lines in view and marked, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
- A folder with a line target names nothing. A picture shows no line
  numbers, so its chip drops the line target.
- Reason: agents give paths with line numbers, and a member then sees the
  line at once. A chip that opens the top of the file was rejected,
  because its label promises a line that the tab does not show.
