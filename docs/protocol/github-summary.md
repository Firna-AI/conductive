# The GitHub state of a workspace

This page belongs to [GitHub banner](github-banner.md).

- The GitHub state of a workspace is the state of the pull request bar of
  its branch, as [Banner states](github-banner.md#banner-states) lists
  them: checks running, checks failed, ready to merge, merged, merge
  conflict, changes requested, draft, or blocked.
- Reason: the list mark and the bar of one workspace must never disagree.
  Cal chose this on 13 November 2026.
- A GitHub state of its own, with only the checks and the merge, was
  rejected. With it, a merge conflict, changes requested, a draft, or a
  block left the mark in the colour of the checks, such as green beside a
  bar with a merge conflict.
- No GitHub state applies while the branch has no pull request.
- A pull request closed without a merge has no GitHub state either. A red
  list mark for it, as GitHub draws a closed pull request, was rejected,
  because red means a failed check in the list. The state of its checks
  was rejected, because a closed pull request needs no action.
