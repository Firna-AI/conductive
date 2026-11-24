# The catalogue: the workspace menu, sub-workspaces, and the merge queue

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/workspace-menu`, `app/sub-workspaces`, and
`app/merge-queue`, with their child pages.

`app/workspace-menu` shows the menu of Apple Pay button, a row of the list
of Acme, at the pointer of a right click: Move to section, Reassign to,
Rename, Copy link, and Archive. Shift+F10 and the Menu key open it too,
and a phone layout opens it as a sheet. No row has a button for the menu.
The user chose the four actions that change the workspace on 9 November
2026, and added Copy link on 12 November 2026. Its child pages:

- `app/workspace-menu/move` has the sections beside the menu, with the
  current one checked. Its `general-only` variant has Acme with General
  only, whose menu has no Move to section.
- `app/workspace-menu/reassign` has the members beside the menu, with the
  owner checked. Its `archived` variant has the archived row of an admin,
  whose menu has only Reassign to and Copy link, while Restore stays on
  the row.
- `app/workspace-menu/rename` has the field of Rename in the row, with the
  name selected. Its `failed` variant keeps the draft in the field, under
  the toast of the list that names the failure.
- `app/workspace-menu/archive` has the list just after Archive from the
  menu, with no check and no question: the row in the collapsed Archived
  group, whose count holds the three workspaces of the last 14 days, and
  the toast with the day when the workspace leaves the list and Restore.
  Its `stopped` variant archives a
  stopped workspace at once too. Its `restored` variant has the list after
  Restore from the toast, with the workspace back in its section, stopped.
  `user-flows/archive-from-list` goes from the list through the menu and
  the toast to that Restore.
- `app/workspace-menu/roles` has the menu of a member who is not an
  admin, then her own workspace, her archived row, whose menu has only
  Copy link, and a suspended org, whose menus have only Copy link.

`app/sub-workspaces` draws sub-workspace decisions 1 C, 4 F, 5 C, and 6 A
of 13 and 16 November 2026: the create call of an agent can name a
parent, and the list shows the new workspace under the row of its parent,
in the sidebar and on the list page of a phone. Its canonical screen has
two trees in Checkout. The tree of Checkout address autocomplete goes down
to Rate limits at depth 3, the deepest level. Rate limits: Load test is the
sibling that the agent of Rate limits made under Places API client, with a
prefix in its name. Each level indents the row by one step, a neutral
guide line runs down from under the mark of each parent, and a tree has
no collapse control. `subWorkspaces` of the list states, from
`src/screens/subWorkspaceStates.ts`, draws the pages. Its child pages:

- `app/sub-workspaces/archived-parent` has the list after Cal archived
  Places API client, the middle row of the deepest tree, with the Archived
  group open. Its two sub-workspaces show under Address search API, the
  nearest live row above them, one step less indented than before.
- `app/sub-workspaces/drag` has the drag of the tree of Apple Pay button
  to General. The top-level row lifts with +2, the count of the rows that
  move with it, the tree stays faint in Checkout, and the line falls
  between two trees. Its `moved` variant has the list after the drop. Its
  `between-trees` variant has the drag of the deepest tree, with the line
  above the tree of Apple Pay button while the pointer is over its rows.
- `app/sub-workspaces/menu` has the menu of Places API client, a nested
  row, without Move to section. Its `member` variant has the menu of a
  member on the same row, with Rename and Copy link. Its `top-level`
  variant has the menu of the top-level row of the deepest tree, with Move
  to section and its sections, which move the whole tree.

`app/merge-queue` draws the Merge queue group that
[Merge queue](../protocol/merge-queue.md) states, from decisions 313 to 320 of 22 November 2026,
with the rows that Cal asked for in his review of the same day, and his
choice of that day that the user handles a failure. Its
canonical screen has the list of Acme with the group at the top, above the
sections. The group shows while a queue has entries, with one block for
each queue. Each row is a normal workspace row: its list mark, its name,
and its time, with no place number and no step under the name. A block
lists the layers of its stack from place 1, the bottom layer, which merges
first, and a thin neutral line joins their list marks. The mark shows the
GitHub state in its colour and running work with its motion, and the bar
names the place and the step. An entry that cannot merge keeps its place
on the line, with no label: Fix flaky cart test, place 2, shows its
failed checks with its red mark, and its bar says what the queue waits
for. The layer before it can still merge, and the layers after it wait
for it. Acme has one
queue, so the group names no repository. A queued workspace shows only in
the group (decision 318 D). `mergeQueue` of the list states, from
`src/screens/queueStates.tsx`, draws the pages, and
`src/screens/queueSpecs.ts` holds the queues of each state. Its child
pages:

- `app/merge-queue/steps` has the merge of the two bottom layers, whose
  marks stay green, while place 3 waits for its checks and place 4 failed
  its checks. Place 4 gets no fix turn from the queue, so it stays on the
  line with a still red mark, and the layers before it merge without it.
  Its `merged` variant has the list after that merge: the
  merged workspaces back in their sections with the mark of a merge, and
  the two other layers on the line from place 1 again. Its `empty` variant
  has the list after the last merge, with no group.
- `app/merge-queue/two-queues` has two blocks, acme/storefront and
  acme/billing-service, in the order of the repositories of the org. With
  two queues, each block names its repository, and each has its own line.
  Its `collapsed` variant has the group collapsed, with the count of its
  entries.
- `app/merge-queue/stack` has a member stack as one unit (decision 315 A):
  Saved carts on Checkout address autocomplete, at places 2 and 3, with no
  outline of their own, because the line already joins every entry. Its
  `drag` variant has the drag of the unit to place 1, with +1 on the lifted
  row and both rows faint in their place.
- `app/merge-queue/drag` has the drag of an entry to another place of its
  block, where the line opens for the drop line. Its `add` variant has a
  row of a section over the group, whose block takes the outline of a drop
  target, with the drop line after its last layer (decision 317 D). Its
  `zone` variant has the drop zone that the group shows during a drag
  between sections, while no queue has entries. Its `add-empty` variant has
  a row over that zone.
- `app/merge-queue/cannot-join` has a row whose pull request targets
  another branch over the group. The block takes a dashed outline in the
  neutral colour, with no fill and no drop line, and names the reason after
  its rows, so the drop does nothing. Its `write-access` variant has the
  reason for a member without write access to the repository. Its `zone`
  variant has the empty zone with the reason of a branch without a pull
  request. `joinRefusalText` in `queueCopy.ts` also gives the words of a
  default branch that needs GitHub's own merge queue, and of a repository
  that another org already queues. No page draws those two.
- `app/merge-queue/sub-workspaces` has a queued parent and a queued
  sub-workspace, whose sub-workspaces that are not queued move up a level,
  as for an archived parent. Its `left` variant has the trees after the
  parent left the queue.
- `app/merge-queue/menu` has the menu of a row with Add to merge queue
  after the line of the menu, before Archive. Its `queued` variant has the
  menu of a queued row, with Remove from queue and no Move to section, and
  the hover of the row with Archive over its time.

The other pages of the list draw no queue. The pages of the bar of a
queued workspace are in [the pull request bar](catalogue-bar.md).
