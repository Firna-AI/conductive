# The design of the workspace

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
messages that wait for the sandbox and the tab row of the centre column,
with its temporary tab. It also gives the number of a workspace with Copy
link, and the bars of the cloud computer.

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
  tab opens its menu at the pointer: Rename session, a line, Copy concise
  transcript and Copy full transcript, a line, then Move left and Move
  right, from decisions 188 and 215. A kept file or diff tab has only the
  moves. In a read-only workspace, the menu of a session tab holds only the
  two copy items, and a file or diff tab opens no menu. A copy keeps the shown
  tab, and a toast gives its result, as `app/transcripts` shows. The menu
  is the one way to rename a session, so no tab shows a rename button.
  Rename session opens a field in place of the title of that tab, also when
  the tab does not show. The field marks that tab, which takes no fill, so
  only the shown tab is filled. On a phone, a long press that ends without a
  move opens the menu as a sheet. `WorkspaceTabs.module.css` styles the row
  and its tabs. `TabScroll.module.css` styles a full row, `TabDrag.module.css`
  a drag, and `TabRename.module.css` the rename field. The app shares these
  modules.
- The temporary tab, from decisions 284 to 287, is the one file or diff tab
  that the next press on a file or a diff replaces, as
  `app/files/temporary` shows. A press on a row of All files or Changes, or
  on a file chip, opens the file or the diff in the temporary tab. When the
  row has no temporary tab, it opens at the end of the row. Otherwise the
  press replaces its file in the same place, also when a later tab stands
  after it. A press on a file that has a tab shows that tab. The title of
  the temporary tab shows in italics, also on the lifted copy of a drag,
  and nothing else on the tab changes. A screen reader hears its name, then
  ", temporary". The tab menu and the move messages keep the plain name. A
  double-click on the tab or on the row of its file keeps it as a normal
  tab, with an upright title, in its place. Its tab menu leads with Keep
  open, which keeps it too, then a line, then Move left and Move right.
  Keep open has the icon of a bookmark with a check, because a pin names
  the pinned tabs of a browser. A drag, Move left, or Move right that
  changes its place keeps it. A drag that Escape cancels, or that ends in
  the same place, keeps it temporary. A phone row shows no file tabs, so a
  phone draws no temporary tab. `.temporary` of `WorkspaceTabs.module.css`
  styles the title.
- Each workspace has a number in its org, and `workspaceLabel` in
  `src/components/workspaces/label.ts` shows it as `W-395`. The number
  shows in the header, in chips, and in a row of the command palette
  whose search matches it. The rows of the list keep their layout.
  - `CopyLinkButton` in `src/components/workspace/` is the label in the
    header, after the name. The label shows alone, without an icon, as a
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
  offers Restore until its last day, and the bar gives that day. After
  it, the bar gives the day when Restore ended while a failed delete of
  the cloud computer tries again, and it says that the cloud computer is
  deleted only after the delete. `sandboxNoticeState.ts` beside it owns
  the types of the bar and the panels, which the app imports too.
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
