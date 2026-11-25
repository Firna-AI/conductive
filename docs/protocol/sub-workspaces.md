# Sub-workspaces

This doc holds the requirements and the decisions in force for
sub-workspaces. It covers the parent link, when to nest, the depth
limit, the section of a new sub-workspace, and the agent context. It
belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md).
[Workspace calls](workspace-calls.md) states the fields of the calls.
Linked pages cover [the nested rows of the list](sub-workspace-list.md),
with the place of a row and the moves of a tree, and
[parent changes](parent-changes.md).

The terms are those of the [architecture doc](../architecture.md#terms)
and the terms below. The [mockup catalogue](../mockups/catalogue.md) draws
the list at `app/sub-workspaces`, with the child pages `archived-parent`,
`drag`, and `menu`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
sub-workspace decision number, such as sub-workspace decision 4, names the
dated record of one decision of the change that adds sub-workspaces. Its
plan keeps these records while the change is open. Its pull request keeps
them after the merge. A nesting guidance decision number, such as nesting
guidance decision 1, names the dated record of one decision of the change
that says when to nest. The pull request of that change keeps its records.
A parent-move decision number names a decision of the change that adds
parent changes, as [Parent changes](parent-changes.md) says.

## Terms

- **Top-level workspace:** a workspace without a parent workspace.
- **Tree:** a top-level workspace with each workspace nested under it, at
  each depth.
- **Depth:** the number of parent links above a workspace. A top-level
  workspace has depth 0, and its sub-workspace has depth 1.
- **Nested row:** a row that the workspace list shows under the row of
  another workspace.
- **Top-level row:** a row that the workspace list shows at the top level
  of a section. It is the row of a top-level workspace, or of a
  sub-workspace with no live workspace above it.
- **Own section:** the section that a workspace itself names. A create, a
  move, and a section delete set it. The list can show a sub-workspace in
  another section.
- **Parent change:** a move that nests a workspace under a parent, or
  takes it out of its tree to the top level.

## The parent link

- Only a create call of the workspace tools sets the parent workspace of
  a new workspace, as
  [Create a workspace](workspace-calls.md#create-a-workspace) says.
- A create call without a parent makes a top-level workspace
  (sub-workspace decision 2 A).
- A default parent was rejected (sub-workspace decision 2). It nests the
  new workspace under the calling workspace when the call names no
  parent, with a flag to opt out. Reason: the user asked for a parent that
  the agent passes.
- So New workspace in the app and each run of an automation make a
  top-level workspace. The app offers no way to nest a workspace. Reason: the user
  asked for nesting by agents.
- The app also offers no way to change the parent of a workspace
  (parent-move decision 4 A). Move under and Move to top level in the menu
  of a row were rejected, and so was a drag of a row onto another row
  (parent-move decision 4). Reason: the user asked for parent changes by
  agents, and an app control needs its own design.
- The parent can be any workspace of the org of the calling workspace. It
  can be in any state, also archived, and of any repository.
- Reason: one job can span repositories. A refusal of an archived parent
  would add a rejection that no one asked for.
- An unknown parent, or a parent of another org, gets HTTP 404 with the
  error code `workspace_not_found`. Its message says that the parent
  workspace is not available.
- After the create, only a parent change changes the parent link, as
  [Parent changes](parent-changes.md) says (parent-move decision 1 A). No
  other call or action changes it, also not a section move, an Archive, a
  Restore, or Continue.

## When to nest

- The agent instructions and the create text of the workspace tools say
  when to nest a new workspace (nesting guidance decision 1).
- The agent nests a new workspace under the calling workspace when the
  work belongs to the task of the calling workspace. The cases are:
  - A part of a large task that can run in parallel.
  - Follow-up work that the task starts.
  - Work in another repository for the same task.
  - A change that needs its own pull request.
- The agent makes a top-level workspace for work that does not belong to
  the task.
- A workspace has one branch at a time. So each separate pull request
  needs its own workspace.
- When a member names the place of the new workspace, the agent follows
  the member. Reason: the cases are guidance, not a rule of the create
  call.
- At the deepest depth, the agent creates a sibling in place of a
  sub-workspace, as [The sibling advice](#the-sibling-advice) says.
- Reason for the cases: the user asked that agents group the workspaces
  of one task, and that agents split each separate pull request into its
  own workspace. Without the cases, the tools say only how to nest.
- The Worker does not check the cases. A create call with or without a
  parent works as before.

## The depth limit

- A sub-workspace can have sub-workspaces of its own, up to a fixed depth
  (sub-workspace decision 3 B).
- These ways were rejected (sub-workspace decision 3), because the user
  asked for nesting up to three levels deep:
  - One level, with each deeper workspace under its top-level workspace.
  - A refusal of each parent that has a parent.
- The deepest depth of a sub-workspace is 3 (sub-workspace decision 6 A).
  So a tree shows at most four levels: the top-level row and three nested
  levels.
- A deepest depth of 2 was rejected (sub-workspace decision 6). That
  reading counts the top-level workspace as the first of three levels.
  Reason: "nested up to 3 levels deep" measures the nesting, and a
  top-level workspace is not nested.
- Depth 3 is also the looser reading. So it blocks no work that the user
  expects to allow.
- The depth counts each parent link, also a link to an archived parent.
  Reason: a Restore then never shows a row past depth 3.
- A create call under a parent of depth 3 gets HTTP 409 with the error
  code `nesting_limit`. It makes no workspace.
- Its message names the parent by its number, and says that the parent is
  at the deepest depth. It then gives the
  [sibling advice](#the-sibling-advice), with the `parentId` of that
  parent.
- Reason: the input has the right form, but the depth of the parent
  refuses it. The message gives the ID to pass, so the agent can act on it
  at once.
- A parent change that puts a workspace past depth 3 gets the same error
  code, with a message of its own, as
  [Refusals](parent-changes.md#refusals) says.

### The sibling advice

- The sibling advice asks the agent to create a sibling in place of a
  sub-workspace of a workspace of depth 3. A sibling has the same parent
  as that workspace.
- So the create call of the sibling passes the `parentId` of that
  workspace.
- The name of the sibling starts with a one-word prefix that shows the
  group, such as "Limits: ".
- Reason: at depth 3, a narrow sidebar shows about 12 characters of a
  name. A longer prefix hides the part of the name that differs. A
  one-word prefix keeps the name prefix that the user asked for.
- The `nesting_limit` error of a create call and the
  [agent instructions](agent-instructions.md#what-the-instructions-hold)
  give the sibling advice.

## The section of a new sub-workspace

- A new sub-workspace joins the section of its parent (sub-workspace
  decision 4 F).
- A create call can also name a section. With a parent, that section has
  no effect.
- When the call names a section other than the section of the parent, the
  reply gives a `notice`. The notice says that the workspace joined the
  section of its parent.
- An unknown section still gets HTTP 404 with the error code
  `section_not_found`. Reason: the call keeps its checks, and an unknown
  ID is a mistake that the agent must see.
- A refusal of a create call that names a parent and a section was
  rejected. Reason: input that can be recovered gets a warning, and the
  call continues.

## The list

[The list](sub-workspace-list.md#the-list) states the nested rows, their
order, and when a collapsed section shows the open workspace.
[A queued workspace](sub-workspace-list.md#a-queued-workspace) shows only
in the Merge queue group, also while it is open (decision 318).

## The place of a row

[The place of a row](sub-workspace-list.md#the-place-of-a-row) states
where the list shows a sub-workspace.

### An archived parent

[An archived parent](sub-workspace-list.md#an-archived-parent) states the
rows of the live sub-workspaces of an archived workspace.

## Moves

[Moves](sub-workspace-list.md#moves) states the moves of a tree, and why a
nested row has none.

## Agent context

- The agent instructions of each new session say where the workspace is
  in its tree, how to nest a new workspace, and
  [when to nest](#when-to-nest) one.
  [What the instructions hold](agent-instructions.md#what-the-instructions-hold)
  lists these facts and this guidance.
- A parent change can make these facts old.
  [The parent and the depth](agent-instructions.md#the-parent-and-the-depth)
  says how the agent gets the current ones.
- [Workspace calls](workspace-calls.md) states the fields that give the
  parent, the depth, and the sub-workspaces of a workspace.
- The parent, the sub-workspaces, and the parent filter of the list reach
  only the workspaces of the org of the calling workspace, as
  [Reach](agent-tool-access.md#reach) says.
