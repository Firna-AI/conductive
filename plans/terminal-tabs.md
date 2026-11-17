# Terminal tabs

Status: Active. [PR #280](https://github.com/Firna-AI/conductive/pull/280) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace has one shell today. Every terminal connection attaches to
the same tmux session, so all browser tabs, devices, and members see one
screen. A user who wants a dev server and a test run at the same time must
know tmux keys. This change adds terminal tabs to the Terminal tool. Each
tab is its own shell in the cloud computer. The members of the workspace
share the tabs, and a workspace holds at most 10 of them.

The user chose the approach in a brainstorm on 10 November 2026: terminal
tabs decisions 1 B and 2 B. The user chose terminal tabs decision 3 B, a
New terminal action in the command palette, on the same day. The
brainstorm notes are in `.context/multiple-terminals/brainstorm.md`.

This change does not cover terminals in the centre tab row, a terminal in
its own window, split panes, a rename of a terminal, a drag of a terminal
tab, Big Terminal Mode, or presets that start agent programs.

Contract owners:

- [Terminal](../docs/protocol/terminal.md).
- [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md#terminal).
- [Command palette: actions and settings](../docs/protocol/command-palette-actions.md#actions).
- [Keyboard shortcuts: the keys](../docs/protocol/keyboard-shortcuts-keys.md#the-default-keys).
- The [terminal backend README](../worker/terminal/README.md).
- The [terminal README](../src/terminal/README.md).
- The [tools part](../src/shell/workspace/screen-parts.md#the-tools-part).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app/tools`.

## Decisions

This plan names its decisions after the change, as terminal tabs decision
1, as [Decision numbers](../docs/architecture.md#decision-numbers) says.
They were decisions 248 to 250 until 12 November 2026, when main adopted
that rule.

### 1. Several terminals in one workspace

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/terminal/scripts.ts:103`, `src/shell/workspace/tools/ToolsPart.tsx`, `docs/protocol/workspace-tools.md:109`.
- **Terms:**
  - **tmux:** a program in the cloud computer that keeps each shell running when the browser connection drops (decision 118).
  - **ttyd:** the program in the cloud computer that joins a browser socket to a tmux client.
  - **Centre tab row:** the row of chat session tabs and file tabs above the chat (decision 186).
- **Background:**
  - The launcher in the cloud computer always attaches to the tmux session `workspace`, so each workspace has one shell.
  - Ctrl-b c already opens a tmux window. Every viewer then sees the same window.
  - With its `--url-arg` option, ttyd reads `arg=` values from the socket address and gives them to its program. The Worker builds that address, so the Worker can choose a shell for each socket.
  - The Mac app opens no second window, as its protocol says.
- **Problem:** The app has no way to open a second shell. A second browser tab shows the same shell.
- **Impact if no action:** A user must know tmux keys to run two commands at once.
- **Root question:** How should a user open and use several terminals in one workspace?
- **Options:**
  - **A.** Keep one terminal. Tell users about tmux windows in a guide. It needs tmux knowledge, and every viewer sees the same window. Effort: Small.
  - **B.** Add terminal tabs to the Terminal tool, with a + button and a close button. Each tab has its own shell. Every member and device sees the same terminals. Effort: Large.
  - **C.** Open terminals as tabs in the centre tab row, from the + button, as Conductor's cloud workspaces do. Each terminal gets the full chat width. This changes the tab row and the saved tab list of each member. Effort: Large.
  - **D.** Do B, and add "Open in new window" to each terminal. The Mac app must then open a second window, which changes its protocol. Effort: Large.
  - **E.** Added by the options check. Give each member a private list of terminals. Each member sees and closes only the terminals that they opened, and the limit counts for each member. A hidden shell still holds its ports and memory, and the other members cannot see why. The privacy exists only in the app, because every shell runs as the same user in the cloud computer. Effort: Large.
- **Left out:**
  - Terminals in the agent runner in place of ttyd and tmux. B is better on each point of the goal: it costs less, keeps the reviewed ttyd path, and survives a restart of the runner.
  - Split panes in the tools panel. Two shells side by side do not fit in a panel of about 440 pixels or on a phone. tmux panes already split a shell.
  - A new shell for each browser tab. The Mac app has one window, so it gets one shell. Each closed browser tab leaves a shell running.
  - A list of terminals that tmux keeps itself, as windows of one session. This is a mechanism under B, not an approach. Its list would live in a cloud computer that stops, and the Worker cannot watch it.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:**
  - Decision 118 B keeps a shell across dropped connections. One shared session for each workspace was an agent call of 7 November 2026.
  - The comparison row `workspace-terminal` said "Terminal tabs are under consideration".
  - Conductor opens a cloud terminal from the + of its workspace tab bar: https://www.conductor.build/docs/cloud/working-with-cloud-workspaces. Its Big Terminal Mode shows terminal tabs in the centre panel: https://www.conductor.build/docs/reference/big-terminal-mode.
- **Recommendation:** B. It gives separate shells with the fewest changes, because the new parts stay in the Terminal tool and its backend. C and D can come later on the same backend. E costs more and hides shells that still hold ports.
- **Chosen:** B, by the user on 10 November 2026. The text of B says that every member and device sees the same terminals. The options check added E after that choice and kept B as its recommendation.

### 2. The number of terminals in a workspace

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** None.
- **Background:** Each terminal is one entry in a list on the server. It gets a shell in the cloud computer at its first connection, and one socket for each browser tab that shows it. An idle shell uses a few megabytes, so the shared tab row and the open sockets count more than the memory.
- **Problem:** Without a limit, a script or a held key can open hundreds of terminals.
- **Impact if no action:** The tab row becomes hard to use, and each open terminal holds a socket and some memory.
- **Root question:** How does a workspace stay usable, and keep its cloud computer healthy, when someone opens many terminals? The options check wrote this question again, because the first question took a count as given.
- **Options:**
  - **A.** No limit. The risk above stays. Effort: Small.
  - **B.** A limit of 10 terminals for each workspace. At the limit the + button turns off, and its hint says to close a terminal. Effort: Small.
- **Left out:**
  - A limit set by the free memory of the cloud computer. It does not limit the shared tab row, and the limit would change from one press to the next.
  - A limit for each member. It fails the goal, because the members share one tab row, which then grows with each member.
  - A + that takes one press at a time. It fails the goal, because it limits neither the shells nor the row.
  - Terminals that close themselves when idle. They break decision 118, which keeps each shell and its commands running until the user ends them.
- **Wider fix:** None. The limit itself is the fix.
- **Previous examples:** Other lists have fixed limits, such as 512 changes for each tree update in `docs/protocol/workspace-tools.md`.
- **Recommendation:** B. A fixed limit keeps the list and the memory small, and 10 is more tabs than the panel shows at once.
- **Chosen:** B, by the user on 10 November 2026.

### 3. A palette action for a new terminal

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/command-palette.md:177`, `src/shell/workspace/WorkspacePaletteActions.tsx`, `src/app/palette/palette-keys.ts:49`.
- **Background:**
  - The command palette runs the actions of the current page. Its protocol lists the actions of an open workspace: New session, Session history, a Go to row for each tab of the right column, and Archive workspace.
  - Each palette action does what the same control does in the app. The palette offers only the actions that the page offers, so it has no turned-off rows. Terminal tabs decision 1 B adds a new control, the + of the terminal tabs.
  - Only the palette has a key: ⌘K on a Mac, and Ctrl+K on Windows and Linux. The user chose this for the first version on 8 November 2026 (decision 145 A), and plans more keys in another workspace.
  - On Windows and Linux, Ctrl+K in the terminal goes to the shell. xterm.js also keeps Tab in the terminal.
  - The palette protocol has 259 lines. The follow-up item `plans/follow-ups/protocol-docs-split.md` counts it as at the target, so a new row needs no split.
- **Problem:** The palette has no row for the new +. On Windows and Linux, a keyboard user whose focus is in a terminal cannot reach the + at all.
- **Impact if no action:** Keyboard users open a terminal more slowly than they start a session.
- **Root question:** How does a keyboard user open a new terminal?
- **Options:**
  - **A.** Add no palette action. The + of the terminal tabs is the one way. Effort: Small.
  - **B.** Add "New terminal" to the actions of an open workspace, after the Go to rows. It runs the + of the terminal tabs. At the limit the palette leaves the row out, because the page does not offer the action then. It does not help a Windows or Linux user whose focus is in a terminal. Effort: Small.
  - **C.** Added by the options check. Give New terminal its own key, which also works while the focus is in a terminal. The key must be free in browsers, shells, tmux, and the message box, such as Ctrl+Shift+backquote. The Mac app can use ⌘T. It changes decision 145 A, and a key that is free on all keyboard layouts is hard to find. Effort: Medium.
  - **D.** Added by the options check. Add one key, on every platform, that moves the focus from a terminal to its tab row. Tab then reaches the +, and Ctrl+K opens the palette again. It changes decision 145 A, and the key must not clash with shells, tmux, or browsers. Effort: Medium.
- **Left out:**
  - A Go to row for each terminal. It switches terminals and does not open one, so it answers a different question.
  - An item in the menu bar of the Mac app. The menu cannot run an action in the page without a bridge, and the palette protocol rejects that bridge.
  - A shell command that opens a tab. It needs a route from the cloud computer to the Worker that any code in the cloud computer could call.
- **Wider fix:** D. It lets keyboard users reach every control beside the terminal, also controls that later changes add. It fixes an older problem, so `plans/follow-ups/terminal-keyboard-trap.md` records it apart from this change.
- **Previous examples:** New session is both a + in the centre tab row and a palette action.
- **Related:** `plans/follow-ups/terminal-keyboard-trap.md` holds the older problem that D fixes. C and D both start the key work that decision 145 A put off.
- **Recommendation:** B. The palette already mirrors each control of an open workspace, and New session sets the pattern. C or D also covers a Windows or Linux user whose focus is in a terminal, and D is the wider fix.
- **Chosen:** B, by the user on 10 November 2026.
- **Later:** Main added keyboard shortcuts on 11 November 2026, in PR #216. Each palette action is now also a command of the Keyboard shortcuts tab. On Windows and Linux the terminal still keeps every key, so the trap of `plans/follow-ups/terminal-keyboard-trap.md` stays.

### 4. The address of a closed terminal

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation, Milestone 2.
- **Category:** Docs or spec.
- **Problem:** No rule said what the Terminal tool shows when its address
  `terminal/<terminalId>` names a terminal that is not in the list, such as
  an old bookmark or a shared link to a terminal that closed.
- **Options:**
  - **A.** Treat it as an address with no terminal: show the saved
    terminal, or the first, and move the address to it.
  - **B.** Always show the first terminal, and move the address to it.
  - **C.** Show the first terminal with a notice that the named terminal
    closed. It needs a new mockup state.
- **Left out:** An error page in place of the tool, because the tool always
  shows a terminal.
- **Recommendation:** A. One rule covers each address that names no known
  terminal, and the member lands on the terminal that they used last.
- **Chosen:** A, by the user on 17 November 2026.

### 5. The focus after a control that shows a terminal

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation, Milestone 7, then main's PR #418.
- **Category:** Product bug.
- **Problem:** PR #418 moves the focus to the terminal after a click on the
  Terminal tab and after Go to Terminal. New terminal in the palette, the
  +, and a click on a terminal tab left the focus where it was, often in
  the message box, so typed text and Enter went to the agent.
- **Options:**
  - **A.** Keep the focus where it was.
  - **B.** Give the focus to the new terminal after New terminal in the
    palette, on desktop.
  - **C.** Do B, and also after the +.
  - **D.** Do C, and also after a click on a terminal tab.
- **Left out:** A notice that tells the user to click the terminal. It adds
  a step and does not stop the wrong message.
- **Recommendation:** D. It follows the rule that the user chose for the
  Terminal tab and Go to Terminal.
- **Chosen:** D, by the user on 17 November 2026. It replaces the
  follow-up item `plans/follow-ups/terminal-focus-after-open.md`, which
  Milestone 14 deleted.

### 6. When a running workspace gets terminal tabs

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review, finding 201.
- **Category:** Product bug.
- **Problem:** An install of new software while the workspace is idle does
  not restart the terminal service, and Restart restarts only the runner
  and the preview relay. So a running workspace got terminal tabs only at
  a later start of its cloud computer.
- **Options:**
  - **A.** Keep the rule: tabs come at a later start.
  - **B.** Make Restart also restart the terminal service after the runner
    applies the newest download, check the support again, save it, and let
    the app read the terminal state again. The shells keep running. It
    extends the user's decision 1 A of the Restart change.
  - **C.** Let the Worker restart the terminal service when no terminal
    socket is open.
  - **D.** Carry the terminal ID inside the socket stream, so an older
    terminal service opens several shells with no restart.
- **Left out:** Applying the newest release before the terminal step of
  each start, because a start never waits for a download.
- **Recommendation:** B. Restart is the control that a member already
  presses to apply new software, and it keeps every shell.
- **Chosen:** B, by the user on 17 November 2026. It replaces the
  follow-up item `plans/follow-ups/terminal-tabs-wait-for-start.md`, which
  Milestone 14 deleted.

## Design

The mechanics below are the design of this change. The protocol docs get
only the requirements, in Milestone 2.

### Terms

- **Terminal:** one shell in the cloud computer, with its tab in the
  Terminal tool.
- **Terminal ID:** the ID of a terminal in the list of the workspace.
- **Number:** the number in the name of a terminal, from 1 to 10.

### Mechanics

- The sandbox: ttyd runs with `--url-arg` and a new attach program. The
  ttyd tags 1.6.3, 1.7.3, and 1.7.4 read each `arg=` value of the socket
  handshake, as the source showed on 10 November 2026. The attach program
  takes no argument or one terminal ID.
  - No argument attaches to the tmux session `workspace`, today's shell.
  - One valid ID attaches to the tmux session of that terminal, and
    creates it when it does not exist.
  - Each other argument list ends the program with no shell.
  - Each new session starts a login Bash in the repository folder. The
    tmux server gives it the workspace variables and the prompt hook, as
    today.
  - The attach program is the
    [terminal bridge](../worker/terminal/README.md#the-terminal-bridge),
    which takes the name of a tmux session. The bridge attaches in tmux
    control mode and passes the raw output to the browser. Its hidden tabs
    stay connected, so each one gets every byte and keeps its own history
    of up to 2,000 lines.
- The start: the start command of the Worker checks the image for the
  attach program, and writes a marker in the runtime folder. The password
  read of the start reads the marker too, and caches the result beside the
  password.
- The close: the Worker ends the tmux session of one terminal with one
  fixed command, through the provider's command route. The terminal start
  already uses that route. The command succeeds also when the session is
  already gone.
- The list: the workspace object keeps the list in its own storage. Each
  entry has a terminal ID and a number. A new workspace starts with
  Terminal 1, whose fixed ID names today's session `workspace`. Each later
  terminal gets a random ID with 128 bits.
- Each change of the list commits with one `terminals.updated` event in
  the common stream of the workspace. The event holds the whole list. A
  retry adds no second event, as for a preview revocation.
- The routes, under the workspace path:
  - `GET terminal` answers as today, and adds `terminals` and `several`.
    Each entry of `terminals` has its ID, its number, and its socket path.
    `several` is true when the image can open more terminals. The answer
    keeps `socketPath` of the first terminal.
  - `POST terminal/terminals` opens a terminal with the lowest free
    number. At 10 terminals it gives 409 `terminal_limit`. Without
    `several` it gives 409 `terminals_unavailable`.
  - `DELETE terminal/terminals/<terminalId>` first marks the terminal as
    closing, so that no socket opens it. It then ends the shell, removes
    the entry, and commits the event. When the command fails, the mark
    goes, the entry stays, and the answer is an error. For the last
    terminal it gives 409 `terminal_last`.
  - `GET terminal/terminals/<terminalId>/socket` opens the socket of one
    terminal. An ID that is not in the list gives 404
    `terminal_not_found`. The Worker adds `arg=<terminalId>` to the ttyd
    address, except for the fixed ID of today's session.
  - `GET terminal/socket` stays, and opens the first terminal of the list.
- Access: the create, the close, and each socket use the gate of today's
  socket. The workspace must run, and neither its owner nor its org may
  be suspended. The state read stays as open as today.
- The saved view gets an optional `terminal`, the ID of the shown
  terminal. A missing or unknown ID shows the first terminal.
- The Terminal tool shows a row of terminal tabs above the screen, with
  the + at its end. Each tab shows "Terminal" and its number. The tabs
  look like the tabs of the centre column. Each tab keeps its whole title,
  and a row that does not fit scrolls sideways. The phone
  shows the same row at the top of the Terminal page. At the limit, the
  hint that says to close a terminal shows as text, not only on hover, so
  a phone shows it too. The address
  `terminal/<terminalId>` names a terminal. `terminal` alone shows the
  saved terminal, or the first.

### Design calls

All design calls are of 10 November 2026, by the agent.

- The terminals belong to the workspace, and every member sees them.
  Reason: chat sessions work the same way, and the one shell is shared
  today.
- The tabs keep the order of their numbers, with no drag. A new terminal
  takes the lowest free number. Reason: the names then stay from Terminal
  1 to Terminal 10, as the limit of terminal tabs decision 2.
- This change adds no rename. Reason: the numbers name each terminal, and
  a rename can come later through a tab menu.
- Terminal 1 of each workspace is today's shell, and its socket passes no
  terminal ID. Reason: a shell that runs at the deploy stays, and the
  first terminal works also with an older launcher.
- Only the Worker chooses the shell of a socket. The Worker and the attach
  program both check the terminal ID. Reason: the Worker already sends no
  part of the browser's address to ttyd, and the password for each
  workspace stays.
- A close ends the shell for every member, after a confirmation. Reason:
  the shell can hold a running command, such as a dev server.
- A close blocks new sockets of its terminal before it ends the shell.
  Reason: a Reconnect between the end of the shell and the removal of the
  entry would start a shell that no tab shows. The options check found
  this gap.
- The last terminal has no close button. Reason: the Terminal tool then
  never needs an empty state, and `exit` still gives it a new shell.
- Each terminal tab keeps its whole title, also on a phone, and a row
  that does not fit scrolls. Reason: the mockups showed that tabs which
  shrink, as the tabs of the centre column do, cut every title to "Ter…"
  at the limit, and a phone shows only icons. The titles differ only in
  their number.
- A failed open or close shows the failure toast of the app, with the
  message of the server. The user tries again with the + or the close
  button. Reason: the app shows each failed change of a list this way,
  such as a failed rename. A Try again button in the toast was dropped,
  because the + and the close button stay in place.
- A workspace with older cloud computer software shows no row of tabs.
  Reason: a row with one tab, no close button, and no + gives the user
  nothing.
- The close question names the terminal, says that its shell and running
  commands end for everyone, and confirms with "Close terminal" in the
  danger tone. Reason: the close ends running commands of other members
  too.
- `exit` keeps today's rule in each terminal: the next connection opens a
  new shell in the same tab. Reason: this keeps a requirement in force.
- A stop of the cloud computer keeps the list. Each terminal opens a new
  shell at its first connection after the resume. Reason: this keeps a
  requirement in force for each terminal.
- Each terminal that the user showed stays mounted and connected while it
  is hidden. Reason: the one terminal works this way today, and a switch
  then shows the screen at once.
- When the shown terminal closes, the tool shows the terminal before it,
  or the first. Reason: the tool always shows a terminal.
- A workspace whose image has no attach program shows one terminal and no
  + button. Reason: its launcher cannot choose a shell, so a + would open a
  copy of the first shell. It gets terminal tabs at a later start of its
  cloud computer, after the automatic software update. Corrected on
  16 November 2026 by review finding 201: an install while the workspace
  is idle leaves the old terminal service running until the next start.
  Changed on 17 November 2026 by decision 6 B: a Restart of the software
  also brings terminal tabs.
- The terminal state keeps `socketPath` of the first terminal. Reason:
  the Mac app bundles the web app, so an older Mac app build keeps one
  working terminal until it updates.
- The workspace object owns the list and its events. Reason: the terminal
  routes already run in the workspace object, and the list then commits
  with its event.
- The create and the close need a running cloud computer. Reason: the
  Terminal tool mounts only then.
- The saved view keeps the shown terminal. Reason: the server keeps the
  view state, as it keeps the shown tool.
- New terminal shows in the palette only while the Terminal tool offers
  its + button: where the Go to rows show, while the cloud computer runs,
  and below the limit. Reason: the palette offers only the actions that
  the page offers, and it has no turned-off rows.
- New terminal opens a terminal and shows it in the Terminal tool, also
  when another tool showed. Reason: the action does what the + does, and
  the user then sees the new shell.
- New terminal is also a command of the Keyboard shortcuts tab, with no
  default key, as Restore workspace is. Its palette row shows the key that
  a person gives it. Reason: since PR #216, each palette action is a
  command. Conductor's key for a new terminal tab, ⌘T while the terminal
  has the focus, runs New session in this app. On Windows and Linux the
  terminal keeps every key. This call is of 12 November 2026.
- New terminal is a command of the Workspace group of the Keyboard
  shortcuts tab, after Go to Preview. Reason: the palette offers it after
  the Go to rows, which are commands of that group. This call is of 16
  November 2026.

- A failed restart of only the terminal service during a Restart warns,
  and the Restart still succeeds. Reason: the always-on rule prefers to
  warn and continue when the input is recoverable, and a failed download
  already lets a Restart go on. This call is of 17 November 2026.
- When a Restart changes whether the terminal service opens several
  shells, the Worker commits one `terminals.updated` event that also holds
  the new `several`, so each open tab shows or hides the tab row with no
  read race against the runner. This call is of 17 November 2026.

### Related follow-up items

- `plans/follow-ups/terminal-disconnected-mockup.md`: Milestone 1 drew
  the Disconnected state and deleted the item.
- `plans/follow-ups/hidden-terminal-line-spacing.md`: each hidden terminal
  tab can meet the same defect. Its fix covers every terminal, so this
  change does not take it.
- `plans/follow-ups/terminal-keyboard-trap.md`: on Windows and Linux, a
  keyboard user cannot move the focus out of a terminal. The options check
  found it. It is older than this change, so this change does not take it.

The report of the options check is in
`.context/terminal-tabs/options-check.md`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The terminal tabs, their states, and the close question, in the desktop
panel and on a phone. Each mockup has a desktop and a phone variant.

- [x] Show the terminal tabs in the canonical Terminal screen of
      `app/tools`: three terminals, the second shown, and the + at the end
      of the row.
- [x] Move the other states to a child page under `app/tools`, with at
      most five screens on each page, as the `mockups` skill says:
  - [x] One terminal: the row with Terminal 1, the + button, and no close
        button.
  - [x] The limit: ten terminals, the + button off, and its hint as
        visible text, also on a phone.
  - [x] The close question: a dialog on desktop and a sheet on a phone.
  - [x] A failed open or close, with its message and Try again.
  - [x] The Disconnected bar of one terminal, with Reconnect. Delete
        `plans/follow-ups/terminal-disconnected-mockup.md`.
- [x] Keep the preview screens and the hidden Desktop screen reachable,
      on the page of `app/tools` or on child pages.
- [x] Add "New terminal" after the Go to rows in the actions of the
      command palette mockup (decision 250 B).
- [x] Update `docs/mockups/catalogue.md` for the new pages.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages, and save
      the screenshots under `.context/terminal-tabs/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [x] Capture the marketing pictures again with `npm run marketing:pictures`.
      The hero, Mac, and tools pictures show the Terminal tool, which now
      has its row of tabs.

Done on 10 November 2026. The pages are `app/tools`, its child pages
`terminals`, `disconnected`, `older-software`, `preview`, `preview-empty`,
and `desktop`, and `app/command-palette/actions/workspace`. Evidence:
the screenshots in `.context/terminal-tabs/shots/` and the logs in
`.context/terminal-tabs/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The requirements and decisions for several terminals.

- [x] Update "Terminal" in `docs/protocol/workspace-tools.md`:
  - [x] A workspace has up to 10 terminals (terminal tabs decision 2). Its members
        share them. Each opens in the repository folder.
  - [x] The + opens a terminal. A close ends its shell for every member,
        after a confirmation. The last terminal has no close.
  - [x] Each terminal keeps its shell across dropped connections. The
        `exit` rule and the stop rule hold for each terminal.
  - [x] The names, from Terminal 1 to Terminal 10.
  - [x] A workspace whose cloud computer software is older shows one
        terminal.
  - [x] Cite terminal tabs decision 1, with the rejected options C, D,
        and E and their reasons. Say which change the name "terminal tabs"
        names, as the architecture doc asks.
  - [x] When the doc passes about 250 lines, move "Terminal" to its own
        linked page.
- [x] Update "Terminal" in `docs/protocol/terminal-previews-and-desktop.md`:
      only the Worker chooses the terminal of a socket, a socket for an
      unknown terminal gets no shell, and the create and the close use the
      access of a socket.
- [x] Update `docs/protocol/github-tokens.md` where it says that the
      terminal is shared, so that it names the shared terminals.
- [x] Add "New terminal" after the Go to rows in the actions of
      `docs/protocol/command-palette.md`, with when it shows (terminal tabs
      decision 3 B).
- [x] Add New terminal to the commands of `docs/protocol/keyboard-shortcuts.md`
      and `docs/protocol/keyboard-shortcuts-keys.md`, with no default key
      and the reason that the design call gives.
- [x] Read `docs/architecture.md`. Change it only when a component or a
      boundary changes.
- [x] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [x] Check each relative link of each changed Markdown file.

Done on 16 November 2026. The Terminal section moved to
`docs/protocol/terminal.md`. New terminal went to
`docs/protocol/command-palette-actions.md`, where the palette actions now
live. Evidence: the link check in `.context/terminal-tabs/m2-link-check.log`.

## Milestone 2a: Mockup text of older software

Tags: mockup

Depends on: 1

Milestone 2 found that the page `app/tools/older-software` said that only
a new workspace after the next Build computer gets terminal tabs. The
design call says that the automatic software update brings them.

- [x] Change the description and the rationale of the page, with no change
      to the drawing.
- [x] Run `npm run mockups:check`.

## Milestone 3: Terminal software for several shells

Depends on: 2

The sandbox side: the attach program, the support marker, and the close
command.

- [x] Run ttyd with `--url-arg` and the attach program. Install the
      program with the other terminal files in the system release.
- [x] Make the attach program accept no argument or one valid terminal ID,
      and refuse each other argument list.
- [x] Make the start command write the support marker. Read it in the
      password read, and cache it beside the password. Add the migration
      that this needs.
- [x] Add the fixed close command for one terminal.
- [x] Test the attach program with the fakes of `worker/terminal`: no
      argument, a valid ID, an invalid ID, and two IDs. Test the marker
      and the close command.
- [x] Run the launcher once with the ttyd and tmux packages that the org
      image installs. Open two sockets with two terminal IDs, and check
      that each has its own shell. Save the output under
      `.context/terminal-tabs/`.
- [x] Update `worker/terminal/README.md` and `image/README.md` when it
      names the terminal files.

Evidence: `.context/terminal-tabs/reports/m3.md` and
`.context/terminal-tabs/m3-launcher-check.txt`.

## Milestone 4: Terminal list and its events

Depends on: 3

The list in the workspace object, its routes, and its event.

- [x] Add the terminal entry, the new fields of the terminal state, the
      paths, and the `terminals.updated` event to `src/shared/`.
- [x] Keep the list in the workspace object, with Terminal 1 at the start.
- [x] Add the create route: the lowest free number, 409 `terminal_limit`
      at 10, and 409 `terminals_unavailable` without `several`.
- [x] Add the close route. Mark the terminal as closing first, so that no
      socket opens it. Then end the shell, remove the entry, and commit
      the event. When the command fails, drop the mark, keep the entry,
      and give an error. Give 409 `terminal_last` for the last terminal.
- [x] Commit each change of the list with its event, so that a retry adds
      no second event.
- [x] Give the create and the close the gate of the terminal socket.
- [x] Add `terminal` to the saved view, and accept a view without it.
- [x] Test the create, the limit, the close, the last terminal, a failed
      close, the event order, a suspended owner, a suspended org, and the
      saved view.
- [x] Update `worker/terminal/README.md` and the routes in
      `worker/README.md`.

## Milestone 5: The socket of each terminal

Depends on: 4

- [x] Add the socket route of one terminal. Refuse an ID that is not in
      the list, or that a close has marked, with 404 `terminal_not_found`.
- [x] Add `arg=<terminalId>` to the ttyd address for each terminal except
      Terminal 1.
- [x] Keep `GET terminal/socket` and `socketPath` for the first terminal.
- [x] Give `several` in the terminal state from the cached marker.
- [x] Serve the new routes and the event in the fake API of
      `src/test-support/`.
- [x] Test a socket for each terminal, a closed terminal, a socket during
      a close, an unknown ID, the old socket path, and a workspace without
      the attach program.
- [x] Update `worker/terminal/README.md` and
      `src/test-support/README.md`.

## Milestone 6: Terminal tabs in the Terminal tool

Tags: ui

Depends on: 1, 5

- [x] Read the list from the terminal state and from `terminals.updated`.
- [x] Draw the row of terminal tabs as the mockups show, on desktop and on
      a phone.
- [x] Open a terminal with the + button. Turn the + off at the limit, and
      show its hint as visible text. Hide the + when `several` is false.
- [x] Close a terminal after the confirmation. Hide the close button on
      the last terminal.
- [x] Show a failed open or close in the failure toast of the app, with
      the message of the server.
- [x] Keep each terminal that the user showed mounted and connected while
      it is hidden.
- [x] Save the shown terminal in the saved view. Follow the address
      `terminal/<terminalId>`.
- [x] When the shown terminal closes, show the terminal before it, or the
      first.
- [x] Add the terminal events to the development page of the tools.
- [x] Test in `src/shell/workspace/tools/ToolsWiring.test.tsx`: open,
      switch, close, the limit, a close by another member, a reload with a
      saved terminal, and a workspace without the attach program.
- [x] Smoke-test the tool with `npm run dev`. Save the screenshots under
      `.context/terminal-tabs/`.
- [x] Update `src/terminal/README.md` and
      `src/shell/workspace/screen-parts.md`.

The tests are in `TerminalTabs.test.tsx` and `TerminalAddress.test.tsx`
beside `ToolsWiring.test.tsx`, which would pass 300 lines with them. The
save and the address work, except for an address that names a terminal
that is not in the list, which waits for a decision of the user. Evidence:
`.context/terminal-tabs/reports/m6.md` and `.context/terminal-tabs/m6-shots/`.
The last TODO was ticked in Milestone 16, after decision 4 A.

## Milestone 7: New terminal in the command palette

Tags: ui

Depends on: 6

- [x] Add "New terminal" after the Go to rows. Run the + of the terminal
      tabs, and show the new terminal in the Terminal tool.
- [x] Offer the row only while the Terminal tool offers its + button.
- [x] Make New terminal a command of the Keyboard shortcuts tab with no
      default key, as Restore workspace is. The list of commands is
      `docs/mockups/src/fixtures/shortcutCommands.ts`, which the app reads,
      so the command and its runner land together.
- [x] Test the row in the palette tests: its place, a run, and no row at
      the limit or while the cloud computer does not run.
- [x] Update `src/app/key-code.md` and `src/shell/workspace/README.md`,
      which list the palette actions.

Done on 16 November 2026. The tests are in
`src/shell/palette/PaletteNewTerminal.test.tsx`. `src/app/key-code.md`
names no palette action, so its palette page, `src/app/key-code-layers.md`,
took the change. The tools part moved from
`src/shell/workspace/screen-parts.md` to `tools-part.md` beside it, because
the new text would have passed 300 lines. Evidence:
`.context/terminal-tabs/reports/m7.md` and `.context/terminal-tabs/m7-shots/`.

## Milestone 7a: Mockup key of New terminal

Tags: mockup

Depends on: 7

Milestone 7 found that the New terminal row of the palette mockup named no
shortcut command, so the mockup palette could not show a key that a person
gives it.

- [x] Give the New terminal row of
      `docs/mockups/src/components/palette/paletteCommands.ts` the command
      `new-terminal`, with no change to the drawing.
- [x] Run `npm run mockups:check`.

## Milestone 8: Public guide

Depends on: 6

- [x] Read each public guide under `src/marketing/docs/` in full. Update
      each sentence that restates a changed fact, such as "the shared
      Terminal" in `security.md`.
- [x] Add how to open, switch, and close terminals to
      `src/marketing/docs/terminal-and-previews.md`, with the limit and
      what to do at the limit.
- [x] Dropped: rewrite the note of the `workspace-terminal` row of the
      comparison page. The page at `/from-conductor` was removed on
      2026-11-13, with its rows and the follow-up item about long notes.

Evidence: `.context/terminal-tabs/reports/m8.md`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate, `npm run check`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It says that an
      existing workspace gets terminal tabs after the automatic software
      update, at a Restart or a later start of its cloud computer.

Evidence: the gate log `.context/terminal-tabs/gate2.log`, and the review
reports in `.context/reviews/calummoore/terminal-tabs-implementation-l5ml/`.

## Milestone 10: Review fixes in the mockups

Tags: mockup

Depends on: 9

Round 1 of the review found that an update while the workspace is idle
leaves the old terminal service running, so tabs come at a later start
(finding 201).

- [x] Change the description and the rationale of `app/tools/older-software`
      to say that terminal tabs come at a later start of the cloud computer.
- [x] Run `npm run mockups:check`.

## Milestone 11: Review fixes in the Worker

Depends on: 9

- [x] Finding 1: require the terminal owner in the handler, the socket,
      and the mutations. Move the tests that call the handler without an
      owner to the real owner. Delete the helpers that only that path used.
- [x] Finding 2: remove the tests of the fake terminal API. Move each
      production check of its connector case to the transport tests first.
- [x] Finding 101, server side: give the terminal state read and the
      create and close replies the event number of the list that they hold.
      Do the same in the fake API.
- [x] Finding 201: correct the `terminals_unavailable` message.

## Milestone 12: Review fixes in the app

Tags: ui

Depends on: 11

- [x] Finding 102: add a mounted test for the Reconnect of one terminal.
- [x] Finding 103: give the screen and the connector the socket path, with
      no rebuilt state response.
- [x] Finding 101, app side: apply each terminal list only when its event
      number is newer than the list that shows, from reads, replies, and
      events. Show a new terminal only while it is in the list.

Done on 17 November 2026. Evidence: `.context/terminal-tabs/reports/m12.md`
and `.context/terminal-tabs/m12/`.

## Milestone 13: Review fixes in the docs

Depends on: 9

- [x] Finding 201: say in `docs/protocol/terminal.md`, the guide, and this
      plan that terminal tabs come at a later start of the cloud computer,
      with a link to the update rule.
- [x] Finding 202: limit the palette steps of the guide to a computer with
      the right column, and reword the New terminal requirement of the
      palette so that its place comes first.
- [x] Re-review the fixes once, as the `implementation-review` skill says.

## Milestone 14: Requirements of decisions 4 to 6

Depends on: 13

- [x] Decision 4 A: in `docs/protocol/terminal.md`, an address that names
      a terminal that is not in the list shows the saved terminal, or the
      first, and the address moves to it.
- [x] Decision 5 D: on desktop, New terminal in the palette, the +, and a
      click on a terminal tab move the focus to the shown terminal, as the
      Terminal tab and Go to Terminal do.
- [x] Decision 6 B: Restart also restarts the terminal service, keeps every
      shell, and checks again whether it opens several shells. Update
      "Older software" in `docs/protocol/terminal.md`,
      "Restart the software" in `docs/protocol/workspace-life.md`, and
      each other protocol doc that restates the Restart or the update rule.
- [x] Read both legal pages in full. Update each sentence that restates a
      changed fact.
- [x] Delete the follow-up items that decisions 5 and 6 answer.
- [x] Check each relative link of each changed Markdown file.

Done on 17 November 2026. "Restart the software" moved to
`docs/protocol/restart-the-software.md`, and the screen of the terminal to
`docs/protocol/terminal-screen.md`, because the docs that held them passed
the length target. Each old section keeps its heading and a link, so its
anchor still works. The history sentence of the screen now says that the
full history comes when the terminal service of a newer release starts, so
`plans/follow-ups/terminal-history-update-wording.md` went too. No
sentence of the legal pages restates a changed fact. Evidence: the link
check in `.context/terminal-tabs/m14-link-check.log`.

## Milestone 14a: Mockup text of decision 6

Tags: mockup

Depends on: 14

- [x] Say on `app/tools/older-software` that a Restart or a later start
      brings terminal tabs, with no change to the drawing.
- [x] Run `npm run mockups:check`.

## Milestone 15: Restart starts the new terminal service

Depends on: 14

- [ ] After the runner restart applies the newest download, Restart
      restarts the terminal service, with no restart of the shell server.
      A failed terminal restart warns and does not fail the Restart.
- [ ] Run the support check again and write the marker. Read it and save
      it in the Worker, with the password, as at a start.
- [ ] Test the command, the new marker, a failed terminal restart, and an
      older release with no attach program.
- [ ] Update `worker/terminal/README.md` and `worker/lifecycle/README.md`.

## Milestone 16: Address and focus of terminal tabs

Tags: ui

Depends on: 14

- [x] Decision 4 A: an address with an unknown terminal shows the saved
      terminal, or the first, and moves the address to it. Remove the
      placeholder of the open question. Test it.
- [x] Decision 5 D: on desktop, New terminal in the palette, the +, and a
      click on a terminal tab give the focus to the shown terminal. A
      phone moves no focus. Test each control.
- [x] Decision 6 B: after a Restart, the Terminal tool reads the terminal
      state again, so the tab row shows when the new terminal service
      opens several shells. Test it.
- [x] Update `src/terminal/README.md`, `src/terminal/terminal-tabs.md`, and
      `src/shell/workspace/tools-part.md`.

Done on 17 November 2026. The new read after a Restart needed no change:
Starting unmounts the tool. The app now also takes `several` from a
`terminals.updated` event. Evidence: `.context/terminal-tabs/reports/m16.md`
and `.context/terminal-tabs/m16/`.

## Milestone 17: Guide for decisions 5 and 6

Depends on: 14

- [ ] Read each public guide in full. Say that Restart brings terminal tabs
      to a running workspace with new software, and that the controls of
      the terminal tabs give the terminal the focus on a computer.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, a software update, and a Restart or a later start
      of the cloud computer, open a workspace. Open three terminals and run a different command in each. Reload, and
      check that each terminal kept its command. Close one, and reach the
      limit.
- [ ] Open a workspace whose terminal service has not started on the new
      software. Check that it shows one terminal and no + button.
- [ ] After the next Mac app release, repeat the first check in the Mac
      app.
