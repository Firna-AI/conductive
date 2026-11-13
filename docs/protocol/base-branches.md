# Base branches

This doc holds the requirements and the decisions in force for the base
branch of each workspace, also after GitHub deletes it. It also covers the
branch of a pull request run. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
start of a workspace and its tools.
[Pull request runs](pull-request-runs.md) says which events start a pull
request run. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The base branch of a workspace

- Each workspace has a base branch, the branch that its work targets
  (decision 507 G):
  - A workspace from New workspace has the target that the member chose,
    as [The target choice](start-from-a-branch.md#the-target-choice) says
    (decision 291). A start from the default branch has the default branch.
  - A workspace from the create call of an agent has the base branch of
    that call (decision 292).
    [Create a workspace](workspace-calls.md#create-a-workspace) gives the
    defaults. A call that names no branch gives the default branch.
  - The run of a schedule or of Run now has the default branch of its
    repository.
  - The run of an opened or pushed pull request has the head branch of that
    pull request.
  - The run of a merged pull request has the base branch of that pull
    request.
- A create that names the default branch as its base gets the same base
  branch as a create that names none. Reason: that base branch then
  follows a rename of the default branch.
- A workspace keeps its base branch at each start: the create, a resume,
  and the restart near day 14 of a stop. The agent runner gets the base
  branch at each start.
- After a merge, Continue makes the branch that the pull request merged
  into the base branch of the workspace. When GitHub no longer has that
  branch, Continue takes the default branch, as
  [The base and the new branch](continue.md#the-base-and-the-new-branch)
  says (decision 290).
- A change of the base of an open pull request on GitHub does not change
  the base branch of the workspace. A base branch that follows the pull
  request on GitHub was left out for now (decisions 291 and 294).
- Changes and each diff compare the branch with its base branch, from the
  merge base of the two.
- Reason: the base branch can move while a workspace works. A plain
  comparison would show the newer commits of the base branch as reverted.
- The pull request bar names the base branch, and "Create PR"
  opens a pull request into it, as
  [Banner states](github-banner.md#banner-states) says.
- A pull request that the agent opens with the GitHub CLI, `gh`, targets the
  base branch by default.
- So a pull request run shows only its own work. It sends that work to the
  pull request that started it.
- A comparison with the default branch for every workspace was rejected. A
  pull request run would then show the commits of its pull request as its
  own work. "Create PR" would offer them in a second pull
  request.
- A base that also stores the commit where the branch starts was rejected.
  The merge base already keeps the newer commits of the base branch out of
  Changes.
- A comparison with the head commit alone was rejected, because the run of
  a merged pull request targets another branch.
- Two groups in Changes, the work of the run and the changes of the pull
  request, were rejected. They need a second list in the reports of the
  agent runner.

## A base branch that GitHub deleted

- When GitHub no longer has the base branch of a workspace, the Worker
  moves it to the default branch (decision 294). Continue takes the default
  branch in the same case (decision 290).
- Only an answer of GitHub that the branch does not exist moves the base
  branch. A failed read of GitHub keeps it.
- The cloud computer follows the move. Changes, the diffs, and a pull
  request that the agent opens with `gh` then use the default branch.
- The pull request bar then names the default branch, and a message under
  the bar says that the base moved, as
  [Banner states](github-banner.md#banner-states) says.
- Reason: GitHub can delete a branch after its pull request merges, also
  when another workspace stacks on it. After the move, the bar can read its
  state, and Create PR opens a pull request into a branch that exists.
- These ways were rejected (decision 294):
  - No move. A normal stack then ends with a bar that cannot read its
    state, and Create PR targets a branch that does not exist.
  - A bar state that turns off Create PR. The app then gives no way back.

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
- The local work of the pull request bar and of Continue counts no commit
  of the pull request as unpushed, as
  [Actions](github-banner.md#actions) and
  [Local work](continue.md#local-work) say. Reason: those commits are
  already on GitHub.
- Archive runs no check for unpushed commits, as
  [Archive](workspace-life.md#archive) says.
- Work on the branch of the pull request itself was rejected, both in a
  new workspace and in a workspace that already has that branch.
- Reason: two workspaces would then share one branch, or the run would
  disturb the agent that works there.
