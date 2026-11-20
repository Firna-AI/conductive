# The catalogue: the workspace menu and sub-workspaces

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/workspace-menu` and `app/sub-workspaces`,
with their child pages.

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
