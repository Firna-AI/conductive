# The design of the marks and the labels

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the list
mark, the mark of the header, and the marks of routine runs. It also gives
the mark of an agent, and the label of a workspace number with Copy link.

- `WorkspaceMark` in `src/components/workspaces/` draws the list mark of a
  workspace, which the list, the rows of the command palette, and the
  workspace chips show. It is a 3 × 3 dot-matrix square in one colour for
  the GitHub state of the pull request: rose when checks failed, amber
  while checks run, the success green when checks passed, and the
  `merged` purple after the merge. Without a GitHub state, every cell is
  dim grey. An archived workspace keeps faint grey cells, whatever its
  GitHub state. A light runs around the ring while the agent works, and the
  centre cell stays dim. The whole square pulses while the agent waits for
  the user, such as for the approval of a command. Every other mark is
  still, so only bold text marks unread output. With reduced motion, the
  ring or the middle column stays lit, and the other cells stay dim.
  `listMarkLabel` in `status.ts` beside it gives the words that screen
  readers hear, such as "Checks failed, Working". The mark imports no
  fixture value, so the app uses it too.
- `StatusGlyph` beside it draws the state of the agent and the cloud
  computer, as the header and the operator section show it, on the same
  grid, from `MarkGrid`. Each state has its own shape, and working and
  starting move with CSS. A finished turn is a full bright green square,
  and ready is one bright cell on a faint green grid. A workspace whose
  agent waits for the user shows Needs input: a middle column in the accent
  colour that pulses.
  A routine run takes the mark of the header of its workspace, not the
  list mark. A run without a workspace shows an hourglass while it waits
  for one, and a chevron when a rule skipped it. A failed run shows the
  mark of its failure. It keeps that mark after Try again, because the run
  keeps its failed outcome.
  - A run whose first start failed shows the cross, as its workspace in
    the error state does.
  - A run that a check failed before it had a workspace, and a run whose
    first turn failed, show a slash in rose. After a failed turn, the mark
    of the header shows a finished turn, which would hide the failure.
- `AgentMark` in `src/components/chat/` marks the agent of a session with two
  letters on a small tile, CL or CX, because the app draws no brand logo.
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
