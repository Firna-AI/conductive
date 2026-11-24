# The design of the workspace

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
messages that wait for the sandbox and the tab row of the centre column,
with its temporary tab, the menu of a row of the Files panel, and the
notices of the file lists of a large branch. It gives the page of an HTML
file in its tab, the skill tab, the terminal tabs, and the services of the
Preview tool. It also gives the number of a workspace with Copy link, and
the bars of the cloud computer.

- While a sandbox starts, also for the first time, Send queues each
  message in the workspace, as `app/new-workspace/waiting` shows. A queued
  message has no label of its own, because the start steps under the chat
  already show the wait. After a failed first start, the bar of the error
  sits above the composer, so members can still queue messages, as
  `app/new-workspace/error` shows. Every other bar of the sandbox takes
  the place of the composer.
- `WorkspaceTabs` in `src/components/workspace/` draws the tab row of the
  centre column, from decisions 186 to 188, as `app/tabs` shows. Any tab
  moves to any place in the row by drag, or by a long press on a phone, and
  a new tab opens at the end of the row. A drag looks like the drag of a
  workspace row: the tab lifts as a raised card, a faint copy stays at its
  place, and a line in the accent colour marks where it lands. The line
  stands between two tabs and takes no space. When the tabs do not fit at
  their minimum width, the row scrolls sideways with no scrollbar, keeps the
  shown tab in view, and fades each end that clips tabs. A right click on a
  tab opens its menu at the pointer: Rename session, a line, Copy link,
  Copy concise transcript, and Copy full transcript, a line, Move left and
  Move right, a line, then Close other tabs and Close tabs to the right,
  from decisions 188 and 215. Copy link copies the link of the session. A
  kept file or diff tab has Copy path, a line, the moves, a line, and the
  two closes, from decision 3 B of the file row menu change. Copy path
  copies the path of the file, as in the menu of its row. A tab whose label can hide a secret value
  leaves it out. A skill tab has no path, so its menu has only the moves
  and the two closes. In a read-only workspace, the menu of a session tab holds
  only the three copy items, and the menu of a file or diff tab only Copy
  path. A copy keeps the shown tab, and a toast gives its result, as
  `app/transcripts` shows. The menu is the one way to rename a session, so
  no tab shows a rename button.
  Rename session opens a field in place of the title of that tab, also when
  the tab does not show. The field marks that tab, which takes no fill, so
  only the shown tab is filled. On a phone, a long press that ends without a
  move opens the menu as a sheet. `WorkspaceTabs.module.css` in
  [`src/ui/components/workspace/`](../../src/ui/components/workspace/)
  styles the row and its tabs. `TabScroll.module.css` beside it styles a
  full row, `TabDrag.module.css` a drag, and `TabRename.module.css` the
  rename field. The app shares these modules.
- The temporary tab, from decisions 284 to 287, is the one tab that the
  next press on a file, a diff, or a skill replaces, as
  `app/files/temporary` and `app/skill-mentions/tab/temporary` show. A
  press on a row of All files or Changes, or on a file chip, opens the
  file or the diff in the temporary tab, and a press on a skill chip opens
  the skill there (skill tab decision 2 A). When the
  row has no temporary tab, it opens at the end of the row. Otherwise the
  press replaces its file in the same place, also when a later tab stands
  after it. A press on a file that has a tab shows that tab. The title of
  the temporary tab shows in italics, also on the lifted copy of a drag,
  and nothing else on the tab changes. A screen reader hears its name, then
  ", temporary". The tab menu and the move messages keep the plain name. A
  double-click on the tab or on the row of its file keeps it as a normal
  tab, with an upright title, in its place. Its tab menu leads with Keep
  open, which keeps it too, then a line, Copy path, a line, and the moves.
  Keep open has the icon of a bookmark with a check, because a pin names
  the pinned tabs of a browser. A drag, Move left, or Move right that
  changes its place keeps it. A drag that Escape cancels, or that ends in
  the same place, keeps it temporary. A phone row shows no file tabs, so a
  phone draws no temporary tab. `.temporary` of `WorkspaceTabs.module.css`
  styles the title.
- `FileTree` and `ChangeList` in `src/components/files/` draw the menu of
  a row of All files and Changes, from the file row menu change, as
  `app/files/menu` shows. A right click on a file or a folder row opens it
  at the pointer, through `PointMenu` in `src/components/common/`, and
  Shift+F10 and the Menu key open it below a focused row. A long press on
  a phone opens it as a sheet with the name of the row as its title. The
  menu holds Add to chat, a line, then Copy path, and no row has a button
  for it. Copy path copies the path from the root of the repository, with
  no final slash, and a toast gives its result, in the words of Copy link.
  Add to chat puts the chip of the file or the folder in the message field
  of the session tab that the member saw last, and shows that tab. On
  desktop the field takes the focus, and on a phone no keyboard opens. Add
  to chat shows only for a path that the list of `@` offers, while the
  message field shows. So a deleted file of Changes, and a bar of the
  cloud computer in place of the field, leave it out. A row whose label
  hides a secret value opens no menu. A read-only workspace shows no rows.
  The row of an open menu keeps the fill of a hover, as a tab with an open
  menu does, also under the sheet of a phone. `FileRowMenu.tsx` beside the
  lists gives the items and the sheet, and `rowMenuCopy.ts` in
  [`src/ui/components/files/`](../../src/ui/components/files/) gives the
  words of the items and of the toast. Add to chat has the icon of the `@`
  of a mention, because the speech bubble with a plus names New session.
- `ListNotice` in
  [`src/ui/components/files/`](../../src/ui/components/files/) draws the
  notice of a file list that leaves out entries, from runner file report
  limits, as `app/files/limited` and `app/files/changes/limited` show. The
  app draws the same part. It is a row in
  the fill of a raised surface, with the info icon. It stands at the top of
  All files and under the summary of Changes, and it does not scroll with
  the rows. Its edges stay neutral, with one line under it. All files counts
  the files and folders that it does not show together, because the limit
  counts each folder. The summary and the tab of Changes count the whole
  change, and the notice says that these totals include the files that the
  list does not show. Each notice says where the member finds those files:
  in the terminal, or through the agent. The amber notice of a list that is
  not the latest one keeps its place under the lists, so a saved limited
  list shows both. `listNoticeCopy.ts` beside it holds the words, also the
  line of the list of `@` when nothing in a limited tree matches. The file
  counts of the Changes tab and of the summary, the line totals, and the
  counts in the notices, show with thousands separators, such as 2,243.
  `formatCount` in
  [`src/ui/components/common/counts.ts`](../../src/ui/components/common/counts.ts)
  writes each of them. Each file link of
  a limited screen opens the limited page of its file or list, from the
  table of `src/limitedListPaths.ts`, which `ScreenLink` reads. The Checks
  tab and the other views of the workspace keep their standard pages.
- The tab of an HTML file shows its page in a frame, from HTML preview
  decision 1 A, as `app/files/html` shows. `PageFrame` in
  [`src/ui/components/files/`](../../src/ui/components/files/) holds the
  page from edge to edge under the
  header of the file, as a Preview tab holds the page of a port. The page
  is the member's own, so it keeps its own colours in both colour schemes.
  The header adds Reload and Open, from `PreviewActions` of the Preview
  tool, before Copy. The switch between Preview and Source stays at the
  end, as for a Markdown file. On a page up to 480 px wide, such as a
  phone, Reload and Open take a second line of the header, at its end, so
  the first line keeps the path and the actions on the file. Reload and
  Open show only while a page opens or shows. So Source, the notice of
  older software, and a failed open show neither.
  - From the press until the page loads, the frame shows the page that
    `app/tools/preview-opening` draws, so the member sees one wait.
  - `htmlPreviewCopy.ts` beside the frame holds the words of the notice
    that asks for Restart. It imports no fixture, so the app can share it.
  - A failed open shows `PreviewOpenFailure` of `src/components/tools/`:
    "The preview couldn't open", the message of the server, and Try
    again, as a Preview tab shows it. The words live in
    [`src/ui/components/tools/previewCopy.ts`](../../src/ui/components/tools/previewCopy.ts).
- `SkillPage` in `src/components/files/` draws the skill tab, from skill
  tab decision 1 B, as `app/skill-mentions/tab` shows. The tab has the
  skill icon and the name of the skill as its title. The page keeps the
  look of the page of a file: the first line of its header holds the name
  in the quiet chip of a path, with the skill icon, then the agent of the
  skill, such as "Claude skill", and the switch between Preview and Source
  at its end. The agent shows because two agents can hold skills with one
  name and different texts, and the title of the tab is only the name.
  The description of the skill follows, muted, in at most three lines, and
  its title gives the whole text.
  Preview shows the Markdown body without the front matter, with the
  `MarkdownView` of a Markdown file. Source shows the whole text in the
  `CodeView` of a file, and the header gives its line count, as for a
  file. The header has no Copy and no Download.
  - A notice takes the place of the text and keeps the header: the read
    that runs, a skill that the list no longer holds, which shows no
    description, a text over 1 MB, and older cloud computer software. A
    cloud computer that is not ready shows the state of a sandbox, as in
    a file tab.
  - `skillTabCopy.ts` beside the page holds the words of the agent label
    and of the notices. It imports no fixture, so it can move to the
    shared UI with the page.
  - On a phone the skill is a page of the Files tab, which leads back to
    All files, as a file does.
- `TerminalTabs` in `src/components/tools/` draws the terminals of a
  workspace as a row of tabs above the shown terminal, with + at its end,
  from decisions 1 to 3 of the terminal tabs change, as `app/tools` shows. Its tabs are
  the tabs of the centre column. The titles differ only in their number, so
  each tab keeps its whole title, and a row that does not fit scrolls. The
  last terminal has no close button. At the limit of 10 the + is off, and a
  line under the row says how to open another. `TerminalTool` beside it
  adds the shown terminal and the Disconnected bar.
- `ServiceSection` in `src/components/tools/ServiceList.tsx` draws the
  services of the Preview tool above its servers, as `app/tools/services`
  shows. The headings Services and Servers take the type of a menu group.
  Each row has three lines. The first holds the name, the label of the
  program, and the folder, which shorten with "…", then the quiet scroll
  icon of Show log and the quiet menu button, which never shrink. The
  second holds the state as `StatusText`, the time, and the start source.
  The last holds the ports as small buttons in the type of the port column,
  and it wraps. The port of the shown Preview tab has the fill of the
  current server row. A row with an open menu keeps the fill of a hover.
  - After a first read of the list that failed, `LoadFailure` takes the
    place of the rows under the heading, in the width of the rows. No port
    leaves Servers for a service, as
    `app/tools/services/load-failed` shows.
  - The menu holds Restart, then Stop in the danger colour. Desktop draws
    it below its button, and a phone as a sheet, through `ServiceMenuSheet`.
    `StopServiceDialog` asks before Stop, through `ConfirmDialog`.
  - `ServiceLogView` in `ServiceLog.tsx` shows the log in a wide
    `ConfirmDialog`, which is a sheet on a phone: the state, then the
    output as plain text in the mono type, which wraps and scrolls.
  - `ServiceResultToast` shows a failed control as the toast of a failed
    change, an unconfirmed control as a warning toast, and a control for a
    run that ended as an info toast.
  - `serviceCopy.ts` in
    [`src/ui/components/tools/`](../../src/ui/components/tools/) holds the
    words, which take plain values or the types of the report, and the
    sample shapes of the mockups. It imports no fixture, so the app shares
    its words.
- Each workspace has a number in its org, and `workspaceLabel` in
  [`src/ui/components/workspaces/label.ts`](../../src/ui/components/workspaces/label.ts)
  shows it as `W-395`. The number
  shows in the header, in chips, and in a row of the command palette
  whose search matches it. The rows of the list keep their layout.
  - `CopyLinkButton` in
    [`src/ui/components/workspace/`](../../src/ui/components/workspace/) is
    the label in the header, after the name. The label shows alone, without
    an icon, as a
    plain Firna button: a pointer over it shows the hover fill, and the
    keyboard focus shows the focus ring. A press copies the link of the
    workspace, and a note under it says "Link copied" for a moment, over
    the content, so nothing moves. When the copy fails, the note says
    "The link didn't copy. Try again." in the danger colour. The note is
    a status, so screen readers hear it. The name of the button is "Copy
    link to W-395". On desktop, `ShortcutTip` in `src/components/common/`
    gives it the tooltip "Copy link to W-395 (⇧⌘C)", with the first key
    of Copy link that works where the page runs. A phone shows no key.
  - On desktop, the repository takes only the room that the other parts
    leave. The name is cut short only when the repository has no room left.
  - On a phone the label leads the line under the name, before the
    repository, so the name keeps its room. The button
    keeps the height of that line, and its touch area of 44 px reaches up
    over the name and down to the bottom edge of the header.
- `SandboxNotice` in `src/components/workspace/` draws the states of the
  cloud computer: stopped, error, archived, and refused. A refused start
  shows "The sandbox can't start" with the words of its cause and no
  action. The notice takes any refusal reason. An archived workspace
  offers Restore until its last day, and the bar gives that day and says
  that the workspace leaves the list then. A bar without Restore gives
  that day too. While an unresolved create request, or a delete that tries
  again, can still hold a cloud computer that the workspace does not name,
  the bar promises only the chat history, as `app/archive/pending` shows.
  After the last day, the workspace is removed: the bar says "Removed on"
  and the day, that the workspace left the list, and that the chat is
  read-only. It says that the cloud computer is being deleted while the
  workspace names it or such a request can still hold it, and that it is
  deleted only after the delete. Its panels say Removed.
  `sandboxNoticeState.ts` in
  [`src/ui/components/workspace/`](../../src/ui/components/workspace/) owns
  the types of the bar and the panels, which the app imports too. It also
  owns the stage of an archived
  workspace, which keeps what the app knows of the cloud computer apart
  from Restore.
  - For a suspended workspace owner, the history, the tabs, the header, and
    the owner picker stay, as `app/shell/refused` and its `reassign`
    variant show.
  - For a suspended org, the words name the org and the abuse address, as
    `app/orgs/suspended/workspace` shows. The New workspace page of such an
    org shows the same bar in place of the composer.
  - A phone shows the bar only on the Chat tab. So the panels of its Files,
    Terminal, and Preview tabs show the words of the refusal in
    place of the line on the chat history, as the `files` variants of
    `app/shell/refused` and `app/orgs/suspended/workspace` show. A desktop
    keeps its short panels beside the bar.
