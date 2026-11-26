# GitHub banner: checks and layouts

This page belongs to [GitHub banner](github-banner.md). It holds the
requirements and the decisions in force for the Checks tab. It also says
where the pull request bar and its parts show on desktop and on a phone.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Checks

- The Checks tab lists each check that GitHub reports for the pull
  request, in GitHub's order, with its state.
- A finished check shows how long it ran.
- While the branch has no pull request, the Checks tab shows that it waits
  for one.
- For the bar and the GitHub state, a failed, cancelled, timed-out, or
  action-required check is a failure. A queued or running check runs. Each
  other check counts as passed.
- The list mark of the workspace shows its
  [GitHub state](github-summary.md), the state of the bar, in the colour of
  the bar, as [The list mark](workspace-life.md#the-list-mark) says. While
  the agent needs input, the mark is blue instead.

## Layouts

- On desktop, the pull request bar sits at the top of the right column,
  above the All files, Changes, and Checks lists. A message of the bar
  shows under it.
- On a phone, a compact pull request row at the top of the workspace shows
  the state. The row opens the Checks tab, also for a branch without a pull
  request when the bar has an action or a link.
- On a phone, the actions of the bar, its message, and its links to GitHub
  show at the top of the Checks tab.
- Reason: a button cannot sit inside the link of the row, and two states
  have two actions.
- A row of a branch without commits and without local work is not a link.
- [The bar of a queued workspace](merge-queue-in-the-app.md#the-bar-of-a-queued-workspace)
  gives the compact row and the line of a workspace in the merge queue on a
  phone. [Add to merge queue](merge-queue-in-the-app.md#add-to-merge-queue)
  gives the form of its button in a narrow bar.

### The branch and its base on a phone

- While the branch has no pull request, the top of the Checks tab on a
  phone names the branch and its base branch (decision 306).
- It names them as the bar does on desktop: the branch icon, the branch,
  an arrow, and the base branch. It adds no other words.
- They show also when the bar has no action. Examples are a branch without
  commits, a member without GitHub write access, and a suspended org.
- Reason: one rule serves every workspace. The bar on desktop also names
  the branches in each of these states.
- They stand on the line above Create PR, in the same group. The message
  of a moved base stays first, above them.
- Reason: the base branch is the target of Create PR. The top of the
  Checks tab keeps its order: the message, then the actions.
- The names wrap and show in full. When the two names do not fit on one
  line, the base branch takes a line of its own with its arrow. A name
  that is longer than the line breaks.
- Reason: a phone has no tooltip that shows a cut name in full.
- These ways were rejected (decision 306):
  - The base branch in the compact row. Long names then get cut more.
  - The branches only when the base branch is not the default branch. One
    rule for every workspace is simpler.
  - No change. A phone user then cannot see the target before Create PR.
