# Sub-workspaces

This doc holds the requirements and the decisions in force for
sub-workspaces. It covers the parent link, when to nest, the depth
limit, and the section of a new sub-workspace. It also covers the nested rows of the
workspace list, the place of a row, the moves of a tree, and the agent
context. It belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md).
[Workspace calls](workspace-calls.md) states the fields of the calls. A
linked page covers [parent changes](parent-changes.md).

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

- The workspace list shows each live sub-workspace as a nested row under
  the row of its parent (sub-workspace decision 1 C). This holds in the
  sidebar and on the list page, in the desktop layout and in the phone
  layout.
- These ways were rejected (sub-workspace decision 1), because the user
  asked for nested rows in the list:
  - Sections only, with one section for each job.
  - A link only, where the workspace header names the parent.
- A tree has no collapse control. So each live sub-workspace shows while
  its section is open. Reason: the user asked that sub-workspaces always
  show.
- A collapsed section still hides its whole tree, except the row of the
  open workspace, as [Sections](sections.md#sections) says. That row then
  shows with no indent and no guide lines, because the list shows no other
  row of its tree. The count of a collapsed section counts each nested row
  too. Reason: the count says how many workspaces the section holds.
- The rows come in tree order: each top-level row, then the rows nested
  under it. Under each row, its nested rows come oldest first. Each nested
  row comes before its own nested rows.
- Reason for the order: the rows then show the order of the work.
- Each shown level indents a row by one step. The indent follows the rows
  that the list shows, not the depth. So a row under its grandparent
  indents one step less than its depth.
- The Archived group stays flat, the last archived first. Reason: an
  archived workspace does not work, so its tree tells a member little.
- The command palette stays flat, and its rows name no parent. Reason: a
  search finds a workspace by its name or its number.
- Open workspace 1 to 9, Previous workspace, and Next workspace count each
  nested row, in tree order. They follow the rows that the list shows, as
  [Where a command runs](keyboard-shortcuts.md#where-a-command-runs) says.

## The place of a row

- The parent link alone decides the nesting (sub-workspace decision 4 F).
  A live sub-workspace shows under its parent wherever the list shows the
  parent, whatever its own section is.
- Reason: the parent link then keeps each tree whole on every path, with
  no refusal.
- A sub-workspace that keeps its own section was rejected (sub-workspace
  decision 4). It shows under its parent only while both have the same own
  section, and at the top level in another section. Reason: a tree can then
  show in two sections.

### An archived parent

- An archived workspace shows only in the Archived group. So no section
  shows the row of an archived parent.
- A live sub-workspace whose parent is archived shows under the nearest
  live workspace above it in its tree (sub-workspace decision 5 C). Its own
  nested rows stay under it.
- When no live workspace is left above it, it shows as a top-level row of
  its own section.
- These rows take the place of the archived row, oldest first, and no
  other row moves. At the top level, they take the place of the archived
  top-level row among the top-level rows of its section.
- A Restore of the parent puts them back under the parent.
- Reason: no work stops, and each tree stays as whole as its live rows
  allow. The rows stay where the member saw them, and a Restore puts the
  archived row back with no jump.
- These ways were rejected (sub-workspace decision 5):
  - The rows at the top level of their section. An archived middle row
    then splits its tree.
  - An Archive of the parent that also archives each workspace under it.
    It stops their cloud computers and can stop running work. The
    sub-workspaces then do not act like normal workspaces.
  - A faint row of the archived parent in its section. The workspace then
    shows twice, in its section and in the Archived group.
- A refusal to archive a parent with live sub-workspaces was rejected too.
  Reason: Archive works in each state of a workspace.

## Moves

- A move of a top-level row moves its workspace with each workspace nested
  under it, live or archived (sub-workspace decision 4 F). So the move of
  the row of a top-level workspace moves its whole tree.
- This holds for a drag, a long press on a phone, Alt with Up or Down, Move
  to section, and `move_workspace`.
- Reason for the archived workspaces: a Restore of one of them then puts it
  back in the section of its tree.
- The places of a section count only its top-level rows. A nested row
  takes no place of its own. So a drag drops a tree only before a
  top-level row or after the last tree.
- A nested row has no drag, no move by keys, and no Move to section. A
  long press on a nested row does nothing. Reason: the tree then stays
  whole in one place.
- `move_workspace` with only a section, on a workspace that the list shows
  as a nested row, moves nothing. The nesting adds no refusal, and the
  other checks of the call stay. Its reply gives the workspace in its
  section, and a `notice`.
- The notice names the workspace to move instead: the workspace of the
  top-level row that the nested row shows under.
- The notice names no target of a parent change. The description of
  `move_workspace` and the help of the CLI teach the targets. Reason:
  older tools cannot send a target.
- This rule is option E of sub-workspace decision 4, which option F and
  parent-move decision 1 A keep. Risk: an agent that reads only the
  section of the reply can miss that nothing moved.
- `move_workspace` with a target changes the parent of the workspace, also
  on a nested row, as [Parent changes](parent-changes.md) says.
- The top-level row of a sub-workspace moves like any top-level row. After
  a Restore of a workspace above it, the row shows under the nearest live
  workspace above it, as [An archived parent](#an-archived-parent) says.
  So that Restore undoes the move.
- These ways were rejected (sub-workspace decision 4):
  - A refusal of `move_workspace` on a nested row, with HTTP 409 and the
    error code `workspace_nested`. It adds a refusal, and it keeps a tree
    whole only on the paths that it closes.
  - A move of the whole tree from each of its rows, also a nested row. An
    agent that moves its own workspace would then move the work of other
    agents.
  - A reorder of a nested row among the rows under its parent, by drag or
    by keys. It needs a second order under each parent, in each move and
    in each drop.
- Sub-workspace decision 4 also rejected a move that ends the parent link.
  Parent-move decision 1 A supersedes that rejection: a move ends or
  changes the parent link when the call names a target. The rejected
  alternatives of that decision are in
  [The target](parent-changes.md#the-target).

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
