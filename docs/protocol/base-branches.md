# Base branches

This doc holds the requirements and the decisions in force for the base
branch of each workspace. It also covers the branch of a pull request run.
It belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md), which
covers the start of a workspace and its tools.
[Pull request runs](pull-request-runs.md) says which events start a pull
request run. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The base branch of a workspace

- Each workspace has a base branch, the branch that its work targets
  (decision 507 G):
  - A workspace that a person or an agent creates has the default branch of
    its repository. The run of a schedule or of Run now has it too.
  - The run of an opened or pushed pull request has the head branch of that
    pull request.
  - The run of a merged pull request has the base branch of that pull
    request.
- A workspace keeps its base branch at each start: the create, a resume,
  and the restart near day 14 of a stop. The agent runner gets the base
  branch at each start.
- Changes and each diff compare the branch with its base branch, from the
  merge base of the two.
- Reason: the base branch can move while a workspace works. A plain
  comparison would show the newer commits of the base branch as reverted.
- The pull request bar names the base branch, and "Create pull request"
  opens a pull request into it, as
  [Banner states](github-banner.md#banner-states) says.
- A pull request that the agent opens with the GitHub CLI, `gh`, targets the
  base branch by default.
- So a pull request run shows only its own work. It sends that work to the
  pull request that started it.
- A comparison with the default branch for every workspace was rejected. A
  pull request run would then show the commits of its pull request as its
  own work. "Create pull request" would offer them in a second pull
  request.
- A base that also stores the commit where the branch starts was rejected.
  The merge base already keeps the newer commits of the base branch out of
  Changes.
- A comparison with the head commit alone was rejected, because the run of
  a merged pull request targets another branch.
- Two groups in Changes, the work of the run and the changes of the pull
  request, were rejected. They need a second list in the reports of the
  agent runner.

## The branch of a pull request run

- The run of an opened or pushed pull request creates its branch at the
  head commit of the event (decision 505 A). When that commit is missing,
  the branch starts at the newest head of the pull request.
- The run of a merged pull request creates its branch from the base branch
  of the pull request.
- The name of the branch follows the rule of every workspace, as
  [Create a workspace](create-a-workspace.md#the-branch-and-the-name)
  says (decision 53).
- The run pushes to its own branch, unless its prompt says otherwise.
- A start step names what the run fetches. For an opened or pushed pull
  request, it names the pull request and the repository, such as "Fetching
  pull request #482 of storefront".
- For a merged pull request, the start step names the fetch of the base
  branch of the pull request.
- The archive check counts no commit of the pull request as unpushed.
  Reason: those commits are already on GitHub.
- Work on the branch of the pull request itself was rejected, both in a
  new workspace and in a workspace that already has that branch.
- Reason: two workspaces would then share one branch, or the run would
  disturb the agent that works there.
