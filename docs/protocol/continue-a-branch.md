# Continue a branch

This doc holds the requirements and the decisions in force for a new
workspace that continues a branch that exists on GitHub. It covers the
choice of the branch in New workspace, the pull requests from other
repositories, the first start on an existing branch, and two workspaces on
one branch. It belongs to [Create a workspace](create-a-workspace.md),
which covers New workspace, the create, and a failed first start. The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The choice of the branch

- New branch stays the default of New workspace (import decision 1).
- Under the repository picker of the page, a line says that the workspace
  starts on a new branch from the default branch. A quiet link on that
  line changes the branch.
- The dialog shows the same choice as a quiet picker beside its
  repository picker.
- Reason: the user asked for a subtle control, because the choice is not
  common.
- The link opens a picker with New branch, the open pull requests of the
  repository, and its branches without an open pull request. All of them
  come from GitHub. On a phone, the picker opens in a sheet.
- The picker never offers the default branch of the repository.
- A search in the picker finds a branch by its name, and a pull request by
  its number, its title, or its branch.
- While the list loads, the picker says so. When the list did not load,
  the picker shows the failure with Try again. A search with no match says
  so.
- New branch stays available in each of these states.
- Opening the picker keeps the current choice and the draft. A chosen
  branch or pull request shows on the line, with Change.
- After the choice of an existing branch, no text of the form says that
  the workspace starts on a new branch.
- The picker lists only the branches and the pull requests of a chosen
  repository of the org.

## Pull requests from other repositories

- A pull request whose branch is in another repository, such as a fork,
  shows as unavailable (import decision 15). It says that its branch is in
  another repository, and it offers Open on GitHub. It cannot be chosen.
- The picker, the dialog, and the sheet of a phone show the same row.
- The picker compares the ID of the head repository of each pull request
  with the ID of the chosen repository. It never compares branch names.
- Reason: a branch of a fork can have the name of a branch of the chosen
  repository, even of its default branch. This rule also covers a pull
  request whose fork was deleted.
- A search finds such a pull request only by its number and its title.
- Reason: the workspace, the pull request bar, and the GitHub events
  follow one repository and one branch. The row tells the reason before
  the person creates a workspace.
- These ways were rejected:
  - A copy of the work of the fork onto a new branch of the chosen
    repository. It does not update the original pull request.
  - A workspace that continues the branch of the fork, when the sender can
    push there. It changes the repository model, the banner, and the
    routing of the GitHub events.
  - A mix of these two ways.
  - Pull requests from forks without a row. The person then gets no reason
    for a pull request that GitHub shows.

## The start on an existing branch

- A workspace on an existing branch keeps the name of that branch. It gets
  no new branch name.
- A chosen pull request gives its branch. So the pull request bar of the
  workspace follows that pull request.
- The first start fetches that branch from GitHub and checks it out, with
  tracking.
- When that branch no longer exists on GitHub at the first start, the
  start fails. The cause names the branch.
- The workspace then keeps its accepted messages, as
  [A failed first start](create-a-workspace.md#a-failed-first-start) says.
  Try again works once the branch exists on GitHub again.
- Try again keeps the branch of the workspace. A change to a new branch is
  a separate feature.
- The Changes list and the agent instructions use the default branch as
  the base, as for each workspace that a person or an agent creates.
  [Base branches](base-branches.md#the-base-branch-of-a-workspace) gives
  the base of each workspace. [The branches](agent-instructions.md#the-branches)
  states the instructions.

## Two workspaces on one branch

- Two workspaces of one org can use the same branch (import decision 2).
  The app shows no warning.
- This holds for a new workspace on an existing branch and for an imported
  workspace.
- Each of these workspaces follows that branch. The pull request bar and
  the GitHub events reach each of them, as
  [State of a branch](github-banner.md#state-of-a-branch) says.
- Reason: the user chose to allow it with no warning. A rule of one open
  workspace for each branch, also when a unique index holds it, and a
  warning that names the other workspace were rejected.

## Other creates

- A create call of the agent tools always starts a new branch, as
  [Create and list calls](agent-tools.md#create-and-list-calls) says.
- An imported workspace keeps the branch of its Conductor workspace, as
  [Imported workspaces](imported-workspaces.md#the-workspace) says.
