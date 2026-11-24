# Workspace, session, file, and skill chips

This page belongs to [the chat](design-chat.md), a page of
[the design](design.md), which gives the style, the layouts, the design
tokens, and the shared parts. This page gives the workspace, session,
file, and skill chips in a line of text, and their removal in a message
box. It also gives the code block of an answer, the list of `@`, and the
list of `/`. [Links in text](design-links.md) gives the other links of
the chat.

- `WorkspaceChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws a link to a workspace of the org as a chip in a line of text: a
  small rounded pill with the list
  mark of the workspace, `WorkspaceMark`, its label in a muted colour, and
  its current name. `WorkspaceName`, which [the marks](design-marks.md)
  give, draws the name. The name of a workspace with unread output takes the
  strong weight of 600, as in the list, in place of the chip's 500. Its
  height is the height of the line less 2 px, so a line with a chip keeps
  its height. A chip is never wider than its line or than 22 times the
  size of its font, and a long name is cut short. The app uses
  `WorkspaceChip` too.
  - `MessageText` shows the chips in sent messages, and `AnswerText` in
    answers, as links to the screens of the workspaces. In an answer, a
    chip inside bold text is bold too. A Markdown link to a workspace
    shows as the chip alone. A link in code is no chip. A link
    to another org, or to a workspace that the list does not hold, is a
    link, as [Links in text](design-links.md) says.
  - The chat finds each workspace in the list of the org, with the
    archived ones, the removed ones, and the states of the list, through
    `ChatWorkspaces`. A phone finds the same workspaces with no list on
    the screen. An archived workspace keeps its chip, with the archived
    mark. A removed workspace, whose 14 days ended, keeps that chip too,
    and a press on it opens its read-only chat, from decision 519 B, as
    `user-flows/open-a-removed-workspace` shows.
  - A pasted link becomes a chip in the message box at once: in the chat,
    and in New workspace as a page or a dialog. `MessageField` gives each
    box its field. A draft with a workspace link or a file mention shows
    in `ChipTextField`: plain text with each chip as one unit, with the
    sizes and the line limits of the plain text field. The draft keeps the
    plain link.
  - `InlineChip.module.css` beside `WorkspaceChip` holds the pill of every
    chip in a line of text, so a workspace chip and a file chip have the
    same size.
  - In a message box each chip starts with the cell of its icon, from
    `ChipIconCell` in `ChipRemove.tsx`. While a pointer is over the cell, a
    × takes the place of the icon, and a press removes the chip. Where no
    pointer hovers, as on a phone, the icon stays, and `ChipEndRemove`
    puts a × at the end of the chip. Attached files are chips of the text
    too, so they follow the same rule.
  - The bubble of a sent message is never wider than its column, and in a
    message box the box around a chip is never wider than the chip. So a
    chip with a long name is cut short in place, with no gap after it, and
    it never pushes a bubble past the edge of the chat.
- `SessionChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws a link to a session as a chip of the same size: the list mark,
  `WorkspaceMark`, and the label of the workspace
  of the session, the icon of a session tab, and the title of the session,
  or Untitled. The icon tells it from a workspace chip, whose name takes
  the same place. Its title is the whole title of the session, and screen
  readers hear "Session" before it. The app uses `SessionChip` too.
  It renders through `WorkspaceChip`, which draws the title with
  `WorkspaceName`, as it draws the name of a workspace. So both chip forms
  share the mark, state words, removal cells, and bold unread title.
  - `MessageText` and `AnswerText` show a session chip for a link to the
    address of a session that the chat read. `ChatWorkspaces` gives each linked
    workspace the sessions that the chat read when it loaded, open and
    closed. A link to any other session shows the chip of its workspace.
    `LinkText` in `src/components/chat/` shows one link in the same way,
    such as the session in the line of a stop from a session.
  - A press on a session chip shows the session. A press on the chip of a
    closed session opens the page of its workspace, so no tab reopens for
    the other members. In a message box a session chip works as a
    workspace chip does.
- `FileChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws a file or a folder of the workspace as a chip of the same size:
  the icon that All files gives it, and its name. Its title is the whole
  path. `EntryIcon` in
  [`src/ui/components/files/`](../../src/ui/components/files/) gives the
  icon to All files, the chips, and the list. It is the one icon map of
  the mockups and the app: a folder, a
  Markdown file, a code file, or another file. A file is code when the
  code view of the app gives it syntax colours, as `fileKind` in
  `src/files/code/file-kind.ts` of the app says, so one list of languages
  sets both. The user chose this on 10 November 2026. A sent message shows
  each file chip as a link to the tab of the
  file. The app uses `FileChip` too.
  - An answer shows a file chip for each `@` mention of an entry of the
    tree, and for each inline code whose whole text is the path of an
    entry, from answer chip decisions 1 and 2 of 13 November 2026. The
    path can be relative, or absolute under the repository folder.
    `answerParts` of the app reads the path and its line target, over the
    tree and the repository folder that `chatReading.ts` in
    `src/components/chat/` gives.
    A code block, a path in another repository, and code of one word
    without a `/` or a `.` stay code. A chip from code inside bold text is
    bold too, as code inside bold text is.
  - A line target, such as `:19-22`, adds `:19-22` to the name and to the
    title of the chip. A press opens the file tab at the lines, which
    `CodeView` in `src/components/files/` marks with the soft amber fill
    and scrolls so that the first line sits in the middle of the view.
  - `MentionChip` in `src/components/chat/` draws the chip of a `FilePart`
    of the app, with its line target and the page that a press opens.
- `CodeBlock` in `src/components/chat/` draws a code block of an answer
  with the look of a code block of a Markdown file. On a phone a Copy code
  button shows in its top corner. With a mouse the button shows only while
  the pointer is on the block, so a desktop view draws none.
- `FileMentionList` in `src/components/chat/` draws the list of `@` above
  the message box: the icon, the name, and the folder of each entry that
  matches the query, with the first row highlighted. One line takes the
  place of the rows while the tree loads, when no tree is available, and
  when nothing matches. When the tree of a large branch leaves out entries,
  the line of no match also says that some files are not listed, and asks
  the member to type the path or to ask the agent, as
  `app/file-mentions/list/limited` shows. `fileMentions.ts` beside it
  orders the rows.
  `answerParts`, `chatParts`, and `mentionParts` of the app read the
  mentions of a text, with the tree that `chatReading.ts` gives.
- `SkillChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws a skill of the agent as a chip of the same size: the skill icon,
  `SkillIcon`, and the name of the
  skill. The icon is `SquareSlash` of the Lucide set, a `/` in a square,
  because `/` opens the list of skills. Its title is the description of
  the skill, and screen readers hear "Skill" before the name. In a message
  box it has the cell of its icon and the × of `ChipRemove.tsx`, as a file
  chip does, and its `onOpen` makes the name a button that opens the skill
  tab, as the name of a file chip opens its file. A view cannot hover, so
  its `namePointer` draws the pointer over the name, which is then
  underlined. A sent message shows it without a ×, and a press opens the
  skill tab, from skill tab decision 1 B. The app uses `SkillChip` too.
- `ChipPointer.module.css` in `src/components/chat/` draws a sent chip that
  opens a page under the pointer, with the fill of a hover, as a view
  cannot hover. Its rule repeats a hover rule of the shared chips.
- `SkillMentionList` in `src/components/chat/` draws the list of `/` above
  the message box, in the place of the list of `@`. It renders through
  `MentionList`: each row gives the name and a `description`, which shows
  muted after the name and is cut with an ellipsis, and `label` names the
  listbox "Skills". One line takes the place of the rows before the first
  skills report, when the runner sent no report, and, for `/` alone, when
  the repository has no skills. When no skill matches the query, the list
  closes. [`skillCopy.ts`](../../src/ui/components/chat/skillCopy.ts) holds
  the words of these lines, and `skillMentions.ts` orders the rows.
  `chatParts` and `skillTextAt` of the app read the skills of a text, with
  the skill list that `chatReading.ts` gives.
