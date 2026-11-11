# The GitHub state of a workspace

This page belongs to [GitHub banner](github-banner.md).

- The GitHub state of a workspace is one value for the pull request of its
  branch: checks failed, checks running, checks passed, or merged.
- The merge wins over the checks. A failure wins over a check that runs.
  Checks passed means that each check counts as passed.
- A merge conflict, changes requested, a draft, and a block do not change
  the GitHub state. Reason: the user named only the checks and the merge.
- No GitHub state applies while the branch has no pull request, or while
  its open pull request has no check.
- A pull request closed without a merge has no GitHub state either. A red
  list mark for it, as GitHub draws a closed pull request, was rejected,
  because red means a failed check in the list. The state of its checks
  was rejected, because a closed pull request needs no action.
