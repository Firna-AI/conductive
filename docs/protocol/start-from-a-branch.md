# Start from a branch

This doc holds the requirements and the decisions in force for a new
workspace that starts from a branch that is not the default branch. It
covers the branch control of New workspace, its picker, the target choice,
and the branch check of a create with its refusals. It belongs to
[Create a workspace](create-a-workspace.md), which covers the rest of New
workspace and the name of each workspace branch. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

[Base branches](base-branches.md) states the base branch that the target
gives. [Workspace calls](workspace-calls.md#create-a-workspace) states the
branches that the create call of an agent takes.

## Terms

- **Picked branch:** the branch that a member picks in the branch control
  of New workspace. It becomes the start branch of the new workspace.
- **Target choice:** the choice between two base branches that New
  workspace offers for a picked branch.
- **Branch check:** the Worker asks GitHub for each branch that a create
  names, before it creates the workspace.

## What the start makes

- A new workspace makes its own branch from the newest commit of its start
  branch (decision 288). The name of that branch follows the rule of every
  workspace branch, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says (decision 53).
- The workspace works on its own branch, not on the picked branch. So a
  start from a branch with an open pull request leads to a new stacked pull
  request. The workspace adds no commits to the open pull request.
- Reason: each workspace keeps a branch of its own, and the login rule
  holds for every workspace branch.
- These ways were rejected (decision 288):
  - Work on the picked branch itself, with pushes to it. Two workspaces
    could then share one branch, and the base branch needed a new rule.
  - Both ways in each row of the picker. They double the actions and the
    start paths.
  - Work on a picked branch whose name starts with the login of the
    member, and a new branch from each other branch. It needs two start
    paths and an exception to the login rule.
- A note to the agent with no change of the app was left out. Reason: the
  pull request bar and Changes would then not follow the branch.

## The branch control

- Each New workspace page and dialog shows a branch control where it shows
  the repository picker.
- The control always names a branch. It shows the default branch of the
  repository until the member picks another branch.
- The control has no Clear, because it always names a branch. A pick of
  the default branch hides the target choice.
- The picked branch and the target choice belong to the draft. So the page
  and the dialog of one draft share them, as they share its message.
- A change of repository puts the control back on the default branch of
  the new repository, and it clears the target choice. Reason: a branch
  belongs to one repository.

## The picker

- A press on the control opens the picker. On a computer, the picker opens
  below the control. A phone opens it as a sheet.
- A search field stands at the top of the picker.
- The default branch comes first, with the detail "default". The other
  branches follow, newest commit first, each with the time since its
  newest commit.
- Reason: the default branch is the usual start, and members pick the
  branches that they work on now.
- A check marks the branch of the form.
- A search keeps only the branches whose names hold the query. The row of
  the default branch follows the same rule.
- A search highlights its first match, and Enter picks that branch.
- A search filters the full branch list without another GitHub read.
- The Worker reads the list live from GitHub with the GitHub token of the
  member, as [Branch reads](github-tokens.md#branch-reads) says. It stores
  no list.
- The live reply holds only branches that GitHub lists, newest commit
  first. The picker adds its default row from the saved repository record.
- The default branch needs no read of GitHub. So its row shows while the
  list loads, after a failed read, and without access to the repository.
- A failed read stops no start from the default branch.
- While the list loads, a line under the default branch says "Loading
  branches…".
- A search without a match says "Nothing matches" with the query, as the
  command palette and the list of `@` do.
- A failed read shows a notice with Try again, which reads the list again.
- When the GitHub account of the member cannot read the repository, a
  notice says so. It has no action, because only GitHub grants that access.
- A repository without other branches, such as an empty repository, lists
  only the default branch.

## The target choice

- When the picked branch is not the default branch, New workspace offers
  two targets: the picked branch and the default branch (decision 291).
- Reason: a member who stacks on a branch, or who works on a long-lived
  branch such as `develop`, targets the picked branch. A member who
  branches off a branch can still target `main`.
- These ways were rejected (decision 291):
  - Always the picked branch, or always the default branch. Each serves
    only one of the two cases.
  - A second picker for any target. Other pairs of branches are rare.
- The picked branch is selected first (decision 295). Reason: a member who
  forgets the choice then gets a pull request with only the new work.
- These ways were rejected (decision 295):
  - The default branch first. A member who forgets the choice then gets a
    pull request with the commits of the picked branch.
  - No first selection. It adds a step before Send.
- A pick of another branch that is not the default branch keeps the choice
  of the member. Only a change of repository clears it. Reason: the picked
  branch is selected first only before the member chooses.
- Each option names its branch, such as "Target `feature-x`" and "Target
  `main`". No word of the choice says "fork". Reason: on GitHub, a fork is
  a copy of the repository.
- A line under the choice says what the pull request then holds: only the
  new work, or also the commits of the picked branch. Reason: the line
  names the cost of a target on the default branch.
- On a computer, the choice is a segmented control. On a phone, it is two
  radio cards, one above the other. Reason: two branch names do not fit
  side by side on a phone.
- On the page, the choice stands under the pickers. In the dialog, it has
  a line of its own under the header.
- The target becomes the base branch of the new workspace, as
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  says.
- The Worker accepts any pair of a start branch and a base branch, from New
  workspace and from an agent. Only New workspace limits the target to
  these two choices. Reason: one create path, and no new refusal of a pair.

## The branch check

- A create from New workspace or from a create call gets a branch check
  for each branch that it names, other than the default branch. The Worker
  asks GitHub with the GitHub token of the sender, as
  [Branch reads](github-tokens.md#branch-reads) says.
- The run of a routine gets no branch check. Reason: a pull request run
  takes its branch from the GitHub event, and each other run starts from
  the default branch.
- The create from New workspace gets the same branch check as the create
  call of an agent (decision 293).
- Reason: a refusal before the create leaves no failed workspace. The
  member or the agent learns the cause at once.
- These ways were rejected (decision 293):
  - No check, and a start failure that names the branch. Each Try again
    then fails the same way.
  - No check, and a fall back to the default branch. The work would then
    start from a branch that the member did not pick.
- A missing branch gets HTTP 404 with the error code `branch_not_found`.
  The refusal names the branch, and the Worker creates no workspace.
- A name that is not a valid Git branch name gets HTTP 400 with the error
  code `invalid_input`.
- When the token of the sender cannot read the repository, the create gets
  HTTP 403 with the error code `github_access_required`. The refusal says
  so, and it does not claim that the branch is missing.
- When GitHub cannot answer, the create goes on, and the start decides.
- A named branch that is the default branch gets no branch check. So a
  create in an empty repository still works.
- A repeat of a create that the Worker took gets that workspace before any
  branch check. For a create call, a repeat has the same request ID. From
  New workspace, a repeat sends the same first message, with its ID.
- Reason: a retry after a lost reply must give the workspace that exists,
  also when GitHub deleted the branch since then.

## Refusals in New workspace

- The refusal of a missing branch shows as the notice of a failed create,
  with its cause. The composer keeps the message.
- Its one action is Start from and the default branch, such as "Start from
  `main`". The action puts the control back on the default branch, and it
  keeps the message.
- Send stays on, as after each failed create. So the member can also pick
  another branch.
- Reason: a Try again of a missing branch fails the same way.
- The refusal of a token that cannot read the repository offers Try again.
  Reason: Try again works once GitHub grants the access.
- The dialog shows the same refusals, and it stays open.
- A sentence that names a branch puts the words "the branch" before the
  name. Reason: a name such as `calummoore/checkout-autocomplete` reads
  like the name of a repository.

## A branch that GitHub deletes before the start

- When GitHub deletes a named branch between the create and the start, the
  start fails. The failure names the branch.
- Reason: each Try again then fails the same way, so the member needs the
  cause.
- Try again keeps the start branch and the base branch of the create.
