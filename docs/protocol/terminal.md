# Terminal

This doc holds the requirements and the decisions in force for the Terminal
tool of a workspace. It covers the terminals of a workspace and their tabs,
the shell of each terminal, and its screen. [Terminal links](terminal-links.md)
gives the links in its output. It belongs to
[Tools of a workspace](workspace-tools.md#terminal).
[Terminal](terminal-previews-and-desktop.md#terminal) in the security docs
states how the terminals stay safe. The terms are those of the
[architecture doc](../architecture.md#terms) and the terms below. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A terminal
tabs decision number, such as terminal tabs decision 1, names a decision
of the change that adds terminal tabs to the Terminal tool. A terminal
links decision number names a decision of the change that makes the
addresses in the terminal open. The
[mockup catalogue](../mockups/catalogue-workspace-tools.md) draws the
terminals at `app/tools` and its child pages.

## Terms

- **Terminal:** one shell in the sandbox, with its tab in the Terminal
  tool.
- **Terminal tool:** the tool of a workspace that shows its terminals. It
  is in the right column on desktop, and it has its own page on a phone.

## The terminals of a workspace

- A workspace has from 1 to 10 terminals. A new workspace starts with one
  terminal, Terminal 1.
- Each terminal is its own shell in the sandbox. The terminals belong to
  the workspace, so every member sees the same terminals on each device
  (terminal tabs decision 1 B).
- Reason: a member can run two commands at once, such as a dev server and
  a test run, with no tmux keys. The members share the chat sessions in
  the same way.
- A private list of terminals for each member was rejected. A hidden shell
  still holds its ports and its memory, and the other members cannot see
  why. The privacy exists only in the app, because every shell runs as the
  same user in the sandbox.
- Terminals as tabs of the centre tab row, as in Conductor, were rejected
  for this version. They change the tab row and the saved tabs of each
  member. An "Open in new window" action for each terminal was rejected
  for this version too. The Mac app opens no second window, as
  [Navigation](desktop-app.md#navigation) says.
- One terminal with tmux windows was rejected, because it needs tmux keys,
  and every viewer sees the same window. Split panes were rejected,
  because two shells side by side do not fit in the panel or on a phone.
- Each open and each close of a terminal reaches every open tab of the
  workspace. Every tab gets these changes in the same order, as
  [Events](chat-and-events.md#events) says.
- The limit of 10 terminals holds for the whole workspace (terminal tabs
  decision 2 B). The server refuses a new terminal at the limit.
- Reason: a fixed limit keeps the shared row usable, and it keeps the
  sockets and the memory of the sandbox small. 10 is more tabs than the
  panel shows at once.
- No limit was rejected, because a script or a held key could open
  hundreds of terminals. A limit for each member was rejected, because
  the shared row then grows with each member. Terminals that close when
  idle were rejected, because they break decision 118.

## Terminal tabs

- The Terminal tool shows a row of terminal tabs above the screen of the
  shown terminal. A + button with the label New terminal ends the row. On
  a phone, the row is at the top of the Terminal page.
- Each tab shows "Terminal" and the number of its terminal, from
  "Terminal 1" to "Terminal 10". A new terminal takes the lowest free
  number. The tabs keep the order of their numbers.
- A terminal has no rename, and its tab has no drag. Reason: the number
  names each terminal, so the names stay from Terminal 1 to Terminal 10.
- The tabs look like the tabs of the centre column. Each tab shows its
  whole name, also on a phone. A row that does not fit scrolls sideways.
- Reason: the names differ only in their number. Tabs that shrink, as the
  tabs of the centre column do, cut each name to "Ter…" at the limit.
- A press on a tab shows its terminal. The + opens a new terminal and
  shows it.
- At the limit, the + is off. A line under the row says "A workspace holds
  up to 10 terminals. Close one to open another." The line is text, not a
  tooltip, so a phone shows it too.
- Each tab has a close button while the workspace has more than one
  terminal. The last terminal has no close button, and the server refuses
  its close.
- Reason: the Terminal tool then never needs an empty state. `exit` still
  gives the last terminal a new shell.
- A close asks first, in a dialog on desktop and in a sheet on a phone.
  The question names the terminal, such as "Close Terminal 2?". It says
  "Its shell and any running commands end for everyone in this
  workspace." It confirms with "Close terminal" in the danger tone.
- Reason: a close also ends the running commands of the other members.
- A close ends the shell of the terminal and its running commands. Then
  its tab closes for every member.
- When the shown terminal closes, the tool shows the terminal before it,
  or the first. This also holds for a close by another member.
- A failed open shows the failure toast of the app, "The new terminal
  didn't open.", with the message of the server. A failed close shows the
  name of its terminal in the same way, such as "Terminal 2 didn't close."
- After a failed open or close, the terminals and their shells stay as
  they were. A Try again button in the toast was rejected, because the +
  and the close button stay in place for the next try.
- Each terminal has its own connection. A terminal that the user showed
  keeps its connection while it is hidden. So a switch back shows its
  screen at once.
- The saved view of each member keeps the shown terminal. A saved view
  without a terminal of the list shows the first terminal.
- Reason: a reload or another device of the member then shows the same
  terminal, as the saved view keeps the shown tool.
- The address of the Terminal tool can name a terminal. The tool then
  shows that terminal. An address of the Terminal tool without a terminal
  shows the saved terminal, or the first.

## Older software

- A workspace whose sandbox software opens only one shell shows one
  terminal, with no row of tabs. This lasts until an automatic software
  update applies, as [Updates](sandbox-software.md#updates) says. The
  server refuses a new terminal there.
- Reason: a + there would open a copy of the first shell. A row with one
  tab, no close button, and no + gives the user nothing.
- Terminal 1 is the shell that such software opens. So an update of the
  software ends no running shell.
- A Mac app build from before terminal tabs keeps one working terminal,
  the first of the list, with no tabs, until it updates. Reason: the Mac
  app bundles the web app of its own version, as
  [The page](desktop-app.md#the-page) says.

## The shell

- Each terminal opens its shell in the sandbox, in the folder of the
  workspace's repository (decision 94).
- The default shell prompt shows only the current folder name, such as
  `mokly`, in place of the full path.
- On desktop, a click on the Terminal tab of the tools panel moves the
  keyboard focus to the shown terminal. So does Go to Terminal, from its
  row of the command palette or its key, ⌘J on a Mac or Ctrl+J elsewhere.
  A terminal that still connects takes the focus when it shows, unless the
  user moved the focus in the meantime. A choice of another tool drops
  that wait. The user asked for the tab on 16 November 2026, and chose the
  same for Go to Terminal on the same day.
- Reason: a click on the tab says that the user wants to type in the
  shell, so a second click in the terminal is a wasted step. A terminal
  that takes the focus after the user chose another field was rejected,
  because the user's keys then go to the shell.
- The shell of each terminal keeps running when its connection drops. Each
  new connection of the terminal attaches to that shell, with its running
  commands and its current screen (decision 118).
- Reason: a connection can drop at any time, such as at a network change
  or when Cloudflare updates the runtime of the Worker. A shell that ends
  with its connection was rejected, because the user then loses a running
  command, such as a dev server.
- When the user ends the shell of a terminal, such as with `exit`, the
  next connection of that terminal opens a new shell in the same tab.
- A stop of the sandbox ends the shell of each terminal and its commands,
  as [Stop and resume](workspace-life.md#stop-and-resume) says. The list
  of terminals stays. The first connection of each terminal after the
  resume opens a new shell.
- The commands that the user typed in a shell stay in the command
  history after a stop. The new shell after the resume finds them, such as
  with the Up arrow or Ctrl-R (terminal history decision 1). Terminal
  history decisions are the decisions of the change that added this rule.
- Each command goes into the history file when it ends, before the next
  prompt. A command that still runs at the stop, such as a dev server, does
  not go in. An empty or unset `HISTFILE` keeps the history out of the
  file.
- Reason: Bash writes its history file only when the shell exits. The
  shell exits only during the shutdown at a stop, and a test on
  16 November 2026 found no history file after the resume. The append
  writes each command while the sandbox runs. A
  shell that also reads the new commands of the other shells at each
  prompt was rejected, because it changes the order of the Up arrow while
  the user works.
- After a start from a saved snapshot, the sandbox provider restores the
  disk in the background. A shell that starts after the restore ends opens
  in the live repository folder. A shell that started earlier moves to the
  live copy of its own folder once, at its first prompt after the app sees
  the end of the restore (decisions 147 and 149).
- Reason: when the restore ends, a running program keeps an old view of
  the disk at another path. A restart of the shell was rejected, because it
  ends running commands. A terminal that waits for the end of the restore
  was rejected, because the Terminal tool then waits too.
- Apart from that one move, the terminal never moves a running shell by
  itself. The app learns the end of the restore from a signal that the
  sandbox provider documents (decision 149).
- Reason: a move each time that the real folder of a shell differs from
  the path in its prompt was rejected, because it also moves a shell
  outside a restore. A check of the provider's path of the old view was
  rejected, because the provider does not document that path.

## The screen

- Every byte of output reaches the screen and its output history, also
  when a program writes faster than the screen redraws. The user chose
  this on 13 November 2026.
- Reason: the user copies long output, such as a build log. A terminal
  that keeps only the lines that end on the screen was rejected, because a
  test showed that it lost most lines of fast output. A copy of the
  history through the clipboard writes of tmux, a separate history view,
  and a join of screens during a drag were also rejected. The first lets a
  sandbox process write the user's clipboard, and the others leave the
  drag in the terminal broken or fragile.
- A new connection first shows the output history of the shell, up to
  2,000 lines, then its current screen. The screen keeps up to 2,000 lines
  of history. The user chose 2,000 lines on 13 November 2026.
- Reason: a reload shows the same history as a live screen. 5,000 and
  10,000 lines were rejected, because each connection then sends more
  data, which is slow on a phone.
- A plain drag selects text on the screen and in its output history, and
  the user can copy it, such as with Cmd+C on a Mac. A drag past the top
  or the bottom edge scrolls the history. This also holds while a program
  in the shell, such as vim, uses the mouse (decision 246).
- The wheel scrolls the output history. While a program in the shell uses
  the mouse, the wheel, the right button, and the middle button reach the
  program. A held Cmd on a Mac, or Ctrl on Windows and Linux, gives a
  click or a drag to the program, except a click on a link, as
  [Links](#links) says.
- Reason: the user expects to select and copy as in the rest of the page.
  A copy through the clipboard writes of the program was rejected, because
  any process in the sandbox could then write the user's clipboard.
- All viewers of a shell share one size, at most 500 columns and 200 rows.
  A new connection sets it, and so does the viewer where the user last
  typed, pasted, or resized. Each other viewer shows the shell at that
  size: with smaller text when the size is larger than its panel, and with
  empty space when it is smaller.
- Reason: the output of a program fits one size, so one size keeps the
  line breaks right for every viewer. The limit stops a program in the
  shell from setting a size that no browser can hold.
- Each key reaches the program in the shell. The terminal has no key
  commands and no status line of its own, so Ctrl-b reaches the shell. The
  user accepted this on 13 November 2026.
- Reason: terminal tabs open more shells, so the shell needs no window
  keys of its own.
- A paste reaches a program as a paste, also after a reconnect, so a
  program that marks pastes, such as vim or Bash, does not run the pasted
  text as keys.
- A workspace with older terminal software shows only its visible screen
  in the history until an automatic software update applies, as
  [Software updates](sandbox-software.md#updates) says.
- When the connection ends, the user can still select and copy the text
  that stays on the screen (decision 245).
- Reason: the screen keeps its output so that the user can still use it,
  such as an error message.
- On a phone, a row of keys adds the keys that a phone keyboard lacks.

## Links

[Terminal links](terminal-links.md) gives the rules of the links in the
output of each terminal: which addresses open, how they open, and the hint
of each link.
