# File mentions

This doc holds the requirements and the decisions in force for the list
of `@` in the composer of a workspace chat, the chips of the files and
folders that it puts into a message, and the removal of each chip of the
composer. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws these screens
at `app/file-mentions` and in the flow `user-flows/mention-a-file`.

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
  mention as text.
- A sent message shows a chip for each mention that names an entry of the
  tree. Every other mention stays text. A mention in inline code or in a
  code block stays code.
- The answers of the agents keep their text. Reason: only the composer
  writes mentions.
- A copy of a chip gives its mention. A paste of a mention gives a chip
  when the mention names an entry of the tree.
- A draft keeps the mention of each chip. When a draft comes back, its
  mentions show as chips again.

## The text of a mention

- A mention is `@` and the path of the entry inside the repository, such
  as `@src/app.ts` (decision 216). The path of a folder ends with `/`.
- A path with a space goes in double quotes, such as
  `@"docs/My notes.md"`.
- A mention starts at the start of the text, or after a space or a line
  break.
- The draft, the sent message, and the text that the agent gets hold the
  same mention. The agent gets the text of the message unchanged.
- Reason: both agents start in the repository folder, and their
  instructions name it, so the path is exact. The stored text, the titles,
  and the copies stay short.
- An absolute path from the browser was rejected, because the stored text,
  the session titles, and the copies grow long. An absolute path from the
  Worker or the runner was rejected, because the agent then reads other
  text than the stored message (decision 216).

## Remove a chip of the composer

- Each chip of the composer shows its icon in a cell at its start
  (decision 215). This holds for the file chips and the workspace chips in
  the message field, and for the attached files above it.
- While a pointer is over the cell, a × takes the place of the icon. A
  press on the × removes the chip. In the message field, the removal is
  one step of undo.
- An attached file has no other × where a pointer hovers. Its cell takes
  the keyboard focus, and it shows the × while it has the focus. In the
  message field, a keyboard removes a chip with Backspace or Delete, so
  the cell takes no keyboard focus there.
- Where no pointer hovers, such as on a phone, each chip keeps its icon and
  shows a × at its end at all times (decision 217). There a tap on the
  icon does not remove the chip. An attached file keeps its × button of
  touch size.
- Reason: one tap removes a chip, and the icon stays, also the live state
  mark of a workspace chip. A × in place of every icon, two taps, and a
  sheet on a long press were rejected (decision 217).
- A chip in a sent message has no ×.
