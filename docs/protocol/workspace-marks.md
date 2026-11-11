# Workspace list marks

This page belongs to [Workspace life](workspace-life.md).

- The list mark of a workspace is a grid of 3 × 3 cells. It shows in the
  list, in the rows of the command palette, and in the chips. It means the
  same in each place.
- Its colour gives the [GitHub state](github-banner.md#the-github-state)
  of the workspace (list mark decision 1). It is red when the checks
  failed, amber while they run, green when they passed, and purple after
  the merge.
- Without a GitHub state, the mark is dim grey.
- A mark shape for each state was rejected for the list. Reason: the list
  and the pull request bar can then disagree, and the user wants the
  checks at a glance.
- The motion of the mark shows whether the agent works (list mark
  decision 1). A light runs around the outer ring of cells while the agent
  works. The whole mark pulses slowly while the agent needs input. In each
  other state, the mark is still.
- Reason: the pulse keeps needs input in the list, as decision 68 requires.
  A still middle column for needs input was rejected, because the user
  asked for a mark of one full colour.
- With reduced motion, the ring stays lit while the agent works. The middle
  column stays lit while the agent needs input. The other cells stay dim,
  so the state of the agent stays visible without motion.
- Bold text alone marks unread output. A green mark for unread output was
  rejected, because green means passed checks.
- An archived workspace shows a fainter grey mark, whatever its GitHub
  state. Reason: a chip of an archived workspace must show the archive, as
  [Chips](workspace-links.md#chips) says.
- In each place, screen readers hear the GitHub state in words before the
  state, such as "Checks failed, Working". Reason: only the colour shows
  the GitHub state. For an archived workspace, they hear no GitHub state.
- A change of the GitHub state does not change the activity time of the
  row.
