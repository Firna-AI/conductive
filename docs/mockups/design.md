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
The sidebar shows the org name with its Settings link, New workspace, and
the sections that the user made. Each workspace is one line: a dot-matrix
status mark, the name, and the time, and it moves to another section by
drag and drop. The centre column has a slim header that names the
workspace and its number, such as `W-395`, the repository, the branch, and
the owner of the workspace, and ends with Archive and the toggle of the
right column. The toggle hides the right column, so the centre column
takes its width, and shows it again. Then come a tab for each agent
session and each open file or diff, in the order that the user gives them
by drag, + for a new session, and a clock that opens the session history.
The right column has the pull request bar on top, the All files, Changes,
and Checks lists below it, and the Terminal and Preview tabs at the bottom.
It shows no file content. A phone shows an org switcher at the top of the list, and the
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
  session with messages, each model of the other agent says "New session",
  because it opens a new session with the draft, from decision 51.
- A workspace or a session that has no name yet shows "Untitled", in the
  style of a name, from decisions 182 and 185. The list, the header, the
  session tabs, and the session history show it, as
  `app/new-workspace/creating/first-second` and `app/sessions` show.
  "New session" names only the action that opens a session. The label of
  +, the heading of the empty chat that + opens, and each model of the
  other agent say it.
- While a sandbox starts, also for the first time, Send queues each
  message in the workspace. Each queued message shows "Sends when the
  sandbox is ready", as `app/new-workspace/waiting` shows. After a failed
  first start, the bar of the error sits above the composer, so members
  can still queue messages, as `app/new-workspace/error` shows. Every
  other bar of the sandbox takes the place of the composer.
- A view runs no script, so a screen draws an open menu in place: `Menu` in
  `src/components/common/` beside its button or its tab, or in a `Sheet` on
  a phone. Firna's own menu rows are taller than the dense design. A row can
  lead with a mark, such as an avatar, and end with a muted detail and an
  icon. An item that is off keeps its place, greyed.
- `WorkspaceTabs` in `src/components/workspace/` draws the tab row of the
  centre column, from decisions 186 to 188, as `app/tabs` shows. Any tab
  moves to any place in the row by drag, or by a long press on a phone, and
  a new tab opens at the end of the row. A drag looks like the drag of a
  workspace row: the tab lifts as a raised card, a faint copy stays at its
  place, and a line in the accent colour marks where it lands. The line
  stands between two tabs and takes no space. When the tabs do not fit at
  their minimum width, the row scrolls sideways with no scrollbar, keeps the
  shown tab in view, and fades each end that clips tabs. A right click on a
  tab opens its menu at the pointer: Rename session, a line, then Move left
  and Move right. A file or diff tab has only the moves. The menu is the one
  way to rename a session, so no tab shows a rename button. Rename session
  opens a field in place of the title of that tab, also when the tab does
  not show. The field marks that tab, which takes no fill, so only the shown
  tab is filled. On a phone, a long press that ends without a move opens the
  menu as a sheet. `WorkspaceTabs.module.css` styles the row and its tabs.
  `TabScroll.module.css` styles a full row, `TabDrag.module.css` a drag, and
  `TabRename.module.css` the rename field. The app shares these modules.
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
  - On desktop, the repository and the branch share one group in place of
    the spacer. The group takes only the room that the other parts leave,
    so the name is cut short only when the group has no room left.
  - On a phone the label leads the line under the name, before the
    repository and the branch, so the name keeps its room. The button
    keeps the height of that line, and its touch area of 44 px reaches up
    over the name and down to the bottom edge of the header.
- `WorkspaceChip` in `src/components/chat/` draws a link to a workspace of
  the org as a chip in a line of text: a small rounded pill with the
  `StatusGlyph` of the workspace, its label in a muted colour, and its
  current name. Its height is the height of the line less 2 px, so a line
  with a chip keeps its height. A chip is never wider than its line or
  than 22 times the size of its font, and a long name is cut short. It
  takes no fixtures, so the app can use it too.
  - `MessageText` shows the chips in sent messages and in answers, as
    links to the screens of the workspaces. A Markdown link to a
    workspace shows as the chip alone, and a link in code stays code. A
    link to another org, or to a workspace that the list does not hold,
    stays plain text, and a long link breaks to fit the line.
  - The chat finds each workspace in the list of the org, with the
    archived ones and with the states of the list, through
    `ChatWorkspaces`. A phone finds the same workspaces with no list on
    the screen. An archived workspace keeps its chip, with the archived
    mark.
  - A pasted link becomes a chip in the message box at once: in the chat,
    and in New workspace as a page or a dialog. `MessageField` gives each
    box its field. A draft with a workspace link shows in `ChipTextField`:
    plain text with each chip as one unit, with the sizes and the line
    limits of the plain text field. The draft keeps the plain link.
- `StatusGlyph` in `src/components/workspaces/` draws the state of a
  workspace as a 3 × 3 dot-matrix square. Each state has its own shape, and
  working and starting move with CSS. A finished turn is a full bright green
  square, and ready is one bright cell on a faint green grid. A workspace
  whose agent waits for the user, such as for the approval of a command,
  shows Needs input: a middle column in the accent colour that pulses.
- `SandboxNotice` in `src/components/workspace/` draws the states of the
  cloud computer: stopped, error, archived, and refused. A refused start
  shows "The sandbox can't start" with the words of its cause and no
  action. The notice takes any refusal reason. `sandboxNoticeState.ts`
  beside it owns the types of the bar and the panels, which the app
  imports too.
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
- `SuspendedOrgNotice` in `src/components/orgs/` draws the notice of a
  suspended org, with the mark of a refused start. It names the org and
  the abuse address, and it offers no action. It is a box at the top of
  the list and of each settings tab, and above the bar of an archived
  workspace. `SuspendedOrgPanel` shows the same words in the main area of
  a wide desktop list. `SuspendedOrgAbove` puts the box above the page of
  a deleted org, at the width of a settings page. A suspended org shows no
  action that it refuses.
- Copy says cloud computer or sandbox. No screen names Boat, also not the
  marketing site or Get started.
- A build of the cloud computer runs for at most 60 minutes, and a start of
  a sandbox for at most 20 minutes. A build that runs names its limit under
  its log, and the start card names the limit under its steps. A failed
  build or start shows the message that the app saved for it, so a job that
  passed its limit names that limit, as
  `app/org-settings/cloud-computer/build-failed/time-limit`,
  `app/shell/error/time-limit`, and `app/new-workspace/time-limit` show.
- A new org has no image until its first build succeeds. Until then New
  workspace keeps Send off under a notice with the state of that build, as
  `app/new-workspace/first-build` shows. A notice of work that runs, such
  as that build, shows a spinner in place of its icon: `Notice` in
  `src/components/common/` takes `busy`.
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
- `MarkdownTable` in `src/components/common/` draws each Markdown table of
  a reply and of the Markdown preview of a file as a native table. It
  imports no fixture, so the app can use it too. Each caller draws the
  content of the cells, such as inline code.
  - The header row has the raised fill and the strong weight. One 1 px line
    in the border colour stands between two cells and around the table.
    The text of the table has the small size, one step under the text of a
    reply.
  - Each column takes the alignment of its separator cell, also in the
    header row. A table wider than its place scrolls sideways inside its
    box, so the text around it keeps its width, as
    `app/chat/tables/wide` shows.
  - A short row of a reply keeps only the cells that the agent wrote. Its
    last cell spans the missing columns, up to 1,000, the most that HTML
    allows, and any columns after that stay empty. The user chose the span
    on 9 November 2026. The cell that spans keeps its text at its start,
    so the text never stands under a column that it does not belong to,
    as `app/chat/tables/short-row` shows. The file preview fills a short
    row of a file with empty cells instead.
  - While the agent writes, a header row shows as its text, with its
    pipes, until a separator row with as many cells follows it. Then the
    table shows the rows that have arrived, as `app/chat/tables/header`
    and `app/chat/tables/rows` show.
- When a turn ends, the work before its answer folds into one line, from
  decision 150. The work is the agent messages and the tool calls, with
  the Mac command cards and the lost lines among them. The answer is the
  last agent message, with the agent messages right before it.
  - `groupItems.ts` in `src/components/chat/` finds the turns, because the
    mockup items have no turn IDs. The items after a member message, up to
    a turn end, a stop, an error, or the lost line of a turn end, form one
    turn. A message with `during` joins its turn and starts a new part.
    Each part folds its own work and keeps its own answer in view.
  - The work after the answer stays in view, such as the calls that a stop
    cut off. A part without an agent message does not fold, and a run
    folds only when it holds a tool call or a message. While a turn runs,
    each message shows, and each run of tool calls folds on its own.
  - `WorkFold` draws the fold. Its line reads "11 tool calls, 2 messages",
    with the icons of the tool kinds and the left-out output. `FoldLine` in
    `ToolGroup.tsx` draws the line of both kinds of fold. A Mac command
    card and a lost line fold at their place, with no count and no mark,
    from decision 151.
  - The open fold lists its steps in order, in the indented list of an
    open run of tool calls: the call line that `ToolGroup` shares, a
    message as its first words on one line, the Mac command card, and the
    lost line, which starts at the left edge. A click on a message line
    grows it to the full text, with its paragraphs and bullets.
  - A message line holds no table, because a summary holds only phrasing
    content. Closed, the line shows a table as its cells, row by row, with
    a dot between two cells. Open, the line keeps the paragraphs before
    the first table, and the table and the rest of the message show under
    the line, at the left edge of its text, as `app/chat/work/table`
    shows.
  - The `fold` state of the workspace opens the folds, and `open-message`
    also opens the last message line of each. A view runs no script, so a
    chat with open folds starts at its top.
- Data that the chat does not have shows in plain words, from decision 76.
  `lostCopy.ts` in `src/components/chat/` holds the words. A tool call whose
  output the runner shortened shows the size that it left out, such as "1.2 MB left out", and
  the line of its fold shows the total. A turn with more than 200 files ends its
  list with plain text, such as "47 more files". A stopped turn shows no
  file list, so its line ends with the count, such as
  "You stopped the agent · 5 changed files not listed".
  `LostLine` draws a refused runner event as one centred, muted line at its
  place, which names the lost data and why, such as "A tool update was lost
  because it was too large". It never shows the lost data, and a phone wraps
  it into balanced lines. A lost line among the work of an ended turn folds
  with that work.
- Files that the cloud computer could not read never show as an empty list.
  A finished turn still ends with its duration, then "Changed files
  unavailable" in muted text in place of its files. A stopped turn ends its
  line with the same words. All files keeps the list that it saved before,
  under the notice "The latest list of all files is unavailable", which has
  no time. With no saved list, All files says "The list of all files is
  unavailable" in place of the tree. `lostCopy.ts` holds these words too.
- The app frame is a size container (`app-frame`), so the layout follows the
  width of the frame, not of the window. In the app the two are the same. A
  screen is as high as `--ui-screen-height`, which is the window, or the
  frame of a picture on the marketing site.
- The operator section has the tabs Overview, Orgs, and Users, from
  `OperatorPage` in `src/components/operator/`. The overview uses the stat
  tiles, the line chart, the table, and the skeletons of `@firna/ui`. A
  view runs no script, so the chart keeps the width that the page column
  gives it. The workspaces by state reuse `StatusGlyph`.
- A table of the operator keeps fewer columns on a phone, so that each
  name keeps one line. The line under a name gives what a search found,
  when it is not the name, and the state of a suspended or deleted target,
  with a dot between them. A column of days fits a day of another year,
  such as 30 Sept 2026, on one line. A person shows on a disc and an org on
  a square, with `PersonAvatar` and `InitialsTile` from
  `src/components/orgs/`.
- Suspend and Lift sit in the header of the page of an org or a user, and
  in its footer on a phone. Each asks first, with `ConfirmDialog`. The
  words of the questions and the notices live in `operatorCopy.ts`, which
  imports no fixture, so the app uses them too. So do `WorkspaceStates`
  and `DailyChart`. Each text of an org takes its deletion, so the
  questions and the notices of a deleted org promise nothing that its
  members cannot open, and nothing that a lift does not give back.
- `DailyChart` names each point and each label of its axis with the UTC
  day, such as "10 Oct", in British English, so that no time zone and no
  locale of a browser or of the build machine changes a date. Its axis has
  one slot for each day and shows every few labels, so the labels leave
  out the year. Its own table lists the UTC days, because the table of the
  Firna chart cannot name its first column.
- On a phone the org settings put their four tabs in three columns, so every
  tab shows. The session tabs all shrink, and the current one keeps the start
  of its title beside its close button. When the session tabs still do not
  fit, their row scrolls sideways.
