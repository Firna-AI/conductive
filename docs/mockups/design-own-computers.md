# The design of own computers

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the parts that the screens share. This page
gives the parts of own computers: Linux servers that an admin adds to an
org, where each workspace runs in its own container (own computer
decisions 1 D and 5 C). It gives the Own computers tab of the org settings,
the page of one own computer, Add computer, the computer choice of New
workspace and of the automation form, an own computer in a workspace, and
the own computers on the operator page of an org.
[The catalogue of own computers](catalogue-own-computers.md) lists the
pages.

- Users see the name "own computer", and the cloud computer keeps its name.
  No text names a sandbox provider. The cloud icon names the cloud computer,
  and the server icon names an own computer, also in the Settings group of
  the command palette.
- `OwnComputersTab` in `src/components/own-computers/` draws the Own
  computers tab, after Cloud computer in the tabs of the org settings. One
  section holds the intro, the list, the note that links to the Cloud
  computer tab, and Add computer. Only an admin adds an own computer, sets
  its limit, and removes it (own computer decision 2 A). A member reads the
  same rows, and the intro says that only an admin can change them. An org
  without own computers shows one line in place of the list.
- `OwnComputerList` beside it draws each computer as a row: its name in the
  monospace font, which opens its page, its size and its builds under it,
  its state, and its workspaces that run of its limit, such as "2 of 4
  running". A narrow list puts the state and the workspaces on a second
  line.
  - `computerState` in `ownComputer.ts` gives the state, in the order that
    wins: Waiting to connect, Code expired, Offline, Building, Build
    failed, Full, and Connected. Building and Build failed are the first
    build, before which no workspace can start on the computer. A later
    build that failed keeps the state of the computer, and the line under
    the name says "Build failed" in the danger colour.
  - `ComputerStatus` draws the state as `StatusText` from
    `src/components/common/`: a glyph and a word, so that no state is
    colour alone. A first build that runs adds its time.
  - A computer that never connected has no page. An admin gets Show
    command while its one-time code works, and New code after it expired.
- The page of one own computer keeps the tabs of the org settings, with
  Own computers selected. Its header names the computer, with Own computers
  as the way back. `ComputerSections.tsx` draws its boxes:
  - `OfflineNotice` first, while the computer is offline. It asks to check
    the server, because only an admin of the server can fix it.
  - `ComputerDetails`: the state, the workspaces of the limit, the size and
    the system that the computer reported, and the day of its add.
  - The build card of the Cloud computer tab, `BuildSection`, with the
    builds of the computer: its log, its history, and Try again. Its data
    holds the failed build of the computer, so the saved message names the
    computer and not the cloud computer.
  - For an admin, `LimitSection` with the number of workspaces that run at
    once, whose hint gives the default for the size of the computer: one
    workspace for each 4 vCPU and 8 GB, from `defaultLimit`. Save is on
    only after a change. `RemoveSection` comes last.
- `AddComputerDialog` draws Add computer with `ConfirmDialog`, which is a
  sheet on a phone, in four steps: the name, the install command, the first
  connection, and a code that expired. The name step says what people with
  root access to the server can read. The command step uses the wide
  dialog: the one-line command with its one-time code in the monospace
  font, with Copy, what the code and the server need, and a spinner while
  the app waits for the first connection. Close keeps the code, so the row
  of the computer waits in the list. `addComputerCopy.ts` holds the words
  and the install command.
- `RemoveComputerDialog` asks before Remove computer. Its words say that
  each workspace of the org on the computer stops, that the computer can no
  longer connect, that its workspaces keep their chats but cannot start
  again, and that their files stay on the server.
- `ComputerPicker` in `src/components/new-workspace/` draws the computer
  choice (own computer decision 3 A): the cloud icon or the server icon,
  the name, and a chevron, in the look and at the size of the repository
  picker. It shows only while the org has an own computer.
  - New workspace puts it after the branch control, on the page and in the
    header of the dialog, in the tone of the pickers there. The automation
    form puts it after Section, and the hint under the fields names it.
    Another member reads the computer in the facts of the automation.
  - `computerMenu` beside it gives the menu: Cloud computer first, with the
    detail default, then the own computers under their label, each with
    the detail of its state. A computer without a good build keeps its
    place, off, with the note of when it is ready, as a repository that
    waits for its build does. A phone opens the menu as a sheet titled
    Computer.
  - An offline or a full own computer stays on. A notice over the composer
    says when the workspace starts, and Send stays on. The note under the
    pickers names the own computer and its newest build.
  - An automation whose own computer an admin removed turns off, with a
    notice that asks its owner to choose another computer.
- A workspace on an own computer looks like a workspace on the cloud
  computer. Each text that names the cloud computer of the workspace names
  its own computer instead: the first step of the start, the saved message
  of a failed start, and the menu of the header state. The first line of
  that menu says where the workspace runs, and a screen reader names the
  menu after the computer. A start on an offline own computer shows the
  step "Waiting for lab-server to connect" with its time, and fails at the
  20-minute limit of a start with Try again. A workspace whose own computer
  an admin removed shows a refused start that names the computer.
  `workspaceComputer.ts` in `src/screens/` gives these words to the
  workspace screen.
  - A start on a full own computer shows the step "Waiting for a free
    place on build-02" with its time (own computer decision 9 B). At the
    20-minute limit of a start, it fails with Try again. Its saved message
    says that the computer is full and names the limit. It gives no count
    of workspaces, because the count can change.
  - 2 minutes after an own computer went offline, its running workspaces
    show the stopped bar with Resume (own computer decision 10 B). The
    saved message of the stop comes before "Your files and chat are
    saved." It says that the computer went offline, and that Resume starts
    the workspace when the computer connects again. Resume waits for the
    computer, as a start on an offline computer does.
  - Resume and Try again open the next state of the same workspace. It
    keeps every part of the state, except that the sandbox starts, no
    start error is saved, and a computer that went offline is offline.
    `recoveryPage` in `src/screens/ownComputerPages.ts` finds the page that
    draws that state, from the props that the entries read there too. The
    notice of the bar and the panels carries that page. With no such page,
    the button has no link. Restore and the retry of a failed first start
    keep their fixed pages.
  - The bar of an archived workspace on a removed own computer says that
    the files stay on that computer, and gives no day of a delete, because
    the app deletes nothing there. Nothing offers Restore: not the bar, not
    the row, and not the command palette. Until its 14 days end, the bar
    gives the day when the workspace leaves the list. After them, its title
    gives the day of the removal, and its panels say Removed.
- `OwnComputerCounts` in `src/components/operator/` draws the Own
  computers box of the operator page of an org, after the Provider account
  box: the number of own computers, the count of each state with its glyph,
  and the workspaces that run on them now. A state with no computer stays
  quiet. The box names no computer and shows nothing of its work. An org
  without own computers shows no box.
- `ownComputerCopy.ts`, `addComputerCopy.ts`, and `computerChoiceCopy.ts`
  in `src/components/own-computers/` hold the words, and `ownComputer.ts`
  holds the data of a computer and the rule of its state. The words of a
  workspace on an own computer, and of the archived bar on a removed one,
  live in `computerChoiceCopy.ts`. They import no fixture, and neither do
  the parts, so the app can share them.
