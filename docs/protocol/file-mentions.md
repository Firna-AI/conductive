# File mentions

This doc holds the requirements and the decisions in force for the list
of `@` in the composer of a workspace chat, the chips of the files and
folders that it puts into a message, the mentions and the sent chips of
attached files, the file chips in the answers of the agents, and the
removal of each chip of the composer. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/file-mentions`, at `app/file-mentions/answers`, at
`app/attachments/sent`, and in the flows `user-flows/mention-a-file` and
`user-flows/open-a-file-from-an-answer`. An answer chip decision number
names a decision of the change that added file chips to answers.

## The list

- The composer of a workspace chat offers a list of the files and the
  folders of the workspace (decision 214). The composers of New workspace
  have no list. Reason: a new workspace has no file tree before its first
  start.
- `@` opens the list at the start of the text, or after a space or a line
  break. The text from `@` to the caret is the query.
- A space, Esc, or a move of the caret out of the query closes the list.
- The list opens above the message box, as wide as the box.
- Each row shows the icon of its entry, the name, and the folder that
  holds it, in a muted colour. A row shows labels only, as
  [Labels of paths](tokens-and-secrets.md#secrets-that-users-enter) says.
- The rows come from the file tree that the workspace keeps, which All
  files shows. It holds the tracked files, the untracked files that Git
  does not ignore, every file of the
  [context folder](repository-folders.md#the-context-folder), and their
  folders, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
- Reason: the list works while the cloud computer sleeps, and it needs no
  new route. A live search on the cloud computer with ignored files, and a
  list of ignored files beside the tree, were rejected (decision 214).
- An entry whose label hides a secret value does not show. Reason: the
  message would hold its real path.
- An entry whose path holds a double quote or a line break does not show.
  Reason: no mention can hold such a path.
- A query matches without regard to case. Names that start with the query
  come first, then names that hold it, then paths that hold it. In each
  group, folders come before files, each in the order of their names.
- Without a query, folders come first, then files, each in the order of
  their names. Reason: the list of Conductor works this way, and the user
  asked for a list like it.
- The list shows at most 100 rows. A longer query narrows it.
- The first row starts highlighted. The up and down arrows move the
  highlight. Enter or Tab picks the highlighted row, and a press picks a
  row.
- While the list is open, Enter picks a row and never sends.
- One line takes the place of the rows in these cases:
  - "Loading files…" while the tree loads
  - "The list of all files is unavailable" when the workspace has no tree,
    as All files says
  - "Nothing matches “<query>”" when no entry matches
- When the workspace marks its saved tree as unavailable, the list still
  shows the entries of that tree.

## Chips of files and folders

- A pick replaces `@` and the query with a chip of the entry, and a space
  follows the chip (decision 213).
- A chip shows the icon and the name of its entry, as All files draws
  them, at the size of a workspace chip. Its title is the label of the
  whole path. A screen reader hears "File" or "Folder" before the name.
- A chip in the message field is one unit of the text, as a workspace chip
  is. Backspace and Delete remove it whole, and the arrow keys step over
  it.
- A press on the name of a file chip opens the file, as a press on the file
  in All files does. This holds in the message field and in a sent
  message (decision 213).
- A press on a folder chip shows All files with the folder open. Reason: a
  folder has no page of its own.
- An archived workspace has no file lists, so its messages show each
  mention of a file or a folder of the workspace as text. The chip of an
  attached file still shows, as
  [Chips of attached files](#chips-of-attached-files) says.
- A sent message shows a chip for each mention that names an entry of the
  tree, and for each mention of one of its attached files. Every other
  mention stays text. A mention in inline code or in a code block stays
  code. Inline code in a message of a member stays code.
- The answers of the agents show file chips too, as
  [Files in answers](#files-in-answers) says.
- A copy of a chip gives its mention. A paste of a mention gives a chip
  when the mention names an entry of the tree.
- A draft keeps the mention of each chip. When a draft comes back, its
  mentions show as chips again.

## The text of a mention

- A mention is `@` and the path of the entry inside the repository, such
  as `@src/app.ts` (decision 216). The path of a folder ends with `/`.
- A path with a space goes in double quotes, such as
  `@"docs/My notes.md"`.
- The mention of an attached file is `@` and the copy path of the file,
  such as `@.context/attachments/<digest>/a.png` (decision 262 D).
  [The send](message-attachments.md#the-send) states where the composer
  writes it.
- A mention starts at the start of the text, or after a space or a line
  break.
- A mention of a file can end with a line target, such as
  `@src/app.ts:42`, as [Line targets](#line-targets) says.
- When a mention names no entry, and its last character is `.`, `,`, `;`,
  `:`, `!`, `?`, or `)`, the chat drops that one character and reads the
  mention again. The character then shows as text after the chip. Reason:
  agents end sentences right after a mention, as in "See @src/app.ts."
- Where `**` marks bold, as in an answer, a mention ends before the next
  `**`. So bold around a mention stays bold.
- The draft, the sent message, and the text that the agent gets hold the
  same mention of a file or a folder. For an attached file, Send writes
  the mention at the place of its chip, because the path comes only with
  the reply of its upload. The agent gets the text of the message
  unchanged.
- Reason: both agents start in the repository folder, and their
  instructions name it, so the path is exact. The stored text, the titles,
  and the copies stay short.
- An absolute path from the browser was rejected, because the stored text,
  the session titles, and the copies grow long. An absolute path from the
  Worker or the runner was rejected, because the agent then reads other
  text than the stored message (decision 216).

## Chips of attached files

- [The chip in the field](message-attachments.md#the-chip-in-the-field)
  states the chip of an attached file in the message field. This section
  states its chip in a sent message.
- A mention in a sent message whose path is the copy path of one of its
  files shows as the chip of that file (decision 262 D). The chip shows the
  icon of the kind of the file, its name, and its size.
- The chip shows in each chat, also in an archived workspace, because it
  comes from the message itself.
- A press on the chip opens the file tab of the copy, as a press on a file
  chip opens its file (decision 264 B). The press can resume a stopped
  cloud computer, as the open of each file does.
- All files lists the copy, as it lists every file of the
  [context folder](repository-folders.md#the-context-folder).
- Reason: the member sees the file again in the file tab, as each other
  file of the workspace. A chip that opens nothing was rejected, because
  the member then cannot see the file after Send. A read of the file from
  the storage of the app was not chosen, because it needs a new read route
  with its own access checks.
- The chip opens nothing while its message has not gone out to the agent,
  such as while it waits for the cloud computer, or after the copy of its
  files failed. Reason: the copy comes with the turn, and a message goes
  out only after its copy.
- The chip also opens nothing in a chat without the files of its
  workspace, such as in an archived workspace.
- When the cloud computer does not hold the copy, such as after an agent
  deleted it, the file tab shows "This file moved or was deleted", as for
  each other file.
- A copy of the chip gives its mention, as for a file chip.

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
  opens each file from the answer. Paths in plain text and in Markdown
  links were rejected, because plain words can become chips by mistake.
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

### Line targets

- A path can end with a line target (answer chip decision 2). The chat
  reads these forms: `:N`, `:N-M`, `:N:C`, `#LN`, `#LN-LM`, and `#LNCC`. A
  column `C` does not count.
- A line target counts in a mention of a file and in the path of inline
  code. A range whose end comes before its start is not a line target.
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

## Remove a chip of the composer

- Each chip of the composer shows its icon in a cell at its start
  (decision 215). This holds for each chip of the message field: a file
  chip, a workspace chip, and the chip of an attached file.
- While a pointer is over the cell, a × takes the place of the icon. A
  press on the × removes the chip. The removal is one step of undo.
- A keyboard removes a chip with Backspace or Delete, so the cell takes no
  keyboard focus.
- Where no pointer hovers, such as on a phone, each chip keeps its icon and
  shows a × at its end at all times (decision 217). There a tap on the
  icon does not remove the chip. An attached file keeps its × button of
  touch size.
- Reason: one tap removes a chip, and the icon stays, also the live state
  mark of a workspace chip. A × in place of every icon, two taps, and a
  sheet on a long press were rejected (decision 217).
- A chip in a sent message has no ×.
