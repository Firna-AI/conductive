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
The sidebar shows the org name with its Settings cog, New workspace, Automations, Search, and
the sections that the user made. Each workspace is one line: a dot-matrix
mark in the colour of its GitHub state, the name, and the time. A
sub-workspace shows indented under the row of its parent, and a top-level
row moves to another section by drag and drop, with the rows under it. Archive covers the time on
hover only, without moving the row content, and Restore does so in the
Archived group, which holds the archived workspaces of the last 14 days.
Selection and
keyboard focus alone keep the time visible. A right click on a row opens
the menu of the workspace. The centre column has a slim header that names
the
workspace and its number, such as `W-395`, the repository, and
the owner of the workspace, and ends with the toggle of the
right column. The toggle hides the right column, so the centre column
takes its width, and shows it again. Then come a tab for each agent
session, each open file or diff, and a Preview tab for each previewed
port, in the order that the user gives them by drag, + for a new
session, and a clock that opens the session history.
The file or diff of the last press shows in the temporary tab, with its
title in italics, until the next press replaces it.
The right column has the pull request bar on top, the All files, Changes,
and Checks lists below it, and the Terminal and Preview tabs at the bottom.
It shows no file content, and on desktop no page of a preview. A phone shows an org switcher at the top of the list,
then New workspace, Automations, and Search. It shows the
workspace with its number under its name, a compact pull request row, the
sessions as tabs above the chat, and four tabs at the bottom.

- The tokens live in [`src/ui/design/`](../../src/ui/design/): the
  colours of each scheme in `palette.ts`, and the type, density, sizes,
  radii, and fonts in `metrics.ts`. The renderer writes them as `--ui-*`
  CSS variables, and gives `@firna/ui` the same colours through its theme.
- The logo comes from the masters in `docs/brand/`, which
  [`src/ui/components/brand/Logo.module.css`](../../src/ui/components/brand/Logo.module.css)
  reads and only scales. The tile
  of the app icon stands alone at the top of the org rail. The lockup,
  with dark or light text for the scheme, names the product on the
  marketing site and the sign-in page. The macOS app icon shows in the
  notifications of the Mac app.
- `ActionButton` and `IconButton` in
  [`src/ui/components/common/actions.tsx`](../../src/ui/components/common/actions.tsx)
  give the Firna button the dense size and a lighter label. The `outline` tone of
  `ActionButton` keeps the border of the secondary tone without its fill, so
  the tint of a bar shows through, as on Stop of the 15 minutes bar and on
  Archive of the pull request bar.
- On a phone every touch target is at least 40 px high, as the user chose
  on 13 November 2026 for a thinner tab row. `MobileFrame` gives
  the Firna controls the touch sizes through `useControlSizes` in
  [`src/ui/components/common/touch.tsx`](../../src/ui/components/common/touch.tsx),
  and local controls read the `--ui-touch-min` variable, which is 0 on
  desktop.
- One `ModelPicker` in `src/components/chat/` sets the model and the effort
  in every composer, such as "Opus 5.5 High". It names no agent brand.
  [The model menu](design-model-menu.md) gives its menu, with the
  favourites first.
- A workspace or a session that has no name yet shows "Untitled", in the
  style of a name, from decisions 182 and 185. The list, the header, the
  session tabs, and the session history show it, as
  `app/new-workspace/creating/first-second` and `app/sessions` show.
  "New session" names only the action that opens a session. The label of
  +, the heading of the empty chat that + opens, and the spoken name of
  the icon on each model of the other agent say it.
- A view runs no script, so a screen draws an open menu in place: `Menu` in
  [`src/ui/components/common/`](../../src/ui/components/common/) beside its
  button or its tab, at the pointer of a right click, or in a `Sheet` on a
  phone. `PointMenu` in `src/components/common/` draws the menu of a right
  click on a row at the pointer, with an open submenu beside it, for a
  workspace row and a row of All files or Changes.
  Firna's own menu rows are taller than the dense design. A row can lead with a mark, such as an
  avatar, and end with a muted detail and an icon. An item that is off
  keeps its place, greyed, and its detail keeps the muted colour, so that
  the reason stays readable. An item with choices ends with an arrow, and
  its submenu opens beside the menu, level with the item.
  A switch row, such as Fast in the model menu, ends with its switch.
  Where the key of its command runs, `KeyChips` draws that key before the
  switch, as a palette row ends with its key. A phone shows no key.
  A move that the place of a tab rules out keeps its place, greyed.
  A read-only workspace leaves out each item that it does not allow,
  from decision 214.
- The app opens a menu beside its button in the top layer, so no box cuts
  it. `app/chat/menu-placement` draws such menus above the page, and CSS
  anchors place each one at its button.
- A sub-workspace shows under the row of its parent, from sub-workspace
  decisions 1 C, 4 F, 5 C, and 6 A, as `app/sub-workspaces` shows.
  `withTrees` in `src/components/workspaces/trees.ts` places the rows of
  each section with `placeWorkspaces`, the rule of the app in
  [`src/shared/workspace-tree.ts`](../../src/shared/workspace-tree.ts).
  So the mockups and the app place each row in the same way: a top-level
  row, then its sub-workspaces, oldest first, each followed by its own. A
  sub-workspace whose parent the list does not show, such as an archived
  parent, shows under the nearest live row above it in its tree, in the
  place of the archived row. Each level indents the row by one step, 12 px
  in the sidebar and 16 px on the list page of a phone, so a tree shows at
  most four levels. The indent follows the rows that the list shows, not
  the depth of the record. The guide lines join the rows of a tree as the
  lines of a file tree do, as the user asked on 17 November 2026. Each
  line is a 1 px hairline in the `border2` colour. In forced colours, the
  lines take the system colour of quiet text. A short stub runs down
  from the bottom of the mark of each row with nested rows. The line of
  that row then runs down under the middle of its mark. A short connector
  runs from that line to the mark of each nested row (├─). The line
  ends at the connector of the last nested row, in the middle of that row
  (└─). An outer line runs through a row only while its row has a nested
  row further down (│). Elsewhere its column stays empty. `treeLines` in
  [`src/shared/workspace-tree-lines.ts`](../../src/shared/workspace-tree-lines.ts)
  gives each row these facts. `withTrees` and the app both use it, so they
  draw the same lines. The guides are neutral lines of the tree, not an
  accent edge. They lie over the fill of a hover or a selection, and the
  fill still spans the whole row. The faint tree of a drag keeps its
  guides, and the lifted card shows none. A tree has no collapse control.
  `.nested` and `.indent1` to `.indent3` of `WorkspaceRow.module.css` in
  [`src/ui/components/workspaces/`](../../src/ui/components/workspaces/)
  draw the indent. `GuideLines.module.css` beside it draws the guides, and
  `guideClasses` in `guideLines.ts` beside them gives their classes. The
  app shares all three.
- Only a top-level row drags, and its whole tree moves with it. The lifted
  row stands for the tree: in place of its time it shows the count of the
  nested rows that move with it, such as +2, over the edge of a second
  card. The rows of the tree stay faint in their place, and the line falls
  only between two trees, at the edge of a top-level row, as
  `app/sub-workspaces/drag` shows. A nested row has no drag, no long press,
  no move by keys, and no Move to section.
- The menu of a workspace row has Move to section, Reassign to, Rename,
  Copy link, a line, then Archive, as `app/workspace-menu` shows. It lists
  only the actions that the person can use, from `workspaceMenu.ts` in
  [`src/ui/components/workspaces/`](../../src/ui/components/workspaces/).
  A nested row has no Move to section, because it moves only with its
  tree. Every row offers Copy link, so every row has a menu. `linkCopy.ts`
  in [`src/ui/components/workspace/`](../../src/ui/components/workspace/)
  gives the words of Copy link and of its result. The app
  reads the same list, so `workspaceMenu.ts` imports no fixture. A right
  click opens the menu at the pointer, from `RowMenu.tsx` in
  `src/components/workspaces/`, which draws it with `PointMenu`.
  Shift+F10 and the Menu key on a focused row open it below the row. No
  row has a button for the menu. The row under the pointer keeps its
  hover, with Archive over the time when the person can archive the
  workspace, and with Restore over the time of an archived row until its
  last day of Restore. The menu has no Restore. A phone layout opens the
  menu and its choices in a sheet. A
  long press on a phone still lifts the row for a drag, and opens no menu.
  Rename puts a field in place of the name and the time, with the name
  selected. `RowMenu.module.css` beside `workspaceMenu.ts` styles the
  field, and `PointMenu.module.css` in `src/components/common/` styles the
  menu at the pointer.
- The Merge queue group stands at the top of the list, above the
  sections, while a queue has entries, as `app/merge-queue` shows. It is
  the app's own group, as Archived is: it has no menu, and it collapses
  with the count of its entries. It holds one block for each queue, in the
  order of the repositories of the org. A block names its repository only
  while two or more queues have entries. Each row is the normal workspace
  row of a section, from `WorkspaceRow.tsx`: its list mark, its name, and
  its time, with its hover, its Archive, and its menu, as Cal asked on 22
  November 2026. A block lists the layers of its stack from place 1, which
  merges first, and a vertical line joins their list marks. The line is a
  1 px hairline in the `border2` colour, as the guide lines of a tree,
  under the middle of the marks. It runs from the bottom of the cells of
  one mark to the top of the cells of the next, so it does not cross a
  mark. It lies over the fill of a hover or a selection, and in forced
  colours it takes the system colour of quiet text. A block of one layer
  has no line. An entry that cannot merge keeps its place on the line,
  with the red or amber mark of its GitHub state and no label, because
  the user handles a failure, as Cal chose on 22 November 2026. A member
  stack has no outline, because the line already joins every entry. A
  drag of an entry lifts its unit, the rows of the unit stay faint in
  their place with their part of the line, and the drop line falls only
  between two units of its block, where the line opens. A row of a
  section over the group gives the block of its repository the outline
  and the soft fill of a drop target. A row that cannot join gives the
  block a dashed outline in the `border2` colour, with no fill and no drop
  line, and the reason after its rows,
  from `joinRefusalText` in `queueCopy.ts`. While no queue has entries,
  a drag shows no group, so the sections do not move down.
  `MergeQueueGroup.tsx` and `QueueBlock.tsx` in `src/components/workspaces/`
  draw it, with the shared
  [`MergeQueue.module.css`](../../src/ui/components/workspaces/MergeQueue.module.css).
  A queued workspace leaves its
  section, and `withTrees` places its sub-workspaces with the rule of an
  archived parent (decision 318 D). The menu of a row whose pull request
  can join adds Add to merge queue after the line of the menu, before
  Archive, and the menu of a queued row has Remove from queue and no Move
  to section.
- `OrgRail` in `src/components/layout/` draws the order of the orgs that
  each person keeps, from decisions 515 to 517, as `app/orgs/reorder`
  shows. A drag of a tile looks like the drag of a tab and of a workspace
  row: the tile lifts as a raised card, a faint copy stays at its place,
  and a line in the accent colour marks where it lands. The line takes no
  space, and the rail names no org during a drag. A right click on a tile
  opens its menu at the pointer: Move up and Move down, from
  `orgTileMenu.ts` in [`src/ui/components/orgs/`](../../src/ui/components/orgs/).
  Shift+F10 and the Menu key open it beside the tile. A move that the
  place of the tile rules out keeps its place, greyed. Create org,
  Operator, and the account have no menu. On a phone, a long press lifts
  an org in the org switcher with the same look, and opens no menu.
  `OrgDrop` in `src/components/orgs/` and `OrgDrag.module.css` beside
  `orgTileMenu.ts` draw the drag on the rail and in the org switcher.
- `OrgTile` in `src/components/orgs/` draws the initials and the outline
  of the open org in the colour of the org, as `app/org-settings/colour`
  shows. [`src/ui/design/orgColors.ts`](../../src/ui/design/orgColors.ts)
  gives the eight presets, each with its own ink and outline for the light
  and the dark scheme. Blue takes the accent. `OrgColorField` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/) draws
  the presets as round radio swatches, and a ring marks the chosen one.
- `FailureToast` in `src/components/common/` draws the toast that names a
  change of the list that failed, with the message of the server, in the
  `ToastLayer` beside it, as `app/workspace-menu/rename/failed` shows.
  Transcript copy and Copy path use the same layer. A copy that worked
  shows the success mark. A copy that failed shows the error mark with the
  words "Try again", as `app/transcripts` and `app/files/menu/copied`
  show.
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
  Keyboard shortcuts tab also uses. `PaletteEmpty.tsx` in
  [`src/ui/components/palette/`](../../src/ui/components/palette/) holds
  the empty state, which also answers a search of that tab without a
  match. A search
  also finds a workspace by the label of its number, such as `W-395` or
  `39`. A workspace row then shows the label before the name, as a chip
  does. On desktop, each command row ends with the first key of its
  command that works where the palette opens. The Mac app gives the page
  every key, so New workspace shows ⌘N there. A browser page draws a
  normal Chrome tab on a Mac, which keeps ⌘N, so New workspace shows ⌥⌘N.
  A workspace row shows no key, and a phone shows no keys. In the Mac app
  the Search row shows the person's key of the palette, such as ⇧⌘P.
- `KeyChips` in [`src/ui/components/common/`](../../src/ui/components/common/)
  draws a shortcut as small key
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
  and Try again. When the server answered but a service behind it did not,
  such as GitHub for the list of skills, its message names that service.
- `ConfirmDialog` in [`src/ui/components/common/`](../../src/ui/components/common/)
  asks before an action that a
  user cannot simply undo: a dialog over the dimmed app on desktop, and a
  sheet on a phone. The desktop dialog lies in the `overlay` of `AppFrame`.
  A question that runs its own action stays open while the action runs. A
  spinner then leads the confirming action, and Cancel is off, as
  `app/orgs/suspended/leave/leaving` shows. Escape and a press outside then
  do nothing, on desktop and in the sheet of a phone.
- `ToastLayer` in `src/components/common/` draws a toast of Firna open
  where the app shows its toasts: at the bottom right of a desktop, and
  across the bottom of a phone. An action that a user can undo, such as
  Archive, asks no question and offers the undo in its toast.
  `ArchivedToast` in `src/components/workspace/` gives the toast after
  Archive, over the workspace and over the list. Its second line gives the
  day when the workspace leaves the list.
- [The pull request bar](design-bar.md) gives its one main action in each
  state, the line under the bar, the branches and the actions on top of the
  Checks tab of a phone, and the question and the note of Continue.
- `NewWorkspaceDialog` in `src/components/new-workspace/` draws New
  workspace as a wide, compact dialog over the dimmed app, for a user who
  chose the dialog in Preferences. It lies in the layer and over the scrim
  of `ConfirmDialog`. The repository picker and the branch control
  directly right of it sit at the top left, and the org and the section of
  the new workspace, in plain text, at the top right. The target of a
  picked branch lives in the dropdown of the branch control, so no line
  follows the header (decision 309). The message and its files fill the
  middle, and the notices of the New workspace page follow them.
  The attach button, the Capabilities icon, and the model picker sit at
  the bottom left. The org login label follows the model picker when the
  first message uses it. Create, with the hint of the Enter key, sits at
  the bottom right. A phone always opens the page, so the dialog has no
  phone layout.
- [New workspace](design-new-workspace.md) gives the branch control of the
  page and of the dialog, its dropdown with the parts Start from and
  Target, and the refusals of the branch check.
- Settings holds the account and the settings of the current org, in one
  place. `SettingsDialog` in `src/components/settings/` draws it on a
  desktop: a large dialog over the whole window, with the rail and the
  sidebar under its scrim. Its left column, in the colour of the sidebar,
  lists the tabs in two groups, from `SettingsNav`: Account, with General,
  Agents, Preferences, Keyboard shortcuts, and Stats, then the org, with
  General, Repositories, Cloud computer, Agents, Secrets, and Members. The Mac app
  adds This Mac as the last tab of Account. The open tab fills the rest,
  under a bar with its name, its group, and Close. Each tab is a link with
  its own address. The dialog lies below the dialogs that a tab opens,
  such as Delete org.
- On a phone, Settings is a list screen, `app/settings`, whose rows open
  each tab as a screen of its own with Settings as the way back.
  Preferences holds the New
  workspaces section, whose rows put each label beside its control in two
  columns. A segmented control chooses how New workspace opens, with a
  helper line under it, and a narrow section puts it under its label. A
  failed save shows its error under the control.
- Stats uses the parts of the operator Overview: a box of tiles, the
  workspaces by state, and the daily charts. Its tiles are Workspaces with
  the new ones of 7 days, Running now, Automations, and Orgs. Its list of
  states has Removed after Archived, as the Overview has, for the
  workspaces that left the list. The Workspaces tile still counts them.
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
  of the header, and the marks of automation runs. They also give the mark of
  an agent.
- [Workspace, session, file, and skill chips](design-chat.md#workspace-session-file-and-skill-chips)
  gives the workspace links, the session links, file mentions, the list of
  `@`, skill chips, the list of `/`, and chip removal.
  [Links in text](design-links.md) gives the other links and `TextLink`.
- The parts of automations live in `src/components/automations/`. Their
  styles and the types and words of the triggers live in
  [`src/ui/components/automations/`](../../src/ui/components/automations/),
  because the app uses them too. The automation
  page puts its form beside the Runs column on desktop. A phone shows a
  saved automation in two tabs, Automation and Runs. The Runs list holds the
  newest 50 runs, and Show older runs ends it when older runs exist. A
  phone opens the Add trigger menu and the author filter of a pull request
  trigger in a sheet. The bar of the prompt box holds the Capabilities icon
  of the owner and the model picker, and the lines under the box say what
  the runs use, as
  [the Capabilities control](design-secrets.md#the-capabilities-control)
  says. A suspended org keeps its Automations link, and shows
  its automations read-only under its notice. `RunLinks` in
  `src/components/workspace/` draws the line under the header of a run
  workspace, which links to its automation and to its pull request. The pull
  request bar names the base branch of a workspace: the default branch, the
  picked branch of a start that stacks on it, or for a pull request run the
  head branch of its pull request. A long base
  branch ends in an ellipsis at half of the line. The
  bubble of a message keeps its line breaks, as in the app, so the first
  message of a run shows the facts of its trigger on their own lines.
  - `runCopy.ts` gives the words of a failed run from its stored cause, and
    from the agent and the owner of the run itself, not of its automation. So
    a later change of the agent, or a move of the automation to another owner,
    changes no past row. A failed start and a failed first turn keep their
    workspace, and their rows open it, as `app/automations/runs/failed` shows.
  - When the automation page cannot show its automation, the page keeps Automation
    as its name and shows no tabs, no Runs list, and no actions. An automation
    that the org no longer has shows the empty state "This automation is not
    available" with Open Automations. A read that failed shows `LoadFailure`.
    `app/automations/automation/unavailable` and `not-loaded` show them.
- `SuspendedOrgNotice` in
  [`src/ui/components/orgs/`](../../src/ui/components/orgs/) draws the
  notice of a suspended org, with the mark of a refused start. It names
  the org and
  the abuse address, and it offers no action. It is a box at the top of
  the list, of each settings tab, and of each view of an automation page, and
  above the bar of an archived workspace. A phone shows it above either
  tab of an automation page, as the `runs` variant of
  `app/orgs/suspended/automations/automation` shows. `SuspendedOrgPanel` shows the same words in the main area of
  a wide desktop list. `SuspendedOrgAbove` puts the box above the page of
  a deleted org, at the width of a tab of Settings. A suspended org shows no
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
- Members do not see the switch build of an operator, from switch decision
  2 D. A Build computer or Try again of an admin during that build waits
  until it ends. The Cloud computer tab shows such a build as a build that
  runs, because the tab and older copies of the Mac app know no state for
  a wait. Its time counts from Build computer, and the first line of its
  log says "Waiting for another update of the cloud computer to finish", as
  `app/org-settings/cloud-computer/building/waiting` shows. A build that an
  operator ended for a switch, from switch decision 3 D, shows as a failed
  build with Try again and the saved message "Another update of the cloud
  computer stopped this build. Try again.", as
  `app/org-settings/cloud-computer/build-failed/ended` shows. Neither text
  names the switch or a provider.
- The install script and the startup script show as code, with line
  numbers and the shell colours of a file tab. `CodeField` in
  `src/files/code/CodeField.tsx` of the repository draws the field of an
  admin, and `CodeBlock` beside it draws the script that another member
  reads, in the tinted block. The mockups and the app share both, as
  `components/files/code-field` and `components/files/code-block` show.
  The field grows with its lines and shows at least three. A long line
  wraps beside its number. Tab and Shift+Tab indent and outdent, Enter
  keeps the indent, and Escape, then Tab, moves the focus on. A screen
  reader reads these keys with the field.
- A new org has no image until its first build succeeds. Until then New
  workspace keeps Send off under a notice with the state of that build, as
  `app/new-workspace/first-build` shows. A notice of work that runs, such
  as that build, shows a spinner in place of its icon: `Notice` in
  [`src/ui/components/common/`](../../src/ui/components/common/) takes
  `busy`.
- A chosen repository that the cloud computer does not hold yet waits for
  its build, from decisions 240 and 241. The repository menu of New
  workspace keeps it in place, off, with the note of when it is ready as
  the muted detail of its row. A form whose repository waits keeps Send
  off under a notice. `WaitingRepositoryNotice` in
  [`src/ui/components/new-workspace/waitingRepository.tsx`](../../src/ui/components/new-workspace/waitingRepository.tsx)
  draws that notice, and `formWait` beside it says what the form waits
  for. The app shares that module. `RepositoryNotice` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/)
  draws the notice of the Repositories and Cloud computer tabs, with a
  spinner while the build of an added repository runs. An admin gets its
  Try again or Build computer on the Repositories tab only, because the
  build card of the Cloud computer tab has the same action.
  `repositoryChangeCopy.ts` beside it holds the words of both, which the
  app shares, as `app/new-workspace/waiting-repository` and
  `app/org-settings/repositories` show.
- On desktop the sidebar and the right column resize from `ResizeHandle` in
  [`src/ui/components/layout/`](../../src/ui/components/layout/), a
  hairline on their inner edge. On hover and
  during a drag a short grip in the accent colour shows in its middle, so no
  panel gets an accent edge. The same handle lies across the top edge of the
  tools panel, and moves the split between the file lists and the tools, as
  `app/panels/split` shows.
- The sidebar toggle hides the sidebar. In the browser it sits beside the
  cog of Settings, and in the Mac app beside the window buttons. While the
  sidebar is hidden, the tile of the current org opens the whole sidebar as
  a popover beside the rail, as `app/panels/list-popover` shows. In the Mac
  app the window controls then keep their width in the top left corner, as
  `mac-app/window/sidebar-popover` shows.
- A state tints a whole bar or box, and its edges stay neutral. No box has
  an accent strip on any edge.
- `sizes.ts` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  holds the one size formatter.
  The mockups, chat, and composer of a new workspace share it.
  The attachment fixtures hold byte counts.
  The formatter shows sizes such as "12 KB" and "1.2 MB".
- [The workspace](design-workspace.md) gives the messages that wait for
  the sandbox, the tab row with its temporary tab, the skill tab, and the
  number with Copy link. It also gives the bars of the cloud computer.
- [The chat](design-chat.md) gives the chips of attached files and the
  fold of the work of a turn. It also gives the data that the chat does
  not have, and the files that the cloud computer could not read. Its
  [Explain](design-chat.md#explain) section gives the marks in the text
  of the chat, and the popover of an explanation: a small panel by its
  mark on a computer, and a sheet on a phone.
- [The Markdown of replies](design-markdown.md) gives the tables, the
  headings, the quotes, the rules, the marks, the line breaks, and the
  pictures of a reply and of a file preview, and how a message line in the
  work of a turn shows them.
- [Secrets and Capabilities](design-secrets.md) gives the Secrets tab of
  the org settings, the Capabilities icon beside every message box with
  its control, and the requests and results of the secrets in the chat.
- The app frame is a size container (`app-frame`), so the layout follows the
  width of the frame, not of the window. In the app the two are the same. A
  screen is as high as `--ui-screen-height`, which is the visible part of
  the window (`100dvh`, so that a phone page does not scroll behind the
  app while the browser bars show), or the frame of a picture on the
  marketing site.
- [The operator section](design-operator.md) gives its tabs, its tables,
  the Waitlist tab, the codes, and the approval email. It also gives
  Suspend, Lift, and Approve, the daily chart, the notice of a pause, and
  the waitlist switch.
- On a phone the session tabs all shrink, and the current one keeps the start
  of its title beside its close button. When the session tabs still do not
  fit, their row scrolls sideways. A phone tab stays 40 px high to touch,
  but its fill is 32 px high, with 4 px of the row above and below it.
