# Key code

This page is part of the [web app guide](README.md). It names the files,
the types, and the functions of the web app that a reader opens first.
Each path is relative to `src/app/`, the folder of this page.

- `dev/org-routes.ts` creates orgs and starts their first simulated build.
  `dev/build-routes.ts` runs builds and the added build after the first image.
  `dev/settings-routes.ts` saves settings and repository choices.
- `api/client.ts`: the JSON client and `ApiError`. The client also gives
  its `fetch`, for a feature client that reads its own replies, so the web
  app and the Mac app keep their transport. Its `sendFile` sends a raw file
  through the file transport of the services: `api/xhr-files.ts` in the
  browser and in the Mac app. `api/read-*.ts`: the readers.
- `attachment-upload.ts`: `uploadAttachment`, the one upload of a file for
  both composers. `draft-files.ts`: `DraftFile`, the upload state of each
  file of a draft, and `runFileJob`. `new-workspace-files.ts`:
  `DraftUploads`, the uploads of a first message before its workspace
  exists, which a change of person ends.
- `replay-socket.ts`: `replaySubscribe`, the raw event stream of a feature
  store over the event source of the app, with the reconnect rules of
  [Data lifecycle](data-lifecycle.md).
- `app-model.ts`: the session, the orgs, the models list, Get started,
  `putOrg`, which takes a confirmed org record, and `admit`, which opens
  the app when app access arrives. `boot.ts`: `Boot`, the states of the
  first load, and `readShared`, what every screen of the app shares.
- `error-reporting.ts` and the other `error-reporting-*.ts` modules: the
  browser error reporter. [Error reporting](error-reporting.md#key-code)
  names each one, with `AppServices.errorReporting` and the user ID
  subscription of `AppModel.boot`.
- `waitlist-model.ts`: `WaitlistModel`, the screen of a person who waits:
  the use of a code from the field or a join link, the invitations with
  Accept, and the read of the app access at each return to the page.
  `waitlist-state.ts`: what the screen shows, and the reason of each
  refused code. `api/read-waitlist.ts`: the readers of the session and the
  waitlist state.
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
  and computer settings of one org, with `watch` and the wait of each part.
  `OrgModel.startBuild` sends Build computer and Try again for each screen
  that offers them.
- `first-build.ts`: `firstBuildOf` and `useFirstBuild`, the state of the
  first build of an org from its builds, which Get started and New
  workspace show until the org has a good image. `changedScriptNotice`
  gives the words of the notice of a changed install script, which the
  Cloud computer tab of an admin and of a member show.
- `account-model.ts`: the agent logins with their share setting, the
  default model, the New workspace view, the GitHub App installations,
  and the repositories that Create org offers. A screen watches the
  installations: they read at once, and again with the steps of Get started
  each time that the user comes back to the page. It also reads the
  waitlist state for the invite code of the account.
  `../shell/account/InviteCodeSection.tsx`: that invite code.
- `panels.ts`: `PanelLayout`, the widths of the panels, whether the right
  column shows, and `next`, the one rule of their steps.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes. `refresh.ts`: `Refresher`, the shared reads of a part
  while screens show it.
- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group.
- `workspace-actions.ts`: `OrgModel.workspaceActions`, the Rename write,
  owner-only confirmation, and list-owned Archive flows for unopened rows.
  `list-changes.ts` confirms only the fields of each action.
  Archive also advances `updatedAt` when the acknowledged time is newer.
- `../shell/workspace/shown-workspaces.ts`: `ShownWorkspaces.rename`,
  `reassigned`, and `archive` use a kept model when one exists. They open
  no workspace and create no model for an unopened row.
- `../shell/list/`: the workspace list. `WorkspaceRow.tsx` draws a row,
  with its Archive shortcut over the time on hover, and the Rename field
  of `WorkspaceNameField.tsx`. A right click or the menu keys open the menu
  of a row. `useRowMenus.tsx` gives each row the actions that the person
  can use, from `workspaceMenuItems` of the mockups, and draws the open
  `RowMenu.tsx`. The Archive shortcut and Archive in the menu share one
  flow, `ShownWorkspaces.archive`, so one action shows one question. The
  list draws that question for a row that the page does not show.
  `SectionHeader.tsx` draws a section header with its menu and Rename
  section. `useListActions.ts` runs the list changes, with a toast for a
  failure. `RowMenu.test.tsx`, `RowMenuAccess.test.tsx`,
  `RowActions.test.tsx`, and `RowRename.test.tsx` mount the whole app.
  [Workspace menu](../../docs/protocol/workspace-menu.md) states the menu
  of a workspace row.
- `../shell/ui/Menu.tsx`: `MenuButton`, the menu of the shell, a sheet on
  a phone. `MenuList.tsx` draws the items, also an item that shows
  choices. `PointMenu.tsx` draws a menu at a point above the page, with its
  choices beside it, and `menu-place.ts` keeps both inside the window.
  `menu-keys.ts`: `opensMenu`, the menu keys of a row and of a tab.
- `workspace-model.ts` and `archive-model.ts`: an open workspace, its
  `startError` and `reassigned`, and Archive.
  `WorkspaceModel.renamed` takes the confirmed name into the kept detail.
  Local action fields stay over pending open and Resume replies.
  `workspace-detail.ts` maps its stream and Archive records to detail.
  `workspace-activity.ts` counts input reports through `WorkspaceActivity`.
- `suspension.ts` and `permissions.ts`: the suspension of an org, the
  client that reports its refusals, also the replies of its fetch, and the
  rules of what a person may change.
- `workspace-read-marks.ts`: `WorkspaceReadMarks`, the read marks of one
  kept workspace model, with its shown and confirmed numbers.
- `new-workspace-model.ts`: the first message that creates a workspace.
  `creations.ts`: `Creations`, the life of the create requests of an org in
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
- `events.ts`: the ordered event stream, the event socket, and
  `openSocket`, the terminal socket on the same origin as the events.
- `workspace-store.ts`: `useWorkspaceStore`, which gives a connected view
  the store of its workspace, and the `create` and `connect` functions that
  the view supplies.
- `workspace-store.test.tsx`: mounts the real hook with logged test stores in
  happy-dom. It checks the connection after the render and the stop at
  unmount. It checks that a switch stops the old store before the new one
  connects, and shows only the new store. It also checks when the hook keeps
  a store, connects it again, or makes a new one.
- `pointer-drag.ts`: `usePointerDrag`, the drag and drop of any pointer
  that the tab row of the chat and the workspace list use: the press, the
  start after a move of a mouse or a long press of a finger, Escape, the
  click after a drag, the scroll lock of touch, and a new drop place after a
  scroll under a still pointer. A menu event ends the press of a mouse
  and keeps the press of a finger. `ownPress` keeps a press on a control
  inside a dragged element, such as Close or Archive, for that control.
  `next-click.ts`: `stopNextClick`, which stops the click that ends a drag
  wherever it lands, also the late click of a finger.
  `pointer-drag.test.tsx` mounts the hook in happy-dom.
  `../shell/list/useRowDrag.ts`: the drag of a workspace row to a place in
  a section, on `usePointerDrag`.
- `sideways-wheel.ts`: `useSidewaysWheel`, which turns a
  vertical wheel turn over a row that scrolls sideways into a sideways
  scroll of the row. A sideways swipe and a turn with Ctrl stay with the
  browser, and so does a turn past an end of the row. The tab row of the
  chat uses it, and any row that scrolls sideways can.
- `operator-read.ts`, `operator-directory.ts`, and `operator-target.ts`:
  the Overview and the pages of the operator section, its searches, and
  Suspend and Lift. `operator-pause.ts` and `operator-access.ts`: the
  pause of sign-ups, Approve, New code, and Disable. A refusal with
  `operator_required` marks the account as not an operator.
  `api/read-operator.ts`, `api/read-operator-pages.ts`, and
  `api/read-operator-waitlist.ts`: their readers. The
  [operator section](../shell/operator/README.md) gives the screens.
- `router.ts` and `navigation.ts`: the addresses of the screens.
- `kept-org.ts`: `keptOrg`, the org of a page without one: the org that
  the tab opened last, from `AppModel.lastOrg`, or else the first org that
  is not deleted.
- `palette/`: the command palette without React. `palette-results.ts`
  gives the groups and the empty state of each tab for a query, from
  `palette-groups.ts` and the rows of `palette-rows.ts`. `palette-status.ts`
  gives the status part, which stands in place of the workspace groups
  while the list or the repository names load or after a read failed,
  and the reads that its Try again does again. `matcher.ts`
  ranks the matches. `rowTexts` includes the workspace number label, such
  as `W-395`, in the search texts. `withNumberLabel` adds that label when
  a query word matches it. `../shell/palette/PaletteList.tsx` draws it
  before the name. `commands.ts` holds the labels and the search words.
  `page-actions.ts` gives the offers of the parts of the page and
  `workspaceActionIds`. `palette-org.ts` chooses the org of the palette,
  `palette-keys.ts` the palette key and what it does, and `controller.ts`
  the open state and the offers of one tab, with `show`, the one way to
  open the palette.
- `../shell/palette/`: the layer of the palette. `PaletteProvider.tsx`
  hears the key and closes the palette, `PaletteLayer.tsx` draws it in a
  frame, `palette-context.ts` gives `usePaletteOffer` and
  `usePaletteTerminal`, and `SearchRow.tsx` is the Search row of the list.
  `use-palette-source.ts` gives the list and the repositories of the org
  with their load states, and `PaletteStatus.tsx` draws the status part.
- `../shell/ui/layers.ts`: `OpenLayers`, the open menus of every UI kit,
  which say whether they closed, and the modal layers with their owners.
  The palette reads them before it opens.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
- `../shell/layout/frames.tsx`: the frames: the desktop frame with the
  rail, a desktop page alone, such as Create org, and the phone frame.
  `../shell/layout/DesktopLayers.tsx`: `DesktopLayers`, the layers and the
  main area that every desktop frame shares: sheets and dialogs, the New
  workspace dialog, and the command palette.
- `../shell/ui/Overlay.tsx`: `OverlayHost`, `useLayerFocus`, and
  `useDismiss`, the layer of sheets and dialogs, and `useModalLayer`, which
  every sheet and dialog uses. Escape closes only the newest layer. Its
  optional `returnFocus` names a trigger that a render can replace, such as
  the row of a phone menu sheet.
  `../shell/ui/screen-focus.ts`: `requestScreenFocus`, the focus of a new
  screen after a layer closes with a move, which the main area of a
  desktop frame takes through `useScreenFocus`.
- `../shell/new-workspace/NewWorkspaceHost.tsx`: `NewWorkspaceHost`, the
  New workspace dialog of a desktop frame, and `useNewWorkspace`, the one
  way that each place opens New workspace as the dialog or the page.
  `NewWorkspaceDialog.tsx`: the dialog.
- `../shell/new-workspace/useNewWorkspaceForm.ts`: the form that the page
  and the dialog share: the repository, the notices, the readiness, and
  the send. `parts.tsx`: their repository menu.
  The model of each form is the `owner` of its chip field. The shared chip
  field supplies their focus handle. `CaretAtEndPlugin`
  restores the saved caret position when keyboard focus enters. Without a
  saved position, it puts the caret at the end. It lives in
  `../chat/components/chip-field/focus-plugins.tsx`.
- `../chat/components/send-key.ts`: `useSendKey`, the send key of every
  composer.
- `../shell/ui/useSavedDraft.ts`: the draft of an editor of a saved value.
  `../shell/list/useRowFocus.ts`: the focus of a row after a move by keys.
  A closing row menu gives the focus to the current link of its row through
  it, also after a render replaced the row.
- `../shell/orgs/`: Create org and the name and initials fields.
  `../shell/settings/RepositorySearch.tsx`: the searchable repository list.
