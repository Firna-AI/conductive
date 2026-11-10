# The design of workspace links and file mentions

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
number of each workspace and its copy button, the chips of workspace links
and of files, and the list of `@`.

- Each workspace has a number in its org, and `workspaceLabel` in
  `src/components/workspaces/label.ts` shows it as `W-395`. The number
  shows in the header, in chips, and in a row of the command palette
  whose search matches it. The rows of the list keep their layout.
  - `CopyLinkButton` in `src/components/workspace/` is the label in the
    header, after the name. The label shows alone, without an icon, as a
    plain Firna button: a pointer over it shows the hover fill, and the
    keyboard focus shows the focus ring. A press copies the link of the
    workspace, and a note under it says "Link copied" for a moment, over
    the content, so nothing moves. When the copy fails, the note says
    "The link didn't copy. Try again." in the danger colour. The note is
    a status, so screen readers hear it. The name of the button is "Copy
    link to W-395".
  - On desktop, the repository takes only the room that the other parts
    leave. The name is cut short only when the repository has no room left.
  - On a phone the label leads the line under the name, before the
    repository, so the name keeps its room. The button
    keeps the height of that line, and its touch area of 44 px reaches up
    over the name and down to the bottom edge of the header.
- `WorkspaceChip` in `src/components/chat/` draws a link to a workspace of
  the org as a chip in a line of text: a small rounded pill with the
  `StatusGlyph` of the workspace, its label in a muted colour, and its
  current name. Its height is the height of the line less 2 px, so a line
  with a chip keeps its height. A chip is never wider than its line or
  than 22 times the size of its font, and a long name is cut short. It
  takes no fixtures, so the app can use it too.
  - `MessageText` shows the chips in sent messages and in answers, as
    links to the screens of the workspaces. A Markdown link to a
    workspace shows as the chip alone, and a link in code stays code. A
    link to another org, or to a workspace that the list does not hold,
    stays plain text, and a long link breaks to fit the line.
  - The chat finds each workspace in the list of the org, with the
    archived ones and with the states of the list, through
    `ChatWorkspaces`. A phone finds the same workspaces with no list on
    the screen. An archived workspace keeps its chip, with the archived
    mark.
  - A pasted link becomes a chip in the message box at once: in the chat,
    and in New workspace as a page or a dialog. `MessageField` gives each
    box its field. A draft with a workspace link or a file mention shows
    in `ChipTextField`: plain text with each chip as one unit, with the
    sizes and the line limits of the plain text field. The draft keeps the
    plain link.
  - `InlineChip.module.css` beside it holds the pill of every chip in a
    line of text, so a workspace chip and a file chip have the same size.
  - In a message box each chip starts with the cell of its icon, from
    `ChipIconCell` in `ChipRemove.tsx`. While a pointer is over the cell, a
    × takes the place of the icon, and a press removes the chip. Where no
    pointer hovers, as on a phone, the icon stays, and `ChipEndRemove`
    puts a × at the end of the chip. Attached files follow the same rule,
    and on a phone they keep their × button of touch size.
- `FileChip` in `src/components/chat/` draws a file or a folder of the
  workspace as a chip of the same size: the icon that All files gives it,
  and its name. Its title is the whole path. `EntryIcon` in
  `src/components/files/` gives the icon to All files, the chips, and the
  list. It is the one icon map of the mockups and the app: a folder, a
  Markdown file, a code file, or another file. A file is code when the
  code view of the app gives it syntax colours, as `fileKind` in
  `src/files/code/file-kind.ts` of the app says, so one list of languages
  sets both. The user chose this on 10 November 2026. A sent message shows
  each file chip as a link to the tab of the
  file, and an answer shows none. It takes no fixtures, so the app can use
  it too.
- `FileMentionList` in `src/components/chat/` draws the list of `@` above
  the message box: the icon, the name, and the folder of each entry that
  matches the query, with the first row highlighted. One line takes the
  place of the rows while the tree loads, when no tree is available, and
  when nothing matches. `fileMentions.ts` beside it reads the mentions of
  a text and orders the rows.
