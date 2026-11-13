# Workspace key code

This guide belongs to [the workspace screen](README.md). It names the
files, the types, and the functions of the workspace screen that a reader
opens first. Each path is relative to `src/shell/workspace/`, the folder of
this guide.

- `WorkspaceScreen.tsx`: the screen of one open workspace. It takes a view
  of the kept workspace through `useWorkspaceStore`, and places the header,
  the notices, the columns, and the features. `Unavailable.tsx` shows
  a 404. A failed first start keeps the screen, and `failedFirstStart`
  marks its sandbox view.
- `shown-workspaces.ts`: `ShownWorkspaces`, the kept workspaces of one tab
  and one user. It keeps a workspace whose first start failed, as it keeps
  any other. `ShownWorkspaces.view` gives a view of a workspace, and makes
  its parts at the first view.
- `tab-memory.ts`: `shownWorkspaces`, which clears them at a sign-out or a
  sign-in of another user.
- `workspace-view.ts`: `WorkspaceView`, the store of one mounted view over
  the kept parts. Its snapshot is the detail of the model. `connect` shows
  the parts, and its result hides them.
- `ChatArea.tsx`: the chat of the centre, with the start steps and the
  sandbox bar of the shell, the open file tabs, and the file page in place
  of the chat of the session, or the shell's own column for the chat slots.
- `files/files-features.tsx`: the Files part, which reads the kept files
  that the screen connects, and the file or diff page of the centre. The
  page gives its tab to `KeptScroll`, so each file and diff tab keeps its
  scroll offset, as
  [Kept scroll offsets](../../files/README.md#kept-scroll-offsets) says.
- `files/tab-open-resume.tsx`: `ResumeOnTabOpen`, which resumes a stopped
  sandbox at each visit that opens a file or diff tab, also a second click
  on the tab that shows. The screen draws it in each layout.
- `session-address.tsx`: `OpenSessionAddress`, which shows the session of a
  session address once the chat loads, then replaces the address with the
  workspace address. A move to another address stops its lookup. The
  screen draws it beside `ResumeOnTabOpen`. `SessionAddress.test.tsx` and
  `SessionChips.test.tsx` mount the whole app for the address and the chips.
- `files/chat-files.tsx`: the file tabs of the kept chat, named by the
  labels of the kept files, at their places in the tab row with the props
  that the row gives each tab, the diff links, and the way back to the chat
  when a session becomes active.
- `files/files-navigation.ts`: the navigation of the Files screens, and
  the changes of the saved view that the address and the pages make.
- `files/files-address.ts` and `files/view-tabs.ts`: the addresses of the
  Files screens, and the tabs, the temporary tab, and the list of a view.
- `files/files-store.ts` and `files/workspace-files.ts`: the store of one
  workspace over the transport of the app, its connection, and Copy and
  Download.
- `files/FilesWiring.test.tsx`: mounts the whole app over the fake API. It
  opens a file beside the sessions, goes back by a session tab, and checks
  the saved view. It also checks a failed chat load, the diff of a turn on
  a phone in the temporary tab, a stopped, starting, and refused sandbox,
  and an archived workspace.
- `files/view-tabs.test.ts` checks the rules of the temporary tab.
  `files/TemporaryTabs.test.tsx` checks them in the whole app over the fake
  API: a load, a replace, a switch of mode, a close, and an address. It
  also checks a double-click on a row and on the tab, with one history
  entry each, and a press and a keep in a suspended org.
  `files/TemporaryTabMenu.test.tsx` checks Keep open of its tab menu.
- `files/StartingPages.test.tsx`: mounts the whole app over the fake API at
  a file address and at a diff address while the sandbox starts. It checks
  the sandbox panel in place of the page, with no read, and the read once
  the workspace is ready.
- `files/TabOpenResume.test.tsx`: mounts the whole app over the fake API. It
  checks the resume when a diff of a stopped workspace opens, also at a
  second click on the diff that shows, and no second resume at the first
  address. It checks the file that a tab keeps when the sandbox stops, no
  start at a switch of its view, and no start in a ready or a refused
  workspace.
- `files/TabScroll.test.tsx`: mounts the whole app over the fake API. It
  scrolls a file tab and a diff tab, shows the chat, and checks that each
  tab gives its offset back. A tab that the user closes opens at the top
  again.
- `app-features.tsx`: the shell's own files, pull request, and owner
  parts, which `useFeatures` puts under the parts of the host. The screen
  draws its own tools panel when the host gives no `tools` part.
- `WorkspaceOwner.tsx` and `WorkspaceMacBar.tsx`: the owner picker of the
  members UI, and the bar of the 15 minutes in the Mac app.
- `saved-view.ts`: the saved view of the kept chat, `saveView`, which
  writes a change only once the chat read the view, and `useRunRoutine`,
  the routine of a run workspace, which the chat reads with the view.
- `tools/ToolsPart.tsx`, `tools/tool-navigation.ts`, and
  `tools/tool-address.ts`: the tools panel and its `placeholder`, which
  takes the place of the tools inside the tabs, the tool and preview of the
  address or the saved view, and their addresses. `useToolSelect` is the
  select of a tool tab, which the Go to rows of the command palette share.
- `WorkspacePaletteActions.tsx`: the actions that the screen offers to the
  command palette, as `workspaceActionIds` chooses them. Each one runs the
  control of the screen: +, the clock of the history, a tab of the right
  column, Archive, or Restore.
- `tools/tool-events.ts`: `ToolEvents`, the events of the tools from the
  ordered stream. It keeps the revokes of previews, the latest report of the
  listening ports, and the first failed repair of that report since it. A
  tool that shows later gets them first, in event order.
- `github/WorkspaceGitHub.tsx` and `github/github-events.ts`: the one
  GitHub store of the screen, the bar or the row, and the GitHub events of
  the ordered stream. `github/bar-controls.ts` gives the one action state of
  the bar and its controls, and `github/bar-feed.ts` shows a GitHub state of
  another branch as loading. `github/bar-keys.tsx`: `BarKeys`, the keys of
  the bar, beside the bar of the right column and beside the actions at
  the top of the Checks tab of a phone.
- `files/kept-files.tsx`: `KeptFilesConnection`, the one connection of the
  kept files for the whole screen.
- `ContinueDialog.tsx`: the question of Continue with the local work, which
  `LocalWorkList` of the mockups lists.
- `github/BarMerge.test.tsx`, `github/BarAgent.test.tsx`,
  `github/BarContinue.test.tsx`, and `files/KeptFiles.test.tsx`: mount the
  whole app over the fake API. They check Merge and its refusals, the
  phone Checks top, the prompts from a file and a phone, a prompt that did
  not send, Continue with its question, a stop, the wait for a turn, the
  new branch and its note, and the local work of a phone on the chat tab.
  They also press the keys of the bar where it shows a button that takes a
  click, and where it does not.
- `tools/ToolsWiring.test.tsx` and `github/GitHubWiring.test.tsx`: mount
  the whole app over the fake API. They check the terminal socket across
  tool switches, the saved tool, the tabs and the state of a stopped
  sandbox with no tool mounted, a revoke before the Preview tool shows, a
  preview address on a phone, one GitHub read for the bar and Checks with a
  live event, the Checks row of a phone, an archived phone, and the key of
  Open PR on GitHub.
  `wiring-test-kit.tsx` holds their helpers.
- `header-notices.ts`: `HeaderNotices`, the failed repairs of the name and
  the start steps. `follow` reads a stream, `dismiss` hides a notice in
  this view, `newView` shows each notice again, and `shown` gives the
  notices to draw.
- `HeaderNoticeBars.tsx`: the bars below the header, with Dismiss.
- `HeaderNotices.test.tsx`: mounts the screen in happy-dom over the fake
  API and its event stream, and checks the notices.
- `KeptWorkspace.test.tsx`: mounts the whole app over the fake API. It
  checks a return, the event number of each socket, a new tab, the clear at
  a sign-out, and the app values that change while the tab is away.
  `kept-test-kit.tsx` holds its helpers.
- `features.ts`: `WorkspaceFeatures`, the parts that plug in,
  `WorkspaceContext`, what each part gets, and `useFeatures`, the parts of
  the host over the app's own parts.
- `WorkspaceHeader.tsx` and `WorkspaceColumns.tsx`: the header, the
  columns, the toggle of the right column, and the tab bar of a phone.
  `RightColumnToggle.test.tsx` mounts the whole app over the fake API. It
  hides the right column, opens the workspace again, and shows the column.
  `WorkspaceKeys.test.tsx` runs the keys of the tab row, of the
  composer, and the copy keys of the shown session in the whole app. It
  also runs the key of Fast mode, and reads that key at the end of the
  Fast row of the model menu.
- `CopyLink.tsx`: the label of the number, such as `W-395`, as the Copy
  link button of the header, as
  [Copy link](../../../docs/protocol/workspace-links.md#copy-link) says.
  It copies `workspace.link` through `AppServices.copy`, so the copy holds
  no tab path. "Link copied" shows for 2 seconds through
  `AppServices.delay`. A failed copy asks to try again until the next
  press, as the file page does. On desktop the button follows the name,
  and the repository fills the `.metas` group. On a phone
  it leads the line under the name. The key of Copy link does what a press
  does while the button shows, and on desktop the tooltip names the key.
  `CopyLink.test.tsx` mounts the whole app and presses the button for a
  copy and for a failed copy, and the key.
- `RunLine.tsx`: the line under the header of a run workspace, which links to its routine and the pull request of a pull request run. `RunLine.test.tsx` checks the line and its links.
- `SandboxNotice.tsx`, `notice-copy.ts`, and `StartingCard.tsx`: the
  states of the cloud computer, their words, and the start steps. The bar
  of an archived workspace offers Restore until its last day, then says
  when Restore ended. `useArchiveActions.ts` runs Archive and Restore for
  each control, with their toasts. Archive from the row of the open
  workspace, by its shortcut or its menu, acts once, also during the first
  read, as [Archive](../../../docs/protocol/workspace-menu.md#archive)
  says. An Archive and a Restore during the first read resume nothing.
  `refusedStart` in `SandboxNotice.tsx` turns a refused start error into
  the refused notice. `sandbox-view.ts` chooses the bar and the panels,
  also for a suspended org, for the saved message of a failed start, and
  for the end of Restore. Until the open of the visit ends, as
  `WorkspaceModel.opened` says, it shows the composer in place of the bar
  of a sandbox that the open resumes, so that no Resume flashes at an open.
  Meanwhile `WorkspaceHeader.tsx` shows Starting in place of Stopped, and
  `contentState` gives the tools and the file pages the wait of a start,
  with no Resume. The lists keep their saved copy. A tab that opens then
  sends no second Resume.
  `ArchivedRestore.test.tsx` mounts the whole app
  for Restore by a member and for its end at the last day.
- `dev/`: the development page, with its options in `dev-options.ts` and
  its controls in `DevControls.tsx`.
  `dev/main.tsx` supplies the real window host, keyboard, and key events
  through `AppServices`.
