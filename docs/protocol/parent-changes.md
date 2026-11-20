# Parent changes

This doc holds the requirements and the decisions in force for parent
changes. A parent change nests a workspace under another parent, or takes
it out of its tree. This doc covers the target of a move, the moved tree,
its place in the list, the refusals, and the agents of the moved tree. It
belongs to [Sub-workspaces](sub-workspaces.md), which states the parent
link, the depth limit, the list, and the moves of a tree.
[Move a workspace](workspace-calls.md#move-a-workspace) states the fields
of the call. The terms are those of the
[architecture doc](../architecture.md#terms), the terms of
[Sub-workspaces](sub-workspaces.md#terms), and the terms below.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
parent-move decision number, such as parent-move decision 1, names the
dated record of one decision of the change that adds parent changes. Its
plan keeps these records while the change is open. Its pull request keeps
them after the merge. A sub-workspace decision number names a decision of
the change that adds sub-workspaces, as [Sub-workspaces](sub-workspaces.md)
says.

## Terms

- **Target:** the new place that a parent change names: a parent
  workspace, or the top level.
- **Moved tree:** the workspace of a parent change, with each workspace
  nested under it, live or archived.

## The target

- `move_workspace` takes an optional target (parent-move decision 1 A). A
  parent as the target nests the workspace under that parent. The top
  level as the target takes the workspace out of its tree, so that it
  becomes a top-level workspace.
  [Move a workspace](workspace-calls.md#move-a-workspace) gives the
  fields.
- A call with only a section keeps the rules of a section move, as
  [Moves](sub-workspaces.md#moves) says. On a nested row, such a call
  still moves nothing, and its reply still gives the notice.
- Reason: one call then sets the whole place of a workspace. Each request
  that older tools send keeps its result.
- These ways were rejected (parent-move decision 1):
  - A section move of a nested row that ends its parent link. Reason: a
    request that older tools already send would get a new result. An agent
    that moves its own workspace would also leave its tree by accident.
  - A new tool, such as `set_workspace_parent`. Reason: two tools would
    then move a workspace. A parent change and a section move would also
    need two calls.
- Every member can make a parent change through an agent, as for a
  section move. The call acts for the sender of the turn, as
  [The rights of the sender](agent-tool-access.md#the-rights-of-the-sender)
  says. Reason: each write of the tools follows the rule of the app for
  its action.
- The app offers no way to make a parent change, as
  [The parent link](sub-workspaces.md#the-parent-link) says.

## The moved tree

- A parent change moves the workspace with each workspace nested under
  it, live or archived. Reason: a section move of a tree does the same, and
  the tree stays whole.
- The new parent can be any workspace of the org of the calling
  workspace, as for a create. It can also be an archived workspace.
  Reason: a create accepts an archived parent.
- An unknown parent, or a parent of another org, gets HTTP 404 with the
  error code `workspace_not_found`, as for a create.
- An archived moved workspace refuses the move with HTTP 409 and the error
  code `workspace_archived`, as a section move does.

## The place of the moved tree

- Under a new parent, the moved tree joins the section of that parent, as
  a new sub-workspace does. Each workspace of the moved tree, also an
  archived one, gets that section as its own section.
- When the call also names another section, the reply gives a `notice`.
  The notice says that the workspace joined the section of its parent, as
  [The section of a new sub-workspace](sub-workspaces.md#the-section-of-a-new-sub-workspace)
  says for a create.
- Reason: a create and a parent change then follow the parent in the same
  way.
- Among its new siblings, the moved workspace shows in the order of
  creation, oldest first, as each nested row does. Reason: sub-workspace
  decision 4 rejected a second order under a parent.
- At the top level, the moved tree goes to the top of the section that the
  call names. Without a section, it goes to the top of the section where
  its row showed. Reason: a section move and a new workspace also go to
  the top.
- A target equal to the current place changes nothing, and the row keeps
  its place. An example is the current parent as the target. Reason: a
  move to the current section does the same.
- After the move, [The place of a row](sub-workspaces.md#the-place-of-a-row)
  places each row of the moved tree, also under an archived parent.

## Refusals

- A refused parent change changes nothing (parent-move decision 3 A).
- A target inside the moved tree, or the moved workspace itself, gets HTTP
  409 with the error code `nesting_cycle`. Reason: the parent links would
  then make a loop.
- A target that puts a workspace of the moved tree past depth 3 gets HTTP
  409 with the error code `nesting_limit`. Its message names the deepest
  workspace of the moved tree, and the deepest depth that the parent can
  have. Reason: the agent can then choose a parent where the tree fits.
- The depth check covers each workspace of the moved tree, also an
  archived one. It counts each parent link above the target, also a link
  to an archived workspace. Reason: a Restore then never shows a row past
  depth 3.
- A call with two targets gets HTTP 400 with the error code
  `invalid_input`, as [Move a workspace](workspace-calls.md#move-a-workspace)
  says.
- Two moves, or a move and a create, that run at the same time never make
  a loop or a workspace past depth 3.
- Reason for the refusals: sub-workspace decision 3 B already chose an
  error past the depth limit. An error also tells the agent clearly that
  nothing changed.
- These ways were rejected (parent-move decision 3):
  - No move, and a `notice` that says why. Reason: an agent that reads
    only the workspace of the reply can miss that nothing moved.
  - A nest under the deepest workspace above the target where the tree
    fits. Reason: the workspace then goes to a place that no one asked
    for.

## The agents of the moved tree

- A parent change changes the parent and the depth of the moved
  workspace. It also changes the depth of each workspace under it.
- A session keeps the facts of its agent instructions.
  [The parent and the depth](agent-instructions.md#the-parent-and-the-depth)
  states what the instructions say about a move, and the accepted cost
  (parent-move decision 2 A).
