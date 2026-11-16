# File mentions

This doc holds the requirements and the decisions in force for the list
of `@` in the composer of a workspace chat, the chips of the files and
folders that it puts into a message, Add to chat, the mentions and the
sent chips of attached files, and the removal of each chip of the
composer. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A file row menu decision number names a decision of the change that
adds the menu of the rows of All files and Changes, as
[File row menu](file-row-menu.md) says. The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/file-mentions`, at `app/attachments/sent`, at `app/files/menu/added`,
and in the flow `user-flows/mention-a-file`.

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
  code.
- The answers of the agents keep their text. Reason: only the composer
  writes mentions.
- A copy of a chip gives its mention. A paste of a mention gives a chip
  when the mention names an entry of the tree.
- A draft keeps the mention of each chip. When a draft comes back, its
  mentions show as chips again.

## Add to chat

- Add to chat in the [row menu](file-row-menu.md) of a row of All files or
  Changes puts the chip of the file or the folder of that row into a
  message field. [Add to chat](file-row-menu.md#add-to-chat) of the row
  menu states which rows offer it.
- The chip goes into the message field of the session that the member saw
  last (file row menu decision 4 A). The app first shows the tab of that
  session. On a phone, it switches to the chat of that session.
- When the workspace has no open session tab, Add to chat starts a new
  session, as + does. The chip then goes into the message field of that
  session.
- The chip is the same as after a pick of its entry from the list. It goes
  to the caret of the field, with a space after it. When the field has no
  caret, such as when its session did not show, the chip goes to the end
  of the text.
- On desktop, the field then takes the focus, and the caret stands after
  the chip. On a phone, the field does not take the focus, so no keyboard
  opens by itself.
- When the field shows only later, such as after a new session starts, it
  takes the focus unless the focus moved to another element before then.
  Reason: the message box never takes the focus from a later choice of the
  member, as [Sections](orgs-and-members.md#sections) says for a press on
  a workspace row.
- Reason: one press puts the chip where the member writes next, and the
  member sees it at once. The agent actions of the pull request bar send
  to the same session, as
  [Messages from the bar](messages-and-attachments.md#messages-from-the-bar)
  says.
- A new session for each Add to chat, a submenu of the open sessions, and
  an item only while a session tab shows were not chosen. A message field
  that stays below each file tab, and a drag of a row onto the field, were
  not chosen either.
- A mention at the end of the draft, with a toast and no change of the
  view, was not chosen, because the member would not see the chip at once.
  A write into the draft while its field does not show was not chosen
  either. So no row offers Add to chat while a bar of the cloud computer
  takes the place of the message field, as
  [Add to chat](file-row-menu.md#add-to-chat) says.
- A chip in each open message field was rejected, because a member writes
  one message at a time.

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
- All files does not list the copy. So the tab shows "File" until the read
  of the copy gives its safe name, as for each path that All files does not
  list.
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
