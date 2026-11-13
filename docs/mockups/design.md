# The design

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The design is Graphite: dark-first, with near-black surfaces, cool greys, and
one bright sky accent for what is active, such as the selected rail item,
the mark of a working agent in the header, and the main action. It is
dense, with small radii, and its labels (tabs, section names, times) use
the monospace font in capitals. The light scheme uses the same cool greys
and a darker accent.

The desktop layout has four columns. The org rail holds the mark, the orgs
as squares with their initials, Create org, and the account at the bottom.
The sidebar shows the org name with its Settings link, New workspace, Routines, Search, and
the sections that the user made. Each workspace is one line: a dot-matrix
mark in the colour of its GitHub state, the name, and the time, and it
moves to another section by drag and drop. Archive covers the time on
hover only, without moving the row content, and Restore does so in the
Archived group. Selection and
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
  the Firna button the dense size and a lighter label. The `outline` tone of
  `ActionButton` keeps the border of the secondary tone without its fill, so
  the tint of a bar shows through, as on Stop of the 15 minutes bar and on
  Archive of the pull request bar.
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
- The menu of a workspace row has Move to section, Reassign to, Rename,
  Copy link, a line, then Archive, as `app/workspace-menu` shows. It lists
  only the actions that the person can use, from `workspaceMenu.ts` in
  `src/components/workspaces/`. Every row offers Copy link, so every row
  has a menu. `linkCopy.ts` in `src/components/workspace/` gives the words
  of Copy link and of its result. The app
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
- `OrgRail` in `src/components/layout/` draws the order of the orgs that
  each person keeps, from decisions 515 to 517, as `app/orgs/reorder`
  shows. A drag of a tile looks like the drag of a tab and of a workspace
  row: the tile lifts as a raised card, a faint copy stays at its place,
  and a line in the accent colour marks where it lands. The line takes no
  space, and the rail names no org during a drag. A right click on a tile
  opens its menu at the pointer: Move up and Move down, from
  `orgTileMenu.ts` in `src/components/orgs/`. Shift+F10 and the Menu key
  open it beside the tile. A move that the place of the tile rules out
  keeps its place, greyed. Create org, Operator, and the account have no
  menu. On a phone, a long press lifts an org in the org switcher with the
  same look, and opens no menu. `OrgDrop` and `OrgDrag.module.css` beside
  `orgTileMenu.ts` draw the drag on the rail and in the org switcher.
- `FailureToast` in `src/components/common/` draws the toast that names a
  change of the list that failed, with the message of the server, in the
  `ToastLayer` beside it, as `app/workspace-menu/rename/failed` shows.
  Transcript copy uses the same layer. A copy that worked shows the
  success mark. A copy that failed shows the error mark with the words
  "Try again", as `app/transcripts` shows.
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
  `paletteSearch.ts` beside it holds the rule of a search, which the
  Keyboard shortcuts tab also uses. `PaletteEmpty.tsx` holds the empty
  state, which also answers a search of that tab without a match. A search
  also finds a workspace by the label of its number, such as `W-395` or
  `39`. A workspace row then shows the label before the name, as a chip
  does. On desktop, each command row ends with the first key of its
  command that works where the palette opens. The Mac app gives the page
  every key, so New workspace shows ⌘N there. A browser page draws a
  normal Chrome tab on a Mac, which keeps ⌘N, so New workspace shows ⌥⌘N.
  A workspace row shows no key, and a phone shows no keys. In the Mac app
  the Search row shows the person's key of the palette, such as ⇧⌘P.
- `KeyChips` in `src/components/common/` draws a shortcut as small key
  chips, one for each key: ⌘ then K on a Mac, and Ctrl then K on Windows,
  whose modifiers show as words. The chips use the sans font, which draws
  ⌘, ⌥, ⇧, ⌃, ⌫, and ⌦ on every system. A dimmed shortcut, which does not
  work where the page runs, has an outline with dashes, no fill, and muted
  text. The Search row keeps its text hint in the label font.
- `SearchField` in `src/components/common/` draws the search field at the
  top of a list that it narrows: the repositories of an org, the tabs of
  the operator, and Keyboard shortcuts.
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
- [The pull request bar](design-bar.md) gives its one main action in each
  state, the line under the bar, the actions on top of the Checks tab of a
  phone, and the question and the note of Continue.
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
- The account has three tabs, General, Preferences, and Keyboard
  shortcuts, as links, as the org settings have. On a phone, a tab that
  does not fit moves to a second line. Preferences holds the New
  workspaces section, whose rows put each label beside its control in two
  columns. A segmented control chooses how New workspace opens, with a
  helper line under it, and a narrow section puts it under its label. A
  failed save shows its error under the control.
- `ShortcutsSections` in `src/components/settings/` draws the Keyboard
  shortcuts tab, in the Mac app and in each browser. It shows the keys of
  a host: the Mac app, a normal tab of Chrome or Firefox, or the installed
  app of Chrome, with a Mac keyboard or the keyboard of Windows and
  Linux. `src/fixtures/shortcutHosts.ts` holds the keyboard of each host,
  `browserTabKeys.ts` beside it holds the keys that each normal browser
  tab keeps, and `windowsShortcuts.ts` holds the keys of Windows and
  Linux. A search field at the top keeps each row whose label or search
  words hold every word of the query, by the rule of the palette, from
  `shortcutSearch.ts`.
  Fixed rows match too. A group without a matching row hides, and a search
  without a match says so, as the palette does. The lines under the field,
  from `ShortcutIntro.tsx`, say how to change a shortcut and which keys
  the terminal keeps on the keyboard of the page. In a normal browser tab,
  a key that the browser keeps, or that decisions 192 and 196 leave to it,
  is dimmed, and one more line says where the dimmed keys work. A dimmed key
  stays a button that records new keys. A browser leaves out the commands
  and the groups that only the Mac app has. Each group of commands is a
  section with its rows in one box. A row ends with its shortcuts. Each
  shortcut is a button that records new keys, + adds one, and a row
  without a shortcut shows Add shortcut. The commands that a person can
  change come first, and the fixed shortcuts follow them with no control.
  A fixed row among other commands shows Fixed shortcut. The General group
  ends with Esc and with Enter and Space, which press a focused button. The
  Navigation group ends with the keys that open the menu of a focused tab,
  and the Workspace group with the fixed keys of a focused workspace row and
  of a focused divider. Each of their labels names the control that has the
  focus. The Chat group ends with the keys of the message field, and its
  Send row shows Enter with ⌘ or Ctrl, so the tab shows that Enter with a
  modifier is fixed too. A group of fixed shortcuts says it once, under its
  title. The Text group lists the text keys of the keyboard, with the keys
  that move or delete by word or by line in one row each, and its line
  says that the other text keys are fixed too. A narrow box, on a phone or
  in a narrow window, puts the label of a row on its first line, and the
  shortcuts and the control at the end on a second line. The recorder is a
  field with a full outline in the accent colour. While it replaces a
  shortcut, Remove stands beside Cancel. A recorder that adds a shortcut
  shows only Cancel. A line under the row names a fixed shortcut that the
  recorder did not take, the command that has the recorded shortcut, or a
  failed save. The line of a fixed shortcut names its fixed row. When
  several rows hold the shortcut, or no row lists it, the line says only
  that the shortcut is fixed. A row that names the command of a recorded
  shortcut shows only Replace and Cancel. A changed row shows Reset. When
  another command holds a default shortcut of the row, Reset shows that
  shortcut in the field of the recorder, the line that names the command,
  and Replace and Cancel. Reset all asks first with `ConfirmDialog`,
  because nothing brings the changes back. The error of a failed Reset all
  stands under the lines and Reset all, across the width of the tab.
- [The marks](design-marks.md) give the list mark, the mark
  of the header, and the marks of routine runs. They also give the mark of
  an agent.
- [Workspace, session, and file chips](design-chat.md#workspace-session-and-file-chips)
  gives the chips, the list of `@`, and chip removal.
  [Links in text](design-links.md) gives the other links and `TextLink`.
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
- A build of the cloud computer runs for at most 60 minutes, and a start of
  a sandbox for at most 20 minutes. A build that runs names its limit under
  its log. The start card does not name the limit of a start. A failed
  build or start shows the message that the app saved for it, so a job that
  passed its limit names that limit, as
  `app/org-settings/cloud-computer/build-failed/time-limit`,
  `app/shell/error/time-limit`, and `app/new-workspace/time-limit` show.
- A new org has no image until its first build succeeds. Until then New
  workspace keeps Send off under a notice with the state of that build, as
  `app/new-workspace/first-build` shows. A notice of work that runs, such
  as that build, shows a spinner in place of its icon: `Notice` in
  `src/components/common/` takes `busy`.
- A chosen repository that the cloud computer does not hold yet waits for
  its build, from decisions 240 and 241. The repository menu of New
  workspace keeps it in place, off, with the note of when it is ready as
  the muted detail of its row. A form whose repository waits keeps Send
  off under a notice. `WaitingRepositoryNotice` in
  `src/components/new-workspace/waitingRepository.tsx` draws that notice,
  and `formWait` beside it says what the form waits for. The app shares
  that module. `RepositoryNotice` in `src/components/settings/`
  draws the notice of the Repositories and Cloud computer tabs, with a
  spinner while the build of an added repository runs. An admin gets its
  Try again or Build computer on the Repositories tab only, because the
  build card of the Cloud computer tab has the same action.
  `repositoryChangeCopy.ts` beside it holds the words of both, which the
  app shares, as `app/new-workspace/waiting-repository` and
  `app/org-settings/repositories` show.
- On desktop the sidebar and the right column resize from `ResizeHandle` in
  `src/components/layout/`, a hairline on their inner edge. On hover and
  during a drag a short grip in the accent colour shows in its middle, so no
  panel gets an accent edge. The same handle lies across the top edge of the
  tools panel, and moves the split between the file lists and the tools, as
  `app/panels/split` shows.
- A state tints a whole bar or box, and its edges stay neutral. No box has
  an accent strip on any edge.
- `sizes.ts` in `src/components/chat/` holds the one size formatter.
  The mockups, chat, and composer of a new workspace share it.
  The attachment fixtures hold byte counts.
  The formatter shows sizes such as "12 KB" and "1.2 MB".
- [The workspace](design-workspace.md) gives the messages that wait for
  the sandbox, the tab row, and the number with Copy link. It also gives
  the bars of the cloud computer.
- [The chat](design-chat.md) gives the chips of attached files, the
  Markdown tables and headings of a reply and of a file preview, and the
  fold of the work of a turn. It also gives the data that the chat does
  not have, and the files that the cloud computer could not read.
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
