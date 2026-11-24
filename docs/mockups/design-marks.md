# The design of the marks

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the list
mark and the text beside it, the mark of the header, and the marks of
automation runs. It also gives the mark of an agent.
[The workspace](design-workspace.md) gives the label of a workspace number
with Copy link.

- `WorkspaceMark` in
  [`src/ui/components/workspaces/`](../../src/ui/components/workspaces/)
  draws the list mark of a
  workspace, which the list, the rows of the command palette, and the
  workspace and session chips show. It is a 3 × 3 dot-matrix square in one colour for
  the GitHub state of the pull request, in the tone of the pull request
  bar: rose when checks failed, the success green when the pull request is
  ready to merge, the `listMerged` purple after the merge, and amber for a
  merge conflict, requested changes, and Blocked. While checks run and for
  a draft, the cells are lit grey. Without a GitHub state, every cell is
  dim grey. An archived workspace keeps faint grey cells, whatever its
  GitHub state. A light runs around the ring while the agent works, the
  workspace starts, or the checks run, and the centre cell stays dim. The
  whole square turns the `primary` blue and pulses while the agent waits
  for the user, such as for the approval of a command, whatever the GitHub
  state. Every other mark
  is still, so only bold text marks unread output. With reduced motion,
  the ring or the blue middle column stays lit, and the other cells stay
  dim. A workspace that starts keeps the lit ring of a working agent. A
  mark whose checks run while the agent does not work stays fully lit
  without motion.
  `listMarkLabel` in `status.ts` beside it gives the words that screen
  readers hear, such as "Checks failed, Working". The mark imports no
  fixture value, so the app uses it too.
  - `WorkspaceName` in
    [`src/ui/components/workspaces/`](../../src/ui/components/workspaces/)
    draws the text beside
    the list mark: the name of a workspace, or the title of a session in a
    session chip. It gives that text the emphasis of the state of the
    workspace, such as bold text for unread output. It reads that emphasis
    from `activityPresentation` in `status.ts`. The list, the rows of the
    command palette, and the
    [workspace and session chips](design-chips.md)
    use it. So one part chooses the emphasis in each of these places.
  - Each place gives its own class for each emphasis that it shows, so it
    keeps its own look. Each place must give the class of unread output,
    because bold text alone marks unread output. The mark, the label of the
    workspace number, the time, the words that screen readers hear, and the
    Rename field stay with each place. `WorkspaceName` imports no fixture
    value, so the app can use it too.
- `StatusGlyph` beside `WorkspaceMark` draws the state of the agent and
  the cloud computer, as the header and the operator section show it, on
  the same grid, from `MarkGrid`. Each state has its own shape, and working and
  starting move with CSS. A finished turn is a full bright green square,
  and ready is one bright cell on a faint green grid. A workspace whose
  agent waits for the user shows Needs input: a middle column in the accent
  colour that pulses.
  An automation run takes the mark of the header of its workspace, not the
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
