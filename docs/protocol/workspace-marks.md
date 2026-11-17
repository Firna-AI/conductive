# Workspace list marks

This page belongs to [Workspace life](workspace-life.md).

- The list mark of a workspace is a grid of 3 × 3 cells. It shows in the
  list, in the rows of the command palette, and in the chips. It means the
  same in each place.
- Its colour gives the [GitHub state](github-banner.md#the-github-state)
  of the workspace (list mark decision 1), in the colour that the pull
  request bar gives the same state. It is red when the checks failed,
  green when the pull request is ready to merge, and purple after the
  merge. It is amber for a merge conflict, changes requested, and a block.
  It is grey while the checks run and for a draft.
- Reason: the mark and the bar of one workspace must never disagree. Cal
  chose the colours of the bar on 13 November 2026.
- Amber for running checks in the list was rejected. Amber would then mean
  both a wait and a state that needs someone on GitHub, and the bar shows
  running checks in grey.
- Without a GitHub state, the mark is dim grey. A grey mark with a GitHub
  state is brighter, so a draft does not read as a branch without a pull
  request.
- A mark shape for each state was rejected for the list. Reason: the list
  and the pull request bar can then disagree, and the user wants the
  checks at a glance.
- The motion of the mark shows whether the agent works (list mark
  decision 1). A light runs around the outer ring of cells while the agent
  works. The whole mark pulses slowly while the agent needs input. In each
  other state, the mark is still, unless the checks run.
- Reason: the pulse keeps needs input in the list, as decision 68 requires.
  A still middle column for needs input was rejected, because the user
  asked for a mark of one full colour.
- The light also runs around the ring while the checks run, also when the
  agent does not work (the user's decision of 11 November 2026). Reason:
  the light means that the workspace waits on something and the user does
  not need to act. While the agent needs input, the mark pulses, whatever
  the checks. An archived mark stays still.
- With reduced motion, the ring stays lit while the agent works. The middle
  column stays lit while the agent needs input. The other cells stay dim,
  so the state of the agent stays visible without motion. While only the
  checks run, every cell stays lit, so the mark does not read as an agent
  that works.
- Bold text alone marks unread output. A green mark for unread output was
  rejected, because green means a pull request that is ready to merge.
- An archived workspace shows a fainter grey mark, whatever its GitHub
  state. Reason: a chip of an archived workspace must show the archive, as
  [Chips](workspace-links.md#chips) says.
- In each place, screen readers hear the GitHub state in words before the
  state, such as "Checks failed, Working". Reason: only the colour shows
  the GitHub state. For an archived workspace, they hear no GitHub state.
- A change of the GitHub state does not change the activity time of the
  row.
