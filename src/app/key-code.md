# Key code

This page is part of the [web app guide](README.md). It names the files,
the types, and the functions of the web app that a reader opens first.
Each path is relative to `src/app/`, the folder of this page.

- [Shortcuts](shortcuts/README.md): the pure command registry, keyboard
  defaults, browser keys, account keymap, conflicts, and press decision.
  The [shortcut layer](../shell/shortcuts/README.md) calls it for each key
  of the page.
- `services.ts`: `windowHost` detects the web host, and `windowNewTab`
  opens a page of another site in a new tab, as a link with
  `target="_blank"` and `rel="noreferrer"` does. `live-services.ts` and
  `dev/fake-services.ts` supply them with the keyboard and key events.
- `dev/org-routes.ts` creates orgs and starts their first simulated build.
  `dev/build-routes.ts` runs builds and the added build after the first image.
  `dev/settings-routes.ts` saves settings and repository choices.
- `dev/waitlist-routes.ts`: the waitlist of the person signed in, and
  `admitOpenSignup`, which gives app access during open sign-up before each
  request. `dev/signup-routes.ts`: the pause and the waitlist switch of
  the operator section. `dev/seed.ts` turns the waitlist off for
  `?waitlist=off`.
- `dev/attachment-routes.ts`: the upload routes of both composers, which
  keep the bytes of each upload. `dev/attachment-files.ts`:
  `attachmentFiles`, the private store of those bytes and of their copies,
  and `attachmentFileRoutes`, the content and download routes of the
  copies. Its `readCopiedFile` gives the same reads to the development
  page of the chat. `dev/attachment-message-routes.ts`:
  `attachmentMessageFetch`, the reply of a send of uploaded files.
  `dev/attachment-files.test.ts` drives them through `createFakeServices`,
  the chat API, and the file client.
- `api/client.ts`: the JSON client and `ApiError`. The client also gives
  its `fetch`, for a feature client that reads its own replies, so the web
  app and the Mac app keep their transport. Its `sendPart` sends a raw part
  of a file with `PUT` through the file transport of the services:
  `api/xhr-files.ts` in the browser and in the Mac app.
  `api/read-*.ts`: the readers.
  [api/read-shortcuts.ts](api/read-shortcuts.ts) reads both shortcut keyboards and
  the reply of a shortcut save with the shared reply readers. A malformed
  account structure remains an `invalid_response` error from the API
  client.
- `clipboard.ts`: `copyText`, the clipboard write for plain or pending text.
  It starts a pending `ClipboardItem` write during the user press when the
  browser supports it. The fallback waits for the text and calls `writeText`.
  Both paths propagate failures. `AppServices.copy` accepts a string or a
  promise of a string. Live services and development hosts use this owner.
- [Key code: drafts and attached files](key-code-drafts.md) names the
  entry points of the draft text, the attached files, and their uploads,
  which the chat and New workspace share.
- `replay-socket.ts`: `replaySubscribe`, the raw event stream of a feature
  store over the event source of the app, with the reconnect rules of
  [Data lifecycle](data-lifecycle.md).
- `app-model.ts`: the session, the orgs, the models list, Get started,
  `putOrg`, which takes a confirmed org record, `moveOrg`, which moves an
  org in the person's own order, and `admit`, which opens the app when app
  access arrives. `boot.ts`: `Boot`, the states of the first load, and
  `readShared`, what every screen of the app shares.
- `org-list.ts`: `OrgList`, the orgs of the person in their own order, as
  `AppModel.orgs` gives them: the list that the server confirmed, then the
  moves that wait for their answer.
- `org-writes.ts`: the requests of `AppModel.createOrg` and
  `AppModel.renameOrg`, each of which reads the org record from its answer.
- `waitlist-model.ts`: `WaitlistModel`, the screen of a person who waits:
  the use of a code from the field or a join link, the invitations with
  Accept, and the read of the app access at each return to the page.
  `waitlist-state.ts`: what the screen shows, and the reason of each
  refused code. `api/read-waitlist.ts`: the readers of the session and the
  waitlist state, which requires `waitlistOn`.
- `../shell/waitlist/`: `Waiting`, which runs a join link and the read at
  each return, `WaitlistScreen`, the code field, and the invitations.
  `../shell/auth/SignInFrame.tsx`: the frame that the sign-in, the sign-in
  of a join link, and the waitlist share. `../shell/layout/Alone.tsx`: a
  page without the rail, and the wait of the first load.
- [waitlistCopy.ts](../../docs/mockups/src/screens/waitlistCopy.ts) and
  [inviteCodeCopy.ts](../../docs/mockups/src/components/settings/inviteCodeCopy.ts):
  the words of the waitlist and of the invite code that the app and the
  mockups share.
- `invitations-model.ts`: `InvitationsModel`, the pending invitations,
  Continue to workspaces, and Accept invitation.
  `api/read-invitations.ts`: their readers.
- `get-started.ts`: the order and the states of the steps of Get started.
  `setup-steps.ts`: `setupSteps`, the steps that the screens show, and
  `setupOrg`, the org of Get started and of the address `/`.
- [getStartedCopy.ts](../../docs/mockups/src/screens/getStartedCopy.ts): the
  setup text that the app and mockups share.
- `org-model.ts`: the sections, workspaces, repositories, builds, members,
  routines, and computer settings of one org, with `watch`. `org-waits.ts`
  gives the wait of each part, such as `workspacesWait`.
  `OrgModel.startBuild` sends Build computer and Try again for each screen
  that offers them.
- `first-build.ts`: `firstBuildOf` and `useFirstBuild`, the state of the
  first build of an org from its builds, which Get started and New
  workspace show until the org has a good image. `changedScriptNotice`
  gives the words of the notice of a changed install script, which the
  Cloud computer tab of an admin and of a member show.
- `api/read-routines.ts`: the readers of the routines, each with its newest run, and of one routine. `api/read-routine-runs.ts`: the readers of the runs.
- `routine-model.ts`: `RoutineModel`, one routine with its reads, its
  saves, and its runs, and `routineModel`, the model that the org keeps for
  each routine. Its `client` sends the other requests of the routine page,
  and a `routine_not_found` from any of them reads the routine again.
  `routine-actions.ts`: create, update, Turn off, Delete, and Run now,
  which also update the Routines list.
- `routine-runs.ts`: `RoutineRuns`, the Runs list of one routine: the
  pages that it shows, which each read gets again from the newest run
  while the page shows them, Show older runs, which adds a page, and Run
  now.
- `routine-draft.ts`: the draft of the routine page, the equality of each
  of its fields, its create and update requests, and whether Save can send
  it. `routine-triggers.ts`: the
  defaults of a new trigger and the edits of an author filter.
  `routine-cron.ts`: the rule of a custom cron, which the Worker applies
  too.
- `repository-changes.ts`: the saved repository changes that the org
  image lacks, from `BuildsResponse.changes`. `repositoryWaitOf` gives
  their state, `repositoryChangesOf` the changes of the repository
  notice, `waitingRepositoriesOf` the waiting repositories of New
  workspace, and `changeWaits` whether the build history stays closed.
  `../shell/settings/RepositoryChangeNotice.tsx` draws the notice of an
  admin, and `../members/RepositoryNotice.tsx` the notice of a member.
- `account-model.ts`: the agent logins with their share setting, the
  default model, the New workspace view, the shortcut changes of each
  keyboard, the GitHub App installations, and the repositories that
  Create org offers. `saveShortcuts` saves one batch of changes for one
  keyboard and keeps the confirmed changes of the reply. The save of an own endpoint
  login and `refreshModels` read the account again for the model list of
  the endpoint, which only the account holds. A later change of the same
  login makes that read old, so it does not show. A screen watches the
  installations: they read at once, and again with the steps of Get started
  each time that the user comes back to the page. It also reads the
  waitlist state for the invite code of the account.
  `../shell/account/InviteCodeSection.tsx`: that invite code, in each
  state of the code, of the pause, and of open sign-up.
  `startCodexSignIn` and `pollCodexSignIn` send the requests of the
  ChatGPT sign-in of Codex. `../shell/account/codex-sign-in.ts`:
  `CodexSignIn`, the steps, the polls, and the timer of that sign-in.
  `api/read-core.ts`: `loginUsable`, whether turns can run on a login.
- `panels.ts`: `PanelLayout`, the widths of the panels, whether the right
  column shows, and `next`, the one rule of their steps.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes, and the errors that prove that the value no longer
  exists. `refresh.ts`: `Refresher`, the shared reads of a part while
  screens show it, and `reread`, a read that starts after a refusal.
- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group.
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
  Archive offers Restore only while the workspace can come back.
- `deadlines.ts`: `usePassedDeadlines`, which renders a screen again at
  each deadline, such as the last day of a Restore, through the clock and
  the timers of `AppServices`.
- `../shell/list/`: the workspace list. `WorkspaceRow.tsx` draws a row,
  with its Archive shortcut over the time on hover, and the Rename field
  of `WorkspaceNameField.tsx`. Its list mark is the mockups' `WorkspaceMark`,
  with the words of `listMarkLabel`. A right click or the menu keys open the menu
  of a row. `useRowMenus.tsx` gives each row the actions that the person
  can use, from `workspaceMenuItems` of the mockups, and draws the open
  `RowMenu.tsx`. Every row offers Copy link, which copies `workspace.link`
  through `AppServices.copy` and gives its result in a toast. The Archive shortcut and Archive in the menu share one
  flow, `ShownWorkspaces.archive`, so a second press while it runs sends
  nothing. A row of the Archived group shows its Restore shortcut over the
  time on hover until the last day of Restore.
  `SectionHeader.tsx` draws a section header with its menu and Rename
  section. `useListActions.ts` runs the list changes, with a toast for a
  failure. `RowMenu.test.tsx`, `RowMenuAccess.test.tsx`,
  `RowActions.test.tsx`, `RowArchive.test.tsx`, `RowRename.test.tsx`, and
  `RowCopyLink.test.tsx` mount the whole app.
  [Workspace menu](../../docs/protocol/workspace-menu.md) states the menu
  of a workspace row.
- `../shell/ui/Menu.tsx`: `MenuButton`, the menu of the shell, a sheet on
  a phone. On desktop it opens on `PopoverSurface.tsx`, in the top layer,
  which places it beside its button with the dropdown placement of
  `@firna/ui`, and flips it when it does not fit. The member menus use the
  same surface. `MenuList.tsx` draws the items, also a switch row, such as
  Fast in the model menu, which keeps the menu open, and an item that shows
  choices. While the owner of a `MenuButton` saves a change, its `busy`
  state turns off the trigger and the items and switches of the open menu.
  These rows keep the focus, and the menu stays open.
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
- `suspension.ts` and `permissions.ts`: the suspension of an org, the
  client that reports its refusals, also the replies of its fetch, and the
  rules of what a person may change.
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
- `new-workspace-marks.test.ts` checks the IDs at once, the words outside
  the chips, and the mentions in the order of the chips. It also checks
  undo of a ready file, stopped and queued uploads, a sign-out, and the
  text that a create took. `new-workspace-refusals.test.ts` checks folder
  names with no files, an empty pick, a file with no bytes, a sign-out,
  and a failed create.
- `creations.ts`: `Creations`, the life of the create requests of an org in
  this tab, which a sign-out ends. `first-start.ts`: `failedFirstStart`,
  which tells a failed first start, and `resumesAtOpen`.
- `computer-model.ts`: the scripts, the env vars with their Secret marks,
  the builds, and the log. `classifyEnvVar` changes only the mark of a
  variable, and sends no value. `replaceEnvVar` changes only the value,
  and sends no mark, so the Worker keeps the stored mark. `setEnvVar`
  sends a value and a mark, for Add variable.
- `../shell/settings/EnvVarsSection.tsx`, `EnvVarForms.tsx`, and
  `EnvVarMark.tsx`: the env var editor of an admin. The Secret switch of a
  row saves its mark at once, and Add variable starts secret. A new value
  sends no mark, so it keeps the stored mark, also a mark that a save of
  the switch changed after its form opened. The switch, Change, and Delete
  of a row wait while one of them saves.
- `build-log-follower.ts`: `BuildLogFollower`, the reads and the timer of
  the log of one build.
- `events.ts`: the ordered event stream, its count of reconnects, the event
  socket, and `openSocket`, the terminal socket on the same origin as the
  events.
- `workspace-store.ts`: `useWorkspaceStore`, which gives a connected view
  the store of its workspace, and the `create` and `connect` functions that
  the view supplies.
- `workspace-store.test.tsx`: mounts the real hook with logged test stores in
  happy-dom. It checks the connection after the render and the stop at
  unmount. It checks that a switch stops the old store before the new one
  connects, and shows only the new store. It also checks when the hook keeps
  a store, connects it again, or makes a new one.
- `pointer-drag.ts`: `usePointerDrag`, the drag and drop of any pointer
  that the tab row of the chat, the workspace list, the org rail, and the
  org switcher use: the press, the start after a move of a mouse or a long
  press of a finger, Escape, the click after a drag, the scroll lock of
  touch, and a new drop place after a scroll under a still pointer. A menu
  event ends the press of a mouse and keeps the press of a finger.
  `cancel` does what Escape does, for an owner whose layer takes Escape
  first, such as the sheet of the org switcher. `ownPress` keeps a press
  on a control inside a dragged element, such as Close or Archive, for
  that control, and `isOwnPress` says whether a control kept a press.
  `longPress` and `touchSlop` are the hold of a finger and how far it
  moves first.
  `next-click.ts`: `stopNextClick`, which stops the click that ends a drag
  wherever it lands, also the late click of a finger.
  `pointer-drag.test.tsx` mounts the hook in happy-dom.
- `long-press.ts`: `useLongPress`, the long press of a finger that opens a
  menu where nothing drags, such as a tab of a read-only row. It holds as
  long and allows as small a move as the drag. It ignores a press that a
  control keeps, and stops the click after a hold. A mouse and a pen bind
  nothing. `../chat/components/TranscriptCopy.dom.test.tsx` checks it
  through the tab row of a read-only chat.
  `../shell/list/useRowDrag.ts`: the drag of a workspace row to a place in
  a section, on `usePointerDrag`.
- `../shell/orgs/useOrgDrag.ts`: the drag of an org in the rail and in the
  org switcher of a phone, on `usePointerDrag`. `../shell/orgs/useOrgMove.ts`:
  the move with the toast of a failed save.
  `../shell/layout/useRailOrder.ts`: the drag, the tile menu
  (`useTileMenu.tsx`), and Alt and Up or Down (`useRailMoves.ts`) of the
  org tiles. `../shell/list/OrgSwitcherSheet.tsx`: the org switcher, where
  a long press lifts an org.
- `sideways-wheel.ts`: `useSidewaysWheel`, which turns a
  vertical wheel turn over a row that scrolls sideways into a sideways
  scroll of the row. A sideways swipe and a turn with Ctrl stay with the
  browser, and so does a turn past an end of the row. The tab row of the
  chat uses it, and any row that scrolls sideways can.
- `file-drags.ts`: `carriesFiles`, whether a drag carries files,
  `droppedItems`, the files and the folders of a drop in their order, by
  the entry of each item, and `intakeOf`, which turns each folder into its
  zip. `folder-zip.ts`: `zipFolder`, the zip of one dropped folder in the
  browser, with `fflate`, which stops at the size limit of an attachment.
  It moves the compressed bytes into blobs of about 8 MiB, so the page
  never holds the whole zip.
  `folder-entries.ts`: the parts of a dropped entry that the zip reads. `useFileDropGuard` cancels each drag of files that no part
  took, so the browser opens no file in place of the page. `App` and the
  chat development page mount it. The composer drop and the
  `useScreenshotDrop` of Feedback share `carriesFiles`.
- `operator-read.ts`, `operator-directory.ts`, and `operator-target.ts`:
  the Overview and the pages of the operator section, its searches, and
  Suspend and Lift. `operator-pause.ts`, `operator-switch.ts`, and
  `operator-access.ts`: the pause of sign-ups, the waitlist switch,
  Approve, New code, and Disable. A refusal with
  `operator_required` marks the account as not an operator.
  `api/read-operator.ts`, `api/read-operator-pages.ts`, and
  `api/read-operator-waitlist.ts`: their readers. The
  [operator section](../shell/operator/README.md) gives the screens.
- `router.ts` and `navigation.ts`: the addresses of the screens.
  `routeOf` gives the screen of an address, and `useRoute` the screen of
  the current one. A session address, built by `sessionAddressPath` of
  `../shared/session-link.ts`, gives the workspace route with its
  `session`, which the workspace screen shows before it replaces the
  address.
- `kept-org.ts`: `keptOrg`, the org of a page without one: the org that
  the tab opened last, from `AppModel.lastOrg`, or else the first org that
  is not deleted.
- `last-workspaces.ts`: `LastWorkspaces`, the last workspace page of each
  org of the person, which the browser keeps, as
  [Opening an org](../../docs/protocol/org-rail-order.md#opening-an-org)
  says. `AppModel.lastWorkspaces` follows the person signed in.
  `orgEntry` gives the page that opens an org: the org tile and its keys
  (`../shell/orgs/useOrgEntry.ts`) and the palette's Switch to rows use
  it. `startPage` gives the page of `/`. The workspace screen
  remembers and forgets its workspace through
  `../shell/workspace/remember-workspace.tsx`.
- [Key code: the palette, the layers, and the dialogs](key-code-layers.md)
  names the entry points of the command palette, the layers of each
  frame, New workspace as a dialog, and feedback with its screenshots.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
- `../shell/routines/RoutinesScreen.tsx`: the Routines page, which the
  Routines link of the sidebar and of the phone list opens.
  [Routines](../../docs/protocol/routines.md#the-routine-pages) states what
  it shows.
- `../shell/routines/RoutineScreen.tsx`: the routine page and the page of
  a new routine. `RoutineEditor.tsx` is the form of the owner, and
  `RoutineReader.tsx` the read-only view of every other member, with Turn
  off and Delete for an admin. `useRoutineSave.ts` is Save, with the login
  that a save refused. `RoutineFrame.tsx` puts the Runs list beside the
  form on desktop, and on the Runs tab of a phone. It alone shows the
  notice of a suspended org, in every view of the page. `RoutineNote.tsx`
  is the note above a routine, which reads the saved repository from the
  repository list of the org.
- `../shell/routines/RunsPanel.tsx` and `RunList.tsx`: the Runs list, with
  the mark, the state, the trigger, the pull request, and the time of each
  run, and the link to its workspace. `run-copy.ts`: the mark of a run, the
  cause of a failed run in words, from the agent and the owner of the run
  itself, and the reason of a skipped run, with the login of an account
  outside the org. `RunNow.tsx`: Run now of the owner.
- `../shell/workspace/RunLine.tsx`: the line under the header of a run
  workspace, which links to its routine, and to the pull request of a pull
  request run.
- `../shell/ui/useSavedDraft.ts`: the draft of an editor of a saved value,
  as one value or field by field (`eachField`).
  `../shell/list/useRowFocus.ts`: the focus of a row after a move by keys.
  A closing row menu gives the focus to the current link of its row through
  it, also after a render replaced the row.
- `../shell/orgs/`: Create org and the name and initials fields.
  `../shell/settings/RepositorySearch.tsx`: the searchable repository list.
