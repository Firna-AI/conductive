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
- After an install, or a change of an install, GitHub returns the user to
  `https://app.conductive.build/github/setup`.
- From a browser, the return opens the screen where the user started the
  install or the change: Get started, Account, or the screen of a list with
  Manage access, such as Create org or the Repositories tab of org
  settings. A return without a known screen opens Home.
- A browser starts each install or change at the app, which keeps the
  screen in a cookie for up to 1 hour and then sends the browser to GitHub.
  The cookie is HttpOnly, Secure, and SameSite=Lax. The return deletes it.
- The return opens only a screen of the app origin. It never opens an API
  route or another site.
- A screen in `state` alone was rejected. Reason: GitHub drops `state` when
  the user changes an install that exists.
- The return needs no sign-in, and it trusts no value that GitHub adds.
  The app reads the installs with the user's own GitHub token.
- Get started and Account read the installs again each time that the user
  comes back to the page.
- A return through the sign-in callback was rejected. Reason: the callback
  refuses a GitHub reply that the app's own sign-in did not start.
- [The Mac app](desktop-sign-in.md#github-app-install) has its own return.
- The GitHub App sends pull request, check, status, and push webhooks to
  the Worker, at `https://api.conductive.build/v1/github/webhooks`.
- A pull request webhook can also start the runs of routines, as
  [Pull request runs](pull-request-runs.md) says.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.

## State of a branch

- The Worker routes each event to each workspace of its branch. Two
  workspaces can share one branch, as
  [Two workspaces on one branch](continue-a-branch.md#two-workspaces-on-one-branch)
  says.
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
- blocked: GitHub blocks the merge for a reason that no other state
  names, such as a missing approval or a branch behind its base
  (decision 64)

Rules for the bar:

- The bar names the branch of the workspace and its base branch, as
  [Base branches](base-branches.md) says (decision 507 G). A narrow column
  cuts each name with an ellipsis, and the full name shows as a tooltip.
- Reason: one layout of the bar serves every workspace, also a pull request
  run whose base branch is not the default branch.
- The bar offers "Create pull request" only when the branch has commits
  that its base branch does not have. It opens a pull request into the base
  branch.
- The bar of a pull request run shows the state of its own branch, not the
  pull request that started it (decision 505 A).
- A bar that shows that pull request was rejected. The run's own work would
  then get no "Create pull request", and the header of the run already
  links to that pull request.
- Each action of the bar links to GitHub. The app merges nothing and writes
  nothing to GitHub for the bar.
- A merge from the app was rejected, and so were buttons that send fixed
  prompts to the agent. The bar shows each state that blocks a merge
  without GitHub write access.
- When the pull request is ready to merge, "Open on GitHub" stands where a
  merge button would be.
- The bar shows Blocked only when no other state applies. Its action
  opens the pull request on GitHub, where GitHub names the reason.
- After the merge, the bar offers Archive (decision 16). Only the workspace
  owner and the admins see it (decision 42). It archives at once and asks
  no question, as [Archive](workspace-life.md#archive) says.
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
