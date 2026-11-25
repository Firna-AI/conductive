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
- `link-opening.tsx`: `WorkspaceLinks`, which gives each part of the
  screen the link opener of its untrusted text: the pages of the app, and
  the port previews of the workspace. `TextLinks.test.tsx` mounts the
  whole app. It presses a local address and a link of the app in the chat
  on desktop, and a link of the app to the address that shows. It checks
  that an archived workspace keeps a local address as text, and presses a
  link of the app in a Markdown file on a phone.
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
- `files/copy-path.ts`: `useCopyPath`, Copy path of the row menu and of
  the tab menu, which copies a real path with the clipboard of the org
  and says its result in a toast, and `useRowMenuItems`, the items of the
  row menu of the Files panel. `files/RowCopyPath.test.tsx` copies the path
  of a file, a folder, and a deleted file of Changes, also from the lists
  of a stopped sandbox, with each toast and no request.
- `files/add-to-chat.ts`: `useAddToChat`, Add to chat of the row menu,
  which gives the entry of a row to the kept chat, and the rules of the
  rows and the states that offer it. `files/RowAddToChat.test.tsx` checks
  the items of a file row, the chip at the caret of the shown session, a
  folder chip behind a file tab, a new session, and a phone. It checks the
  focus on desktop and none on a phone, and the item left out while the
  chat loads, while a stopped sandbox shows its bar, on a path that the
  list of `@` does not offer, and on a deleted file of Changes.
  `files/TabCopyPath.test.tsx` copies the path of a diff tab, and checks
  the tab menu of a read-only file tab, with only Copy path, and of a tab
  whose label is not known yet, with none.
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
  `files/TemporaryTabMenu.test.tsx` checks Keep open of its tab menu, and
  Copy path before the moves.
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
- `skills/`: the skill tabs, their page, and their read, as
  [The skill tabs](skill-tabs.md) says.
- `app-features.tsx`: the shell's own files, pull request, and owner
  parts, which `useFeatures` puts under the parts of the host. The screen
  draws its own tools panel when the host gives no `tools` part.
- `WorkspaceOwner.tsx` and `WorkspaceMacBar.tsx`: the owner picker of the
  members UI, and the bar of the 15 minutes in the Mac app.
- `saved-view.ts`: the saved view of the kept chat, `saveView`, which
  writes a change only once the chat read the view, `useRunAutomation`,
  the automation of a run workspace, and `useHeldRepositories`, the
  repositories that the cloud computer holds, which the chat reads with
  the view.
- `tools/ToolsPart.tsx`, `tools/tool-navigation.ts`, and
  `tools/tool-address.ts`: the tools panel and its `placeholder`, which
  takes the place of the tools inside the tabs, the tool of the address or
  the saved view, the preview, the port, or the terminal of the address,
  and their addresses. `previewPortHref` gives the address of the Preview
  tool with a port, and `terminalHref` the address of a terminal.
  `useToolSelect` is the select of a tool tab, which the Go to rows of the
  command palette share. `tools/terminal-links.ts` gives the links of the
  terminal: a local address opens `previewPortHref` of its port.
  `tools/terminal-route.ts` gives the route of the Terminal tool: the
  terminal of the address or of the saved view, and the show of a
  terminal, which saves it and moves the address of the Terminal tool.
  `tools/TerminalPart.tsx` keeps the terminals of the workspace, also
  before the Terminal tool shows, mounts the tool at its first show, and
  offers New terminal to the command palette. The
  [tools part](tools-part.md) gives the rules.
- `WorkspacePaletteActions.tsx`: the actions that the screen offers to the
  command palette, as `workspaceActionIds` chooses them. Each one runs the
  control of the screen: +, the clock of the history, a tab of the right
  column, Archive, or Restore. `useNewTerminalOffer` offers New terminal
  for the Terminal tool, where the Go to rows show, while the + of the
  terminal tabs takes a press. Merge latest has no control: it runs
  `github/merge-latest.ts`. Add to merge queue and Remove from queue run
  the merge queue of the screen.
- `tools/tool-events.ts`: `ToolEvents`, the events of the tools from the
  ordered stream. It keeps the revokes of previews, the latest report of the
  listening ports, and the first failed repair of that report since it. A
  tool that shows later gets them first, in event order. It passes each
  readable list of terminals, and keeps none, because the Terminal tool
  reads the list with its state.
- `workspace-skills.ts`: `WorkspaceSkills`, the latest skill lists of the
  workspace from the ordered stream, as a store that the chat reads for
  the list of `/` and the skill chips. The context gives it as `skills`,
  and `files/chat-files.tsx` puts it into `ChatMentions`.
- `github/WorkspaceGitHub.tsx` and `github/github-events.ts`: the one
  GitHub store of the screen, the bar or the row, and the GitHub events of
  the ordered stream. `github/bar-controls.ts` gives the one action state of
  the bar and its controls, and `github/bar-feed.ts` shows a GitHub state of
  another branch as loading. `github/bar-keys.tsx`: `BarKeys`, the keys of
  the bar, beside the bar of the right column and beside the actions at
  the top of the Checks tab of a phone. `github/merge-latest.ts`:
  `useMergeLatest`, the label and the run of the Merge latest row of the
  palette. It sends its prompt through the store of the bar actions, and
  `useShowChat` of `bar-controls.ts` shows the chat when the prompt did
  not go out, as [Agent actions](../../github/actions.md#agent-actions)
  says. `github/workspace-queue.tsx`: `useWorkspaceQueue`, the merge queue
  of the open workspace from the list of the org, which the bar and the
  palette share, with the question of Remove from queue in
  `QueueQuestion`. `useQueueKnown` gives the menu of the header the number
  and the trunk that the bar knows. `github/BarQueue.test.tsx` checks the
  line, Remove from queue with its question, Add, and the palette row.
- `kept-connections.tsx`: `KeptConnections`, the one connection of the
  kept files, of the kept previews, of the kept services, and of the kept
  files preview for the whole screen.
- `previews/kept-previews.ts`: the kept previews store of the open
  workspace, its snapshot, and its connection while the sandbox runs.
- `previews/services/kept-services.tsx`: the kept services store of the
  open workspace, its connection while the sandbox runs, and
  `usePreviewServices`, the services that the Preview tool shows, which
  read again on a timer while Preview shows: on a phone as the shown tool,
  and on desktop also only while the right column shows.
  `previews/services/ServiceSection.tsx` draws the Services part with its
  rows, the Stop question, and the log, as
  [Services in the app](../../../docs/protocol/services-in-the-app.md)
  says. `restart-access.ts`: `mayRestartSoftware`, the rule of Restart in
  the header, which Stop and Restart of a service share.
- `previews/kept-files-preview.ts`: the kept files preview store of the
  open workspace, its snapshot, and its connection, with the end of the
  files preview at its expiry and at a stop of the cloud computer.
- `previews/use-html-preview.tsx`: `useHtmlPreview`, the `htmlPreview` of
  the file page of an HTML file: its open at each show, its failure, its
  frame, Reload, and Open. `previews/page-frames.tsx`: `PageFrames` and
  `KeptPageFrames`, the frames that the chat keeps on desktop, and
  `KeptPageFrame`, the element through which only the file page puts a
  page there. [The tabs of HTML files](html-tabs.md) gives the rules, and
  the `previews/HtmlTab*.test.tsx` files check them over the fake API.
- `ContinueDialog.tsx`: the question of Continue with the local work, which
  the shared `LocalWorkList` lists.
- `repository/RepositoryControl.tsx`: the repository of the header, its
  menu, its progress, and its failure toast. `repository/use-repository-change.ts`
  gives `repositoryChoices`, the rows of the menu, and the store of the
  workspace. `repository/repository-change.ts`: `RepositoryChange`, the
  run of one change and its question. `repository/repository-api.ts`:
  the requests and the reader of their replies, which reuses `readLocalWork`
  and `fileLabels` of `../../github/continueActions.ts`.
  `repository/RepositoryQuestion.tsx`: the question.
  `repository/RepositoryMenu.test.tsx` and
  `repository/RepositoryQuestion.test.tsx` mount the whole app over the
  fake API: the menu, the progress, the note, the close of a file tab
  beside a temporary skill tab that stays, a phone sheet, the text in
  read-only states, the question with the labels of its files, and the
  failure toasts. `repository/repository-api.test.ts`
  checks the reader of those labels. `repository/repository-test-kit.tsx`
  holds their helpers, `../../test-support/fake-repository-change.ts` the
  replies, and `../../test-support/fake-repository-names.ts` their names.
- `screen-addons.tsx`: `ScreenAddons`, the parts of the screen with no
  place of their own, in each layout: the question of Continue, the
  palette actions, `RestoreShownTab`, `ResumeOnTabOpen`, `LeaveMovedFiles`
  of `files/moved-files.tsx`, `OpenSessionAddress`, and
  `ForgetClosedSkillViews` of `skills/skill-views.ts`.
- `github/BarMerge.test.tsx`, `github/BarAgent.test.tsx`,
  `github/BarContinue.test.tsx`, and `files/KeptFiles.test.tsx`: mount the
  whole app over the fake API. They check Merge and its refusals, the
  phone Checks top, the prompts from a file and a phone, a prompt that did
  not send, also after the member left, Continue with its question, a stop,
  the wait for a turn, the new branch and its note, and the local work of a
  phone on the chat tab.
  They also press the keys of the bar where it shows a button that takes a
  click, and where it does not.
- `github/BarPromptReturn.test.tsx`: mounts the whole app on a phone over
  the fake API, and presses Fix checks. The Worker accepts the prompt, and
  the test holds its reply. The member leaves the workspace and returns
  before the reply. A second press then sends nothing and keeps the page,
  because the kept chat still holds the prompt. The Worker gets one
  message, and its client ID stays the same after the reply. The draft
  keeps its text and its file, and the file uploads once.
- `github/NewSessionBranch.test.tsx`: mounts the whole app over the fake
  API. A new session names the workspace branch by the label of its GitHub
  state, or by its real name when the GitHub read fails.
- `tools/ToolsWiring.test.tsx` and `github/GitHubWiring.test.tsx`: mount
  the whole app over the fake API. They check the terminal socket across
  tool switches, the saved tool, the tabs and the state of a stopped
  sandbox with no tool mounted, a revoke before the Preview tool shows, a
  preview address on a phone, a port address on desktop and on a phone,
  one GitHub read for the bar and Checks with a live event, the Checks row
  of a phone, an archived phone, and the key of Open PR on GitHub.
- `tools/TerminalTabs.test.tsx`, `tools/TerminalAddress.test.tsx`,
  `tools/TerminalReconnect.test.tsx`, `tools/TerminalTabsFocus.test.tsx`,
  `tools/TerminalRestart.test.tsx`, and
  `tools/TerminalPreviewTabs.test.tsx` mount the whole app over the fake
  API, with the helpers of `tools/terminal-tabs-kit.ts`. They check the +
  and the limit, a switch, the connections of the shown terminals, a close
  and its question, the focus after a close, a close by another member,
  the failed open and close, the saved terminal after a reload, the
  address of a terminal and of a terminal that is not in the list, a reply
  of an open after a newer close, older software, and the Reconnect of one
  terminal over the fake sockets of the server. They also check the focus
  after a tab, the +, and New terminal, on desktop and on a phone, and the
  row of tabs after a Restart. On desktop, the saved terminal, a press on
  a terminal tab, and New terminal of the palette keep the address of a
  Preview tab of the centre. `wiring-test-kit.tsx` holds their helpers.
- `../palette/PaletteNewTerminal.test.tsx` mounts the whole app over the
  fake API for New terminal of the palette. It runs the row while Preview
  shows and while the Terminal tool shows. It checks the place of the row,
  no row at the limit, with a stopped cloud computer, with software for
  one shell, or with the right column hidden, and a key that the person
  gave the command, also while an open runs.
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
  `useHeaderMenu.tsx` gives the header the workspace menu of the list,
  which a press on the name opens. `HeaderMenu.test.tsx` opens it and renames the
  workspace from it in the whole app.
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
- `RunLine.tsx`: the line under the header of a run workspace, which links to its automation and the pull request of a pull request run. `RunLine.test.tsx` checks the line and its links.
- `SandboxNotice.tsx`, `notice-copy.ts`, and `StartingCard.tsx`: the
  states of the cloud computer, their words, and the start steps. The bar
  of an archived workspace offers Restore until its last day, and gives
  the day when the workspace leaves the list, also without Restore. After
  that day it has the title "Removed on" and the day, and its panels have
  the title Removed. `notice-copy.ts` takes each stage from the shared
  `archiveStage`, which reads the `computer`, `restore`, and `removed` marks
  of the notice. A missing or `unknown` `computer` keeps the reading from
  Restore alone. `notice-copy.test.ts` checks the words of each stage, also
  for each computer state. `useArchiveActions.ts` runs Archive and Restore for
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
  sends no second Resume. `WorkspaceScreen.tsx` gives the bar
  `workspace.archivedComputer?.state` as its `computer` mark. It sets the
  `removed` mark at the end of the 14 days, also without a kept cloud
  computer. `archiveEnd` in `archive-ends.ts` gives that end: the cutoff
  `archivedComputer.restoreUntil`, or else `archivedAt` plus 14 days for a
  record of an older Worker. The day on the bar and the day of the toast
  after Archive use it too. `useArchiveEnds` gives the `removed` mark at
  that end, and the end of Restore at the legacy `restoreUntil`. It renders
  the screen again at each of them. `ArchivedRestore.test.tsx` mounts the
  whole app for Restore by a member and for its end at the last day, when
  the workspace also leaves the list. It also mounts an unresolved cloud
  computer, which offers no Restore, and its notice at the end of the 14
  days. `LinkChips.test.tsx` opens a removed workspace from its chip.
- `dev/`: the development page, with its options in `dev-options.ts` and
  its controls in `DevControls.tsx`.
  `dev/main.tsx` supplies the real window host, keyboard, and key events
  through `AppServices`.
