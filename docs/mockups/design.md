# The design

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The design is Graphite: dark-first, with near-black surfaces, cool greys, and
one bright sky accent for what is active, such as the selected rail item, a
working agent, and the main action. It is dense, with small radii, and its
labels (tabs, section names, times) use the monospace font in capitals. The
light scheme uses the same cool greys and a darker accent.

The desktop layout has four columns. The org rail holds the mark, the orgs
as squares with their initials, Create org, and the account at the bottom.
The sidebar shows the org name with its Settings link, New workspace, Routines, Search, and
the sections that the user made. Each workspace is one line: a dot-matrix
status mark, the name, and the time, and it moves to another section by
drag and drop. Archive covers the time on hover only, without moving the
row content, and Restore does so in the Archived group. Selection and
keyboard focus alone keep the time visible. A right click on a row opens
the menu of the workspace. The centre column has a slim header that names
the
workspace and its number, such as `W-395`, the repository, and
the owner of the workspace, and ends with the toggle of the
right column. The toggle hides the right column, so the centre column
takes its width, and shows it again. Then come a tab for each agent
session and each open file or diff, in the order that the user gives them
by drag, + for a new session, and a clock that opens the session history.
The right column has the pull request bar on top, the All files, Changes,
and Checks lists below it, and the Terminal and Preview tabs at the bottom.
It shows no file content. A phone shows an org switcher at the top of the list,
then New workspace, Routines, and Search. It shows the
workspace with its number under its name, a compact pull request row, the
sessions as tabs above the chat, and four tabs at the bottom.

- The tokens live in `src/design/`: the colours of each scheme in
  `palette.ts`, and the type, density, sizes, radii, and fonts in
  `metrics.ts`. The renderer writes them as `--ui-*` CSS variables, and gives
  `@firna/ui` the same colours through its theme.
- The logo comes from the masters in `docs/brand/`, which
  `src/components/brand/Logo.module.css` reads and only scales. The tile
  of the app icon stands alone at the top of the org rail. The lockup,
  with dark or light text for the scheme, names the product on the
  marketing site and the sign-in page. The macOS app icon shows in the
  notifications of the Mac app.
- `ActionButton` and `IconButton` in `src/components/common/actions.tsx` give
  the Firna button the dense size and a lighter label.
- On a phone every touch target is at least 44 px high. `MobileFrame` gives
  the Firna controls the touch sizes through `useControlSizes` in
  `src/components/common/touch.tsx`, and local controls read the
  `--ui-touch-min` variable, which is 0 on desktop.
- One `ModelPicker` in `src/components/chat/` sets the model and the effort
  in every composer, such as "Opus 5.5 High". It names no agent brand. In a
  session with messages, each model of the other agent ends with the
  external link icon, because it opens a new session with the draft, from
  decision 51. A screen reader says "New session" for the icon.
- A workspace or a session that has no name yet shows "Untitled", in the
  style of a name, from decisions 182 and 185. The list, the header, the
  session tabs, and the session history show it, as
  `app/new-workspace/creating/first-second` and `app/sessions` show.
  "New session" names only the action that opens a session. The label of
  +, the heading of the empty chat that + opens, and the spoken name of
  the icon on each model of the other agent say it.
- While a sandbox starts, also for the first time, Send queues each
  message in the workspace, as `app/new-workspace/waiting` shows. A queued
  message has no label of its own, because the start steps under the chat
  already show the wait. After a failed first start, the bar of the error
  sits above the composer, so members can still queue messages, as
  `app/new-workspace/error` shows. Every other bar of the sandbox takes
  the place of the composer.
- A view runs no script, so a screen draws an open menu in place: `Menu` in
  `src/components/common/` beside its button or its tab, at the pointer of
  a right click, or in a `Sheet` on a phone. Firna's own menu rows are
  taller than the dense design. A row can lead with a mark, such as an
  avatar, and end with a muted detail and an icon. An item that is off
  keeps its place, greyed, and its detail keeps the muted colour, so that
  the reason stays readable. An item with choices ends with an arrow, and
  its submenu opens beside the menu, level with the item.
  A move that the place of a tab rules out keeps its place, greyed.
  A read-only workspace leaves out each item that it does not allow,
  from decision 214.
- The menu of a workspace row has Move to section, Reassign to, Rename, a
  line, then Archive, as `app/workspace-menu` shows. It lists only the
  actions that the person can use, from `workspaceMenu.ts` in
  `src/components/workspaces/`, and a row with none has no menu. The app
  reads the same list, so `workspaceMenu.ts` imports no fixture. A right
  click opens the menu at the pointer, from `RowMenu.tsx` beside it.
  Shift+F10 and the Menu key on a focused row open it below the row. No
  row has a button for the menu. The row under the pointer keeps its
  hover, with Archive over the time when the person can archive the
  workspace, and with Restore over the time of an archived row until its
  last day of Restore. The menu has no Restore. A phone layout opens the
  menu and its choices in a sheet. A
  long press on a phone still lifts the row for a drag, and opens no menu.
  Rename puts a field in place of the name and the time, with the name
  selected. `RowMenu.module.css` styles the field and the menu at the
  pointer.
- `FailureToast` in `src/components/common/` draws the toast that names a
  change of the list that failed, with the message of the server, in the
  `ToastLayer` beside it, as `app/workspace-menu/rename/failed` shows.
  Transcript copy uses the same layer. A copy that worked shows the
  success mark. A copy that failed shows the error mark with the words
  "Try again", as `app/transcripts` shows.
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
  right, from decisions 188 and 215. A file or diff tab has only the moves.
  In a read-only workspace, the menu of a session tab holds only the two
  copy items, and a file or diff tab opens no menu. A copy keeps the shown
  tab, and a toast gives its result, as `app/transcripts` shows. The menu
  is the one way to rename a session, so no tab shows a rename button.
  Rename session opens a field in place of the title of that tab, also when
  the tab does not show. The field marks that tab, which takes no fill, so
  only the shown tab is filled. On a phone, a long press that ends without a
  move opens the menu as a sheet. `WorkspaceTabs.module.css` styles the row
  and its tabs. `TabScroll.module.css` styles a full row, `TabDrag.module.css`
  a drag, and `TabRename.module.css` the rename field. The app shares these
  modules.
- `SignInFrame` in `src/screens/signInFrame.tsx` draws the pages before the
  app opens: the wordmark, one card in the middle, and the legal links. The
  sign-in, the sign-in of an invite link, and the waitlist share it, without
  the rail. A phone draws the card without its outline. The waitlist uses
  the wider card, for its invitations and its code field. In the Mac app
  its header is the top bar of the window, as [the Mac app](mac-app.md)
  gives.
- `CommandPalette` in `src/components/palette/` draws the command palette:
  a dialog near the top of the window over a light dim on desktop, and a
  page in place of the list on a phone. It has the search field, the tabs
  All, Workspaces, Actions, and Settings, the filters of the Workspaces
  tab, the groups of results, and the empty state. While the workspace
  data loads, or after its read failed, a status part stands first in
  place of the workspace groups: a spinner, or `LoadFailure`. The list and
  the workspace screens own it as their `palette` state. The Search row
  under New workspace opens it, and on desktop that row shows ⌘K.
  `paletteSearch.ts` beside it holds the rule of a search. A search also
  finds a workspace by the label of its number, such as `W-395` or `39`.
  A workspace row then shows the label before the name, as a chip does.
- `LoadFailure` in `src/components/common/` draws data that did not load,
  as the lists of the app show it: what failed, the message of the server,
  and Try again.
- `ConfirmDialog` in `src/components/common/` asks before an action that a
  user cannot simply undo: a dialog over the dimmed app on desktop, and a
  sheet on a phone. The desktop dialog lies in the `overlay` of `AppFrame`.
- `ToastLayer` in `src/components/common/` draws a toast of Firna open
  where the app shows its toasts: at the bottom right of a desktop, and
  across the bottom of a phone. An action that a user can undo, such as
  Archive, asks no question and offers the undo in its toast.
  `ArchivedToast` in `src/components/workspace/` gives the toast after
  Archive, over the workspace and over the list.
- `NewWorkspaceDialog` in `src/components/new-workspace/` draws New
  workspace as a wide, compact dialog over the dimmed app, for a user who
  chose the dialog in Preferences. It lies in the layer and over the scrim
  of `ConfirmDialog`. The repository picker sits at the top left, and the
  org and the section of the new workspace, in plain text, at the top
  right. The message and its files fill the middle, and the notices of the
  New workspace page follow them. The model picker sits at the bottom left,
  and the attach button and Create, with the hint of the Enter key, at the
  bottom right. A phone always opens the page, so the dialog has no phone
  layout.
- The account has two tabs, General and Preferences, as links, as the org
  settings have. Preferences holds the New workspaces section, whose rows
  put each label beside its control in two columns. A segmented control
  chooses how New workspace opens, with a helper line under it, and a
  narrow section puts it under its label. A failed save shows its error
  under the control.
- `AgentMark` in `src/components/chat/` marks the agent of a session with two
  letters on a small tile, CL or CX, because the app draws no brand logo.
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
    link to W-395".
  - On desktop, the repository takes only the room that the other parts
    leave. The name is cut short only when the repository has no room left.
  - On a phone the label leads the line under the name, before the
    repository, so the name keeps its room. The button
    keeps the height of that line, and its touch area of 44 px reaches up
    over the name and down to the bottom edge of the header.
- [Workspace and file chips](design-chat.md#workspace-and-file-chips) gives
  the workspace links, file mentions, the list of `@`, and chip removal.
- `StatusGlyph` in `src/components/workspaces/` draws the state of a
  workspace as a 3 × 3 dot-matrix square. Each state has its own shape, and
  working and starting move with CSS. A finished turn is a full bright green
  square, and ready is one bright cell on a faint green grid. A workspace
  whose agent waits for the user, such as for the approval of a command,
  shows Needs input: a middle column in the accent colour that pulses.
  A routine run takes the mark of its workspace. A run without a
  workspace shows an hourglass while it waits for one, and a chevron when
  a rule skipped it. A failed run shows the mark of its failure. It keeps
  that mark after Try again, because the run keeps its failed outcome.
  - A run whose first start failed shows the cross, as its workspace in
    the error state does.
  - A run that a check failed before it had a workspace, and a run whose
    first turn failed, show a slash in rose. After a failed turn, the mark
    of the workspace shows a finished turn, which would hide the failure.
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
- The parts of routines live in `src/components/routines/`. The routine
  page puts its form beside the Runs column on desktop. A phone shows a
  saved routine in two tabs, Routine and Runs. The Runs list holds the
  newest 50 runs, and Show older runs ends it when older runs exist. A
  phone opens the Add trigger menu and the author filter of a pull request
  trigger in a sheet. A suspended org keeps its Routines link, and shows
  its routines read-only under its notice. `RunLinks` in
  `src/components/workspace/` draws the line under the header of a run
  workspace, which links to its routine and to its pull request. The pull
  request bar names the base branch of a workspace: the default branch, or
  for a pull request run the head branch of its pull request. A long base
  branch ends in an ellipsis at half of the line. The
  bubble of a message keeps its line breaks, as in the app, so the first
  message of a run shows the facts of its trigger on their own lines.
  - `runCopy.ts` gives the words of a failed run from its stored cause, and
    from the agent and the owner of the run itself, not of its routine. So
    a later change of the agent, or a move of the routine to another owner,
    changes no past row. A failed start and a failed first turn keep their
    workspace, and their rows open it, as `app/routines/runs/failed` shows.
  - When the routine page cannot show its routine, the page keeps Routine
    as its name and shows no tabs, no Runs list, and no actions. A routine
    that the org no longer has shows the empty state "This routine is not
    available" with Open Routines. A read that failed shows `LoadFailure`.
    `app/routines/routine/unavailable` and `not-loaded` show them.
- `SuspendedOrgNotice` in `src/components/orgs/` draws the notice of a
  suspended org, with the mark of a refused start. It names the org and
  the abuse address, and it offers no action. It is a box at the top of
  the list, of each settings tab, and of each view of a routine page, and
  above the bar of an archived workspace. A phone shows it above either
  tab of a routine page, as the `runs` variant of
  `app/orgs/suspended/routines/routine` shows. `SuspendedOrgPanel` shows the same words in the main area of
  a wide desktop list. `SuspendedOrgAbove` puts the box above the page of
  a deleted org, at the width of a settings page. A suspended org shows no
  action that it refuses.
- Copy says cloud computer or sandbox. No screen names Boat, also not the
  marketing site or Get started.
- [The cloud computer](design-cloud-computer.md) gives the time limits of
  builds, refreshes, and starts, the first build of a new org, the
  repositories that wait for a build, the one name of the app's own
  software, the builds and refreshes of the Cloud computer tab, and the
  updates of an old workspace.
- On desktop the sidebar and the right column resize from `ResizeHandle` in
  `src/components/layout/`, a hairline on their inner edge. On hover and
  during a drag a short grip in the accent colour shows in its middle, so no
  panel gets an accent edge.
- A state tints a whole bar or box, and its edges stay neutral. No box has
  an accent strip on any edge.
- `sizes.ts` in `src/components/chat/` holds the one size formatter.
  The mockups, chat, and composer of a new workspace share it.
  The attachment fixtures hold byte counts.
  The formatter shows sizes such as "12 KB" and "1.2 MB".
- [The chat](design-chat.md) gives the chips of attached files, the
  Markdown tables of a reply and of a file preview, and the fold of the work
  of a turn. It also gives the data that the chat does not have, and the
  files that the cloud computer could not read.
- The app frame is a size container (`app-frame`), so the layout follows the
  width of the frame, not of the window. In the app the two are the same. A
  screen is as high as `--ui-screen-height`, which is the window, or the
  frame of a picture on the marketing site.
- [The operator section](design-operator.md) gives its tabs, its tables,
  the Waitlist tab, the codes, and the approval email. It also gives
  Suspend, Lift, and Approve, the daily chart, the notice of a pause, and
  the waitlist switch.
- On a phone the org settings put their four tabs in three columns, so every
  tab shows. The session tabs all shrink, and the current one keeps the start
  of its title beside its close button. When the session tabs still do not
  fit, their row scrolls sideways.
