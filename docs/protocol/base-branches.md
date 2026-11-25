# Base branches

This doc holds the requirements and the decisions in force for the base
branch of each workspace. It covers a change of the base branch by an
agent, the base of an open pull request, and a base branch that GitHub
deletes. It also covers the branch of a pull request run. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
start of a workspace and its tools.
[Pull request runs](pull-request-runs.md) says which events start a pull
request run. The terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A retarget
decision number, such as retarget decision 1, names one dated decision of
the change that lets an agent change the base branch. Its plan keeps these
records while the change is open. Its pull request keeps them after the
merge.

## The base branch of a workspace

- Each workspace has a base branch, the branch that its work targets
  (decision 507 G):
  - A workspace from New workspace has the target that the member chose,
    as [The target choice](start-from-a-branch.md#the-target-choice) says
    (decision 301). A start from the default branch has the default branch.
  - A workspace from the create call of an agent has the base branch of
    that call (decision 302).
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
  and, on Boat, the restart near day 14 of a stop. The agent runner gets
  the base branch at each start.
- An agent can change the base branch later, as
  [A change by an agent](#a-change-by-an-agent) says. While the workspace
  branch has an open pull request, the base branch follows the base of
  that pull request.
- After a merge, Continue makes the branch that the pull request merged
  into the base branch of the workspace. When GitHub no longer has that
  branch, Continue takes the default branch, as
  [The base and the new branch](continue.md#the-base-and-the-new-branch)
  says (decision 300). Continue also replaces a base branch that an agent
  set after the merge.
- A repository change makes the latest default branch of the new
  repository the base branch of the workspace, as
  [The base and the new branch](repository-change.md#the-base-and-the-new-branch)
  says.
- A repository change stores that default base as null, as a create and
  Continue do (decision 312). The base then follows a later rename.
  Keeping its name was rejected, because a rename would look like a
  deleted base and give the wrong cause in the pull request bar.
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

## A change by an agent

- An agent can change the base branch of a workspace with a call of the
  workspace tools (retarget decision 1 C).
  [Change the target branch](workspace-management.md#change-the-target-branch)
  states the call, its refusals, and its reply.
- Without an open pull request, the call stores its branch as the new base
  branch.
- While the workspace branch has an open pull request, the call changes
  the base of that pull request on GitHub (retarget decision 2 C). The
  base branch then follows that base, as
  [The base of an open pull request](#the-base-of-an-open-pull-request)
  says.
- A new base branch that is the default branch is stored as null, as for a
  create (decision 312). It then follows a later rename.
- The cloud computer then moves to the new base branch, as
  [The move in the cloud computer](#the-move-in-the-cloud-computer) says.
- The call does not merge or rebase the workspace branch. Reason: the
  agent does each step that changes code (decision 220), and
  [Merge latest](command-palette-actions.md#merge-latest) asks it to merge
  the latest target branch.
- The app has no control that lets a member pick another base branch for a
  workspace. Reason: the user asked for a change by an agent.

## The base of an open pull request

- While the workspace branch has an open pull request, the base branch is
  the base of that pull request on GitHub (retarget decision 1 C). A draft
  counts as open.
- Each GitHub read of the workspace compares that base with the stored
  base branch. When the two differ, the Worker stores the base of the pull
  request. The cloud computer then moves to it, as
  [The move in the cloud computer](#the-move-in-the-cloud-computer) says.
- A null stored base compares with the default branch of the same read. A
  base on the default branch is stored as null, as for a create
  (decision 312).
- So after a rename of the default branch, a null stored base stays null.
  The move of [A new default branch on GitHub](#a-new-default-branch-on-github)
  then moves the cloud computer.
- A `pull_request` webhook of the workspace branch, such as `edited`,
  starts a GitHub read. So the base branch follows a new base from a
  member, from an agent that runs `gh pr edit --base`, and from GitHub's
  own retarget of a stack.
- The rule holds also for a workspace whose open pull request already
  targets another branch. Its next GitHub read follows that base.
- A merged or a closed pull request does not count. The base branch then
  stays until another change, such as a call, Continue, or the move of a
  deleted base.
- A call and a GitHub read of the same workspace change its base branch
  one at a time. Reason: a read must not follow a pull request halfway
  through a call.
- Reason for both ways: only the call and this rule together keep the
  pull request bar, Changes, and the cloud computer on the real target.
- These ways were rejected (retarget decision 1):
  - This rule only, where the agent runs `gh pr edit --base`. It gives no
    way to change the base branch before a pull request opens.
  - The call only. The workspace then does not follow a later new base on
    GitHub: an edit by the agent or a member, or GitHub's own retarget of
    a stack.

## A base branch that GitHub deleted

- When GitHub no longer has the base branch of a workspace, the Worker
  moves it to the default branch (decision 304). Continue takes the default
  branch in the same case (decision 300).
- That move happens only while the workspace branch has no open pull
  request (retarget decision 1 C). With an open pull request, the base
  branch follows that pull request, also after GitHub retargets a stack,
  as [The base of an open pull request](#the-base-of-an-open-pull-request)
  says.
- Only an answer of GitHub that the branch does not exist moves the base
  branch. A failed read of GitHub keeps it.
- The cloud computer follows the move, as
  [The move in the cloud computer](#the-move-in-the-cloud-computer) says.
  Changes, the diffs, and a pull request that the agent opens with `gh`
  then use the default branch.
- The pull request bar then names the default branch, and a message under
  the bar says that the base moved, as
  [Banner states](github-banner.md#banner-states) says.
- Reason: GitHub can delete a branch after its pull request merges, also
  when another workspace stacks on it. After the move, the bar can read its
  state, and Create PR opens a pull request into a branch that exists.
- These ways were rejected (decision 304):
  - No move. A normal stack then ends with a bar that cannot read its
    state, and Create PR targets a branch that does not exist.
  - A bar state that turns off Create PR. The app then gives no way back.

## A new default branch on GitHub

- When a repository webhook saves a new default branch, each live
  workspace of that repository with a null stored base gets a base move
  (decision 310). Its stored base stays null, because it already follows
  the saved default.
- A workspace with a stored base keeps its base and its cloud target.
- The move uses [the saved move and retry](#the-move-in-the-cloud-computer).
  A running cloud computer fetches the new default branch, then targets
  it. A stopped computer runs the same move when it resumes.
- Reason: the app and cloud computer must agree on the target. An old
  copy can show merged work in Changes and target a branch that is gone.
- These ways were rejected (decision 310):
  - No move. Members would need Continue or a new workspace after each
    rename.
  - A fetch at each start. A running computer waits for its next start,
    and each start needs a token.

## The move in the cloud computer

- A move takes the cloud computer to a new base branch. It follows a
  deleted base, a new default branch, a call of an agent, or a new base of
  the open pull request. Continue and a repository change move the cloud
  computer in their own steps.
- Each move first fetches the latest commit of the new base branch from
  GitHub into the cloud computer. Only after that fetch does the cloud
  computer target the new base branch (decision 307).
- Reason: Changes compare from the merge base. An old copy of the new base
  branch lacks its newer commits, such as a merge commit of the deleted
  branch. Changes would then show merged work as work of the workspace.
- [A moved base](github-tokens.md#a-moved-base) says whose GitHub token
  the fetch uses, and gives the ways that decision 307 rejected.
- Until the fetch succeeds, the cloud computer keeps its earlier target.
  Changes and the diffs then still work, against the earlier base branch.
- One saved retry owns each unfinished move, in the record of the
  workspace and in the cloud computer (decision 308). After each failure,
  it tries again. It waits longer each time, up to a fixed longest wait.
- A new base branch replaces an unfinished move (decision 308). The cloud
  computer then fetches and targets only the newest base branch. Reason:
  the record of the workspace names only that branch.
- Each resume of the cloud computer also runs an unfinished move. A
  failure then does not stop the resume, and the saved retry stays.
- The GitHub read, the repository webhook, or the call that starts a move
  saves that retry. It runs no command in the cloud computer. So a failure
  in the cloud computer does not fail the GitHub read of the pull request
  bar, or the call.
- Reason: one retry for each move keeps the tries of a long failure few.
  The pull request bar does not depend on the cloud computer.
- A retry inside the GitHub read was rejected (decision 308). A failure in
  the cloud computer then also fails that read.

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
