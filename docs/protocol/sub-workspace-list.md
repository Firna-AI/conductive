# Sub-workspaces in the list

This page belongs to [Sub-workspaces](sub-workspaces.md). It holds the
requirements and the decisions in force for the nested rows of the
workspace list, the place of a row under an archived or a queued
workspace, and the moves of a tree. The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Sub-workspaces](sub-workspaces.md#terms), which also defines the
sub-workspace and parent-move decision numbers. A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws the list at
`app/sub-workspaces`, and the queued workspaces at
`app/merge-queue/sub-workspaces`.

## The list

- The workspace list shows each live sub-workspace as a nested row under
  the row of its parent (sub-workspace decision 1 C). This holds in the
  sidebar and on the list page, in the desktop layout and in the phone
  layout. A queued workspace is the one exception, as
  [A queued workspace](#a-queued-workspace) says (decision 318).
- These ways were rejected (sub-workspace decision 1), because the user
  asked for nested rows in the list:
  - Sections only, with one section for each job.
  - A link only, where the workspace header names the parent.
- A tree has no collapse control. So each live sub-workspace shows while
  its section is open. Reason: the user asked that sub-workspaces always
  show.
- A collapsed section hides its trees. If it holds the open workspace,
  it shows that row, as [Sections](sections.md#sections) says. The row
  has no indent or guide lines because the other rows of its tree are
  hidden. The count includes each nested row because it says how many
  workspaces the section holds.
- The rows come in tree order: each top-level row, then the rows nested
  under it. Under each row, its nested rows come oldest first. Each nested
  row comes before its own nested rows.
- Reason for the order: the rows then show the order of the work.
- Each shown level indents a row by one step. The indent follows the rows
  that the list shows, not the depth. So a row under its grandparent
  indents one step less than its depth.
- The Archived group stays flat, the last archived first. Reason: an
  archived workspace does not work, so its tree tells a member little.
- The Merge queue group stays flat too, in queue order, as
  [A queued workspace](#a-queued-workspace) says.
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

### A queued workspace

- A workspace in the [merge queue](merge-queue.md) leaves its section, as
  an archived workspace does. It shows once, as a flat row in the Merge
  queue group, in queue order (decision 318). This changes sub-workspace
  decision 1 C for queued workspaces.
- So a queued sub-workspace shows only in the group, not in the tree of its
  parent.
- The live sub-workspaces of a queued workspace that are not queued show
  under the nearest live workspace above them that is not queued, by the
  rule of [An archived parent](#an-archived-parent). When the queued
  workspace leaves the queue, they go back under it.
- Reason: one placement rule then serves the Archived group and the Merge
  queue group. Sub-workspace decision 5 already rejected a row that shows
  twice.
- These ways were rejected (decision 318):
  - Each queued workspace as a flat row in the group, while its tree stays
    in its section with a mark of its place, such as "Queue 2". The
    workspace then shows twice.
  - A queued workspace that moves to the group alone, with the
    sub-workspaces of a queued parent nested under it in the group. A
    queued sub-workspace then leaves the tree of its parent.
  - Each queued workspace in its section with that mark, and a group only
    for a queued workspace whose tree is not queued.
- Marks in the sections with no group were left out, because the user
  asked for a group of its own.
- A sub-workspace that stacks on the branch of its parent joins with its
  parent, as one unit, as [Member stacks](merge-queue.md#member-stacks)
  says.

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
- A queued row moves only inside its block of the Merge queue group, as
  [Drags](merge-queue-in-the-app.md#drags) says. It has no Move to
  section, because it shows in no section.
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
