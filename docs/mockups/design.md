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
repository, the branch, and the owner of the workspace, and ends with
Archive. Then come a tab for each agent session and each open file or diff,
+ for a new session, and a clock that opens the session history. The right
column has the pull request bar on top, the All files, Changes, and Checks
lists below it, and the Terminal, Preview, and Desktop tabs at the bottom.
It shows no file content. A phone shows an org switcher at the top of the list, and the
workspace with a compact pull request row, the sessions as tabs above the
chat, and five tabs at the bottom.

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
- While the sandbox of a new workspace starts for the first time, Send
  waits in each session, and each box keeps its message.
  `SendWait` in `src/components/chat/` gives the short reason beside Send,
  "You can send when the sandbox is ready", in two lines on a phone. The
  user sends the message when the sandbox is ready, as
  `app/new-workspace/waiting` shows. A resume of a stopped workspace still
  takes messages, which wait for the sandbox.
- A view runs no script, so a screen draws an open menu in place: `Menu` in
  `src/components/common/` beside its button, or in a `Sheet` on a phone.
  Firna's own menu rows are taller than the dense design. A row can lead with
  a mark, such as an avatar, and end with a muted detail and an icon.
- `ConfirmDialog` in `src/components/common/` asks before an action that a
  user cannot simply undo: a dialog over the dimmed app on desktop, and a
  sheet on a phone. The desktop dialog lies in the `overlay` of `AppFrame`.
- `AgentMark` in `src/components/chat/` marks the agent of a session with two
  letters on a small tile, CL or CX, because the app draws no brand logo.
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
    Terminal, Preview, and Desktop tabs show the words of the refusal in
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
- Data that the chat does not have shows in plain words, from decision 76.
  `lostCopy.ts` in `src/components/chat/` holds the words. A tool call whose
  output the runner shortened shows the size that it left out, such as "1.2 MB left out", and
  its folded group shows the total. A turn with more than 200 files ends its
  list with plain text, such as "47 more files". A stopped turn shows no
  file list, so its line ends with the count, such as
  "You stopped the agent · 5 changed files not listed".
  `LostLine` draws a refused runner event as one centred, muted line at its
  place, which names the lost data and why, such as "A tool update was lost
  because it was too large". It never shows the lost data, and a phone wraps
  it into balanced lines.
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
- The operator section has the tabs Overview, Orgs, Users, Waitlist, and
  Invite codes, from `OperatorPage` in `src/components/operator/`. On a
  phone the five tabs keep one line while they fit, with the `flow` mode
  of `LinkTabs`. On a narrower phone the last tabs move to a second line,
  so that every tab shows. The overview uses
  the stat tiles, the line chart, the table, and the skeletons of
  `@firna/ui`. A view runs no script, so the chart keeps the width that the
  page column gives it. The workspaces by state reuse `StatusGlyph`. A line
  under the users tile counts the people on the waitlist and opens the
  Waitlist tab.
- A table of the operator keeps fewer columns on a phone, so that each
  name keeps one line. The line under a name gives the state of a
  suspended or deleted target, or Waiting for a person on the waitlist. A
  phone can add a second line for a column that it leaves out, such as the
  age of a GitHub account. A person shows on a disc and an org on a
  square, with `PersonAvatar` and `InitialsTile` from
  `src/components/orgs/`.
- The Waitlist tab shows no picture. Each login opens the GitHub profile in
  a new tab, with a small mark for it. After Approve, the row keeps its
  place with Approved and the state of its email, in plain words.
- A code shows in the monospace font, with Copy beside it. A code that
  still works also has Copy join link, for a link such as
  `https://app.conductive.build/join/<code>` on the domain of the app.
  Disable on a row is a quiet icon, as in the member list of an org. A
  code that no longer works keeps the place of Disable empty.
- The Approval email row of a user page gives the state of the email. A
  state of an email that did not go has a short muted line with the
  reason. No state has an action, because the person keeps app access.
- Suspend and Lift sit in the header of the page of an org or a user, and
  in its footer on a phone. A person who waits also has Approve there. Each
  asks first, with `ConfirmDialog`. The Suspend question of a user offers
  to disable their referral code with `CheckOption` from
  `src/components/common/`, the checkbox of the browser in the accent
  colour, because `@firna/ui` has no checkbox.
- While sign-ups are paused, `PauseNotice` tops each tab of the section,
  with Resume sign-ups. On the Invite codes tab it takes the place of the
  Sign-ups box, which holds Pause sign-ups while sign-ups are open.
- On a phone the org settings put their four tabs in three columns, so every
  tab shows. The session tabs all shrink, and the current one keeps the start
  of its title beside its rename and close buttons.
