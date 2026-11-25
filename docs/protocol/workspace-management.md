# Workspace management

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that rename, move, and archive one workspace, and
change its target branch. It belongs to
[Workspace calls](workspace-calls.md), which lists each call with its
route. [Agent tool access](agent-tool-access.md) states what each call
reaches, which calls need an active turn, and the rights of the sender.
The terms are those of the [architecture doc](../architecture.md#terms).
A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
parent-move decision number names a decision of the change that adds
[parent changes](parent-changes.md), as that doc says. A retarget decision
number names a decision of the change that lets an agent change the base
branch, as [Base branches](base-branches.md) says.

## Rename a workspace

- `rename_workspace` takes a workspace and a name.
- The Worker cleans the name, and treats a blank name, as
  [Names from the workspace tools](tool-names.md) says.
- No automatic name replaces the stored name, as after Rename in the
  [menu of a workspace row](workspace-menu.md#rename).
- The rename changes the branch only before the start creates the branch
  in the sandbox, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says. After that, the rename keeps the branch.
- An archived workspace refuses the rename with HTTP 409 and the error
  code `workspace_archived`, as the app does.
- The reply gives the workspace with its stored name.

## Move a workspace

- `move_workspace` takes a workspace, and a section of the org, a target,
  or both. A target is a new parent or the top level, as
  [Parent changes](parent-changes.md) says (parent-move decision 1 A).
- The MCP tool takes a new parent as `parentId`, and the top level as
  `topLevel: true`. The CLI takes `--parent ID` and `--top-level`.
- Reason for the names: a create call and the list take a parent with
  the same names. "Top-level" is the term of the docs.
- The section is optional only when the call names a target. A call with
  no section and no target gets HTTP 400 with the error code
  `invalid_input`. Reason: older tools always send a section, so each
  request that they send keeps its result.
- A call with both `parentId` and `topLevel: true` gets HTTP 400 with the
  error code `invalid_input` (parent-move decision 3 A).
- Without a target, the call moves the workspace to the top of that
  section, as [Move to section](workspace-menu.md#move-to-section) does.
  A move to the section of the workspace changes nothing.
- A move of a workspace that the list shows as a top-level row also moves
  each workspace nested under it. Without a target, a workspace that the
  list shows as a nested row moves nothing, and the reply gives a
  `notice`. [Moves](sub-workspaces.md#moves) gives these rules.
- With a target, the call changes the parent of the workspace, and moves
  each workspace nested under it too.
  [Parent changes](parent-changes.md) gives the section and the place of
  the moved tree, and its `notice`. It also gives the errors of a target:
  `nesting_cycle` and `nesting_limit` with HTTP 409, and
  `workspace_not_found` with HTTP 404.
- An unknown section gets HTTP 404 with the error code
  `section_not_found`.
- An archived workspace refuses the move with HTTP 409 and the error code
  `workspace_archived`, as the app does.
- The reply gives the workspace with its section, its `parent`, and its
  `depth` after the move. It can also give a `notice`.
- The reply to a move with a target has the same form as the reply to a
  section move. Reason: older tools then accept the reply.
- The help of the CLI and the description of `move_workspace` say how to
  nest a workspace under a parent, and how to take it out of its tree.
  Reason: the notice of a nested row names no target, as
  [Moves](sub-workspaces.md#moves) says.

## Change the target branch

- `retarget_workspace` takes a workspace and a branch. That branch becomes
  the target branch of the workspace: its base branch, as
  [A change by an agent](base-branches.md#a-change-by-an-agent) says
  (retarget decision 1 C).
- The MCP tool takes the branch as `baseBranch`. The CLI command is
  `conductive workspaces retarget --base-branch BRANCH`, with an optional
  `--workspace ID`.
- Reason for the names: each MCP tool has a verb and a noun (decision 278).
  Each workspace write uses one verb for its MCP tool, its CLI command, and
  its route. GitHub calls a new base of a pull request a retarget. A create
  call names the same branch `baseBranch`.
- Every member can change the target branch through an agent (retarget
  decision 3 A), as
  [The rights of the sender](agent-tool-access.md#the-rights-of-the-sender)
  says.
- The call takes any branch that GitHub has, also the workspace branch
  itself. Reason: retarget decision 4 A adds no other refusal, and a create
  takes any pair of branches.
- A call that names the current target branch changes nothing.
- The call does not wait for the move of the cloud computer, as
  [The move in the cloud computer](base-branches.md#the-move-in-the-cloud-computer)
  says.

### The pull request on GitHub

- While the workspace branch has an open pull request, also a draft, the
  Worker changes its base on GitHub (retarget decision 2 C). It uses the
  GitHub token of the sender, as Merge does. The target branch then
  follows that base.
- Reason: one call works in every state. The Worker already writes to
  GitHub as the member for Merge and Ready for review.
- These ways were rejected (retarget decision 2):
  - A call that changes nothing and tells the agent to run
    `gh pr edit --base`.
  - A CLI that runs `gh pr edit --base` in the cloud computer, and a
    workspace that follows the webhook.
  - No route of the Worker. The cloud computer sets a Git setting or runs
    `gh pr edit`, and the runner reports it.
- The change on GitHub needs GitHub write access or more for the sender,
  as Merge and Ready for review do. Without it, the call gets HTTP 403
  with the error code `github_retarget_forbidden`.
- Another refusal of GitHub gets HTTP 409 with the error code
  `github_retarget_refused`. No GitHub error text reaches the agent.
- GitHub can change the base and then lose its reply. The next GitHub
  read still takes the new base, as
  [The base of an open pull request](base-branches.md#the-base-of-an-open-pull-request)
  says. Reason: GitHub then holds the base that the call asked for.
- When the record of the workspace cannot store the new target branch
  after the change on GitHub, the call fails. The webhook of that change
  starts the next GitHub read, which stores the new base.

### Refusals of a target change

- The call copies refusals that other actions already give (retarget
  decision 4 A):
  - A name that is not a valid Git branch name gets HTTP 400 with the
    error code `invalid_input`.
  - Unless the branch is the default branch, the Worker asks GitHub for it
    with the GitHub token of the sender. A branch that GitHub does not
    have gets HTTP 404 with the error code `branch_not_found`, as for a
    create (decision 303).
  - When the token of the sender cannot read the repository, the call gets
    HTTP 403 with the error code `github_access_required`.
  - An archived workspace gets HTTP 409 with the error code
    `workspace_archived`.
  - While Continue, a repository change, or Restart runs, the call gets
    HTTP 409 with the error code `workspace_continuing`,
    `workspace_repository_changing`, or `workspace_restarting`.
- Reason: Continue, a repository change, and Restart already refuse each
  other. A call that waits needs a saved request and a reply that waits.
- A refusal of only a missing branch, with a wait for the end of a running
  Continue or repository change, was rejected (retarget decision 4).
- The read of an open pull request also uses the GitHub token of the
  sender. A sender who must sign in to GitHub again gets HTTP 401 with the
  error code `github_reconnect_required`, as for Merge. Unlike a create,
  the call then does not go on. Reason: the call acts for the sender.
- A refused call changes nothing. The pull request on GitHub, the record
  of the workspace, and the cloud computer keep their state. Reason: no
  partial change.

### The reply and the help

- The reply gives the workspace with its target branch in `baseBranch`.
  Reason: each other workspace write gives the same reply.
- After a change on GitHub, the reply also gives a `notice`. The notice
  names the pull request and its new base.
- The help of the CLI and the description of `retarget_workspace` say what
  the target branch does. They say that the call changes the base of an
  open pull request on GitHub, as the sender. They also say that the call
  needs an active turn, and that it reaches each workspace of the org.
- They also say that the cloud computer targets the new branch only after
  its fetch. Until then, `gh pr create` needs `--base`. Reason: a pull
  request into the earlier branch would lead the target branch back.

## Archive a workspace

- `archive_workspace` takes a workspace. It makes the same write as
  Archive in the app, with no question and no check, as
  [Archive](workspace-life.md#archive) says.
- Only the workspace owner or an admin can archive it (decision 42).
  Otherwise the call gets HTTP 403 with the error code
  `archive_forbidden`, and nothing changes.
- An agent can archive the calling workspace. That archive ends the
  calling turn, because Archive stops the cloud computer and revokes the
  workspace token. So the agent can miss the reply.
- Reason: Conductor's archive command takes the current workspace by
  default.
- A member can restore the workspace for 14 days, as
  [Restore](workspace-life.md#restore) says.
- An archive of an archived workspace changes nothing.
- The reply gives the workspace with the time of the archive and the end
  of Restore.
