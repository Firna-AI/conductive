# GitHub banner

This doc holds the requirements and the decisions in force for the pull
request bar of a workspace. It also covers the Checks tab and the GitHub
events behind them. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The GitHub App

- One GitHub App gives the app its sign-in, its repository access, and its
  GitHub webhooks.
- A user installs the GitHub App on each GitHub account that owns
  repositories that the user wants to use.
- The GitHub App sends pull request, check, status, and push webhooks to
  the Worker.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.

## State of a branch

- The Worker routes each event to the workspace of its branch.
- The Worker pushes the new state to every open tab of that workspace.
- When a tab opens, the Worker reads the current pull request and the
  current checks of the branch from the GitHub API.

## Banner states

The bar shows one state of the branch of the workspace (decision 18):

- no pull request
- checks running
- checks failed
- ready to merge
- merged
- merge conflict
- changes requested
- draft
- closed without a merge

Rules for the bar:

- The bar offers "Create pull request" only when the branch has commits.
- Each action of the bar links to GitHub. The app merges nothing and writes
  nothing to GitHub for the bar.
- A merge from the app was rejected, and so were buttons that send fixed
  prompts to the agent. The bar shows each state that blocks a merge
  without GitHub write access.
- When the pull request is ready to merge, "Open on GitHub" stands where a
  merge button would be.
- After the merge, the bar offers Archive (decision 16). Only the workspace
  owner and the admins see it (decision 42).
- Each state shows an icon and words, never only a colour.
- A state tints the whole bar. No edge of the bar gets its own colour.

## Checks

- The Checks tab lists each check that GitHub reports for the pull
  request, in GitHub's order, with its state.
- A finished check shows how long it ran.
- While the branch has no pull request, the Checks tab shows that it waits
  for one.

## Layouts

- On desktop, the pull request bar sits at the top of the right column,
  above the All files, Changes, and Checks lists.
- On a phone, a compact pull request row at the top of the workspace shows
  the state. The row opens the checks.
