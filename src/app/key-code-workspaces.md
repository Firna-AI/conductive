# Key code: the workspace list and the workspace models

This page is part of the [web app guide](README.md), beside
[Key code](key-code.md). It names the entry points of the workspace list,
with its rows, its menus, Archive, and Restore. It also names the models of
an open workspace and of New workspace, and the store of a connected view.
It names the repository changes, their readiness, and the readers of the
parts of an org too.
Each path is relative to `src/app/`, the folder of this page.
[Life of a workspace](../../docs/protocol/workspace-life.md) gives the
rules of Archive and Restore.

- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group. `groupWorkspaces`
  places the rows of each section with `placeWorkspaces` of
  `../shared/workspace-tree.ts`, and `moveWorkspace` moves the tree of a
  top-level row. `groupWorkspaces` takes the time of the list and leaves
  out each removed workspace. `list-trees.ts`: `ListRow`, a placed row,
  `treeOf` and `treeRows`, the trees of a section, and `replaceWorkspace`,
  which gives the place of an archived workspace to the live rows under
  it, as the Worker does. `workspace-removal.ts`: `listEndOf`, the end of
  Restore of an archived workspace from its `archivedAt`, and
  `listedWorkspaces`, which the list, its counts, and the palette share.
  `sections.test.ts` and `archive-overlay.test.ts` check the trees of a
  section, their moves, and an Archive of a parent.
- `merge-queue.ts`: the merge queue as the list reads it. `queueBlocks`
  gives the blocks of the Merge queue group, `queueUnits` the units of a
  block, and `queueStep` and `unitBefore` the places of a move by keys or
  by a drop. `merge-queue-join.ts`: `joinCheck`, whether a row can join,
  with the reason of a refusal, `mayRemove`, and `queueMenuAction`, the
  queue item of a menu. `merge-queue-changes.ts` gives the changes that a
  write shows at once, and `merge-queue-actions.ts` the writes of Add,
  Remove, and a move, which read the list again after their answer and
  count in `OrgModel.queueWrites`. `merge-queue.test.ts`,
  `merge-queue-groups.test.ts`, and `merge-queue-actions.test.ts` check
  the blocks, the join rule, the placement of decision 318, the writes,
  and their rollback.
- `workspace-actions.ts`: `OrgModel.workspaceActions`, the Rename write,
  owner-only confirmation, the Archive and Restore flows of unopened rows,
  and `running`, the Archive or the Restore that runs for each workspace.
  `list-changes.ts` confirms only the fields of each action. The reply of
  Archive or Restore changes the row only when its `updatedAt` is newer.
- `../shell/workspace/shown-workspaces.ts`: `ShownWorkspaces.rename`,
  `reassigned`, and `archive` use a kept model when one exists. They open
  no workspace and create no model for an unopened row.
- `../shell/workspace/useArchiveActions.ts`: `useArchiveActions`, Archive
  and Restore for each control, with their toasts. The toast of a done
  Archive gives the day when the workspace leaves the list, and offers
  Restore only while the workspace can come back.
- `deadlines.ts`: `usePassedDeadlines`, which renders a screen again at
  each deadline, such as the last day of a Restore, through the clock and
  the timers of `AppServices`. `useListTime` gives the time of a screen
  that shows the list or a count of it, and renders it again when a
  workspace leaves the list.
- `../shell/list/`: the workspace list. `WorkspaceRow.tsx` draws a row,
  with its Archive shortcut over the time on hover, and the Rename field
  of `WorkspaceNameField.tsx`. Its list mark is the shared `WorkspaceMark`,
  with the words of `listMarkLabel`. A right click or the menu keys open the menu
  of a row. `useRowMenus.tsx` gives each row the actions that the person
  can use, from the shared `workspaceMenuItems`, and draws the open
  `RowMenu.tsx`. Every row offers Copy link, which copies `workspace.link`
  through `AppServices.copy` and gives its result in a toast. The Archive shortcut and Archive in the menu share one
  flow, `ShownWorkspaces.archive`, so a second press while it runs sends
  nothing. A row of the Archived group shows its Restore shortcut over the
  time on hover until the last day of Restore.
  `SectionHeader.tsx` draws a section header with its menu and Rename
  section. `useListActions.ts` runs the list changes, with a toast for a
  failure. `MergeQueueGroup.tsx` and `QueueBlock.tsx` draw the Merge queue
  group, `useQueueGroup.tsx` and `useQueueDrag.ts` give it its rows and
  the drag of its entries, with the boxes of `queue-layout.ts`, and
  `useListQueue.ts` its facts and its writes, each with a toast for a
  failure. `useRowMoves.ts` moves a focused row by keys. `row-queue.ts`
  puts the queue item in a menu, and `RemoveQueueDialog.tsx` asks before
  Remove from queue. `MergeQueueGroup.test.tsx` and
  `RowQueueMenu.test.tsx` check the group, its drags, its keys, and the
  queue items of the menus. `RowContent.tsx` draws the content of a row and the indent of
  a nested row. `RowDrop.tsx` draws the drop line and the lifted row of a
  tree, with the count of its nested rows. `SectionTrees.test.tsx` and
  `TreeDrag.test.tsx` check the trees of the list, their keys, and their
  drag, with the helpers of `row-drag-test-kit.ts`.
  `RowMenu.test.tsx`, `RowMenuAccess.test.tsx`,
  `RowActions.test.tsx`, `RowArchive.test.tsx`, `RowRename.test.tsx`, and
  `RowCopyLink.test.tsx` mount the whole app.
  [Workspace menu](../../docs/protocol/workspace-menu.md) states the menu
  of a workspace row.
- `../shell/ui/Menu.tsx`: `MenuButton`, the menu of the shell, a sheet on
  a phone. With `besideOnPhone`, as each model picker gives it, a phone
  opens it beside its button too. `OpenMenu.tsx` draws the open menu on
  `PopoverSurface.tsx`, in the top layer, which places it beside its button
  with the dropdown placement of `@firna/ui`, and flips it when it does not
  fit. The member menus use the same surface. `OpenMenu` also shows the
  choices of an item with a submenu, such as All models: beside the menu,
  or in its place with Back in the phone layout and in a sheet.
  `submenu.tsx` holds the open submenu, its focus, and its layer beside the
  menu, which the menu of the chat shares. `MenuList.tsx` draws the rows of
  `menu-items.tsx`, also a switch row, such as Fast in the model menu,
  which keeps the menu open, and an item that shows choices. While the
  owner of a `MenuButton` saves a change, its `busy` state turns off the
  trigger and the items, switches, and submenu items of the open menu.
  These rows keep the focus, and the menu stays open.
- `../shell/ui/ModelPicker.tsx`: the model picker of New workspace, of the
  default of new workspaces, of an automation, and of each Favourites row.
  It draws the rows of `modelMenuRows` of the chat, with the favourites
  that its owner gives, as `MenuButton` entries.
  `PointMenu.tsx` draws a menu at a point above the page, with its
  choices beside it, and `menu-place.ts` keeps both inside the window.
  `menu-keys.ts`: `opensMenu`, the menu keys of a row and of a tab.
- `workspace-model.ts` and `archive-model.ts`: an open workspace, its
  `startError` and `reassigned`, and Archive and Restore, each with one
  request. `WorkspaceModel.renamed` takes the confirmed name into the kept
  detail. `workspace-detail-order.ts`: `DetailOrder`, the order of the
  detail: its read and Resume replies, its stream, its local changes,
  which stay over pending replies, and the Archive and Restore records of
  the list. `workspace-detail.ts` maps the stream, Archive, and Restore
  records to the detail. `olderAcrossArchive` orders the two sides of an
  Archive by `updatedAt`, and `archiveFloor` keeps each record from before
  the newest Archive or Restore out, on both sides.
  `workspace-activity.ts` counts input reports through `WorkspaceActivity`.
- `workspace-read-marks.ts`: `WorkspaceReadMarks`, the read marks of one
  kept workspace model, with its shown and confirmed numbers. They stop
  while the workspace is archived, and go again after a Restore.
- `new-workspace-model.ts`: the first message that creates a workspace.
  `NewWorkspaceModel.filesSource` is the `FieldFiles` of its draft.
  `attach` gives the IDs of a pick at once, `setText` takes each new text
  of the field, and `retryFile` is Try again. `attach` also keeps the
  names that it refuses, as
  [Refused files and folders](../chat/draft-files.md#refused-files-and-folders)
  says.
- `new-workspace-request.ts`: `createRequest`, the create request of a
  draft, with its start branch and base branch, its Capabilities choices,
  and its first message.
- `new-workspace-marks.test.ts` checks the IDs at once, the words outside
  the chips, and the mentions in the order of the chips. It also checks
  undo of a ready file, stopped and queued uploads, a Remove while the
  start call or the complete call of a file waits, a sign-out, and the
  text that a create took. `new-workspace-refusals.test.ts` checks folder
  names with no files, an empty pick, a file with no bytes, a sign-out,
  and a failed create.
- `repository-changes.ts`: the saved repository changes that the org
  image lacks, from `BuildsResponse.changes`. `repositoryWaitOf` gives
  their state, `repositoryChangesOf` the changes of the repository
  notice, and `changeWaits` whether the build history stays closed. For
  New workspace, `waitsForBuild` says whether a repository waits, from its
  `ready`, else from the builds. `imageReadyOf` says whether the
  repositories reply shows a good image, and `waitingRepositoriesOf` gives
  the waiting repositories. `../shell/settings/RepositoryChangeNotice.tsx`
  draws the notice of an admin, and `../members/RepositoryNotice.tsx` the
  notice of a member.
- `org-refresh.ts`: `orgRefreshers`, the reader of each part of
  `OrgModel`. The reader of the repositories also reads them again after a
  build ends or the image changes, as [Data lifecycle](data-lifecycle.md)
  says.
- `creations.ts`: `Creations`, the life of the create requests of an org in
  this tab, which a sign-out ends. `first-start.ts`: `failedFirstStart`,
  which tells a failed first start, and `resumesAtOpen`.
- `workspace-store.ts`: `useWorkspaceStore`, which gives a connected view
  the store of its workspace, and the `create` and `connect` functions that
  the view supplies.
- `workspace-store.test.tsx`: mounts the real hook with logged test stores in
  happy-dom. It checks the connection after the render and the stop at
  unmount. It checks that a switch stops the old store before the new one
  connects, and shows only the new store. It also checks when the hook keeps
  a store, connects it again, or makes a new one.
