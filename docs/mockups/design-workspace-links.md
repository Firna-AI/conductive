# The design of workspace numbers

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
number of each workspace and its copy button.
[Workspace and file chips](design-chat.md#workspace-and-file-chips) gives
the chips of workspace links and of files, and the list of `@`.

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
