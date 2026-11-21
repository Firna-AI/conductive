# Terminal

This doc holds the requirements and the decisions in force for the Terminal
tool of a workspace. It covers the terminals of a workspace and their tabs.
[Terminal shell](terminal-shell.md) gives the shell of each terminal,
[Terminal screen](terminal-screen.md) gives its screen, and
[Terminal links](terminal-links.md) gives the links in its output. It
belongs to
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
- A server can also run as a [service](services.md), which the Preview tool
  lists. A service is no terminal. It has no shell and no screen, and it
  does not count toward the limit of 10 terminals.
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
- An address that names a terminal that is not in the list, such as a link
  to a closed terminal, shows the saved terminal, or the first, as an
  address without a terminal does. The address then names the shown
  terminal (terminal tabs decision 4 A).
- Reason: one rule then covers each address that names no known terminal,
  and the member gets the terminal that they used last. Always the first
  terminal was rejected, because the member then loses the terminal that
  they used last. The first terminal with a notice that the named terminal
  closed was rejected, because it needs a new state of the screen, and the
  member cannot bring the closed terminal back.

## Older software

- A workspace whose terminal service opens only one shell shows one
  terminal, with no row of tabs. The server refuses a new terminal there.
- Reason: a + there would open a copy of the first shell. A row with one
  tab, no close button, and no + gives the user nothing.
- This lasts until the terminal service of a newer release starts, at a
  later start of the sandbox or at a restart of the software (terminal
  tabs decision 6 B). [Restart the software](restart-the-software.md)
  gives each kind of restart that restarts the terminal service. An
  automatic software update brings that release. An install while the
  workspace is idle does not restart the terminal service, as
  [Installs at idle](sandbox-software.md#installs-at-idle) says.
- After a restart of the software, the Terminal tool shows the row of
  terminal tabs with no reload when the new terminal service opens several
  shells.
- Reason: Restart is the control that a member presses to apply new
  software, and it keeps every shell. Terminal tabs only at a later start
  were rejected, because a member of a workspace that stays on then waits
  for a stop and a resume.
- A restart of the terminal service alone, which the Worker starts by
  itself while no terminal is connected, was rejected. It needs a new
  privileged command, a block of new connections, and a notice to the
  other tabs. The
  [automatic restart](restart-the-software.md#automatic-restart) is not
  that option. It restarts the terminal service together with the agent
  runner and the preview relay.
- A terminal ID inside the data stream of each connection, so that an
  older terminal service opens several shells, was rejected too. It adds a
  second path for the terminal ID, which needs its own security review,
  and a sandbox with even older terminal software still waits.
- Terminal 1 is the shell that such software opens. So an update of the
  software ends no running shell.
- A Mac app build from before terminal tabs keeps one working terminal,
  the first of the list, with no tabs, until it updates. Reason: the Mac
  app bundles the web app of its own version, as
  [The page](desktop-app.md#the-page) says.

## The shell

[Terminal shell](terminal-shell.md) gives the rules of the shell of each
terminal: its folder and prompt, the focus, its connection, its end, its
command history, its folder after a restore, and what an out-of-memory
kill ends.

## The screen

[Terminal screen](terminal-screen.md) gives the rules of the screen of
each terminal: its output history, the selection and the mouse, its
size, its keys, and the paste.

## Links

[Terminal links](terminal-links.md) gives the rules of the links in the
output of each terminal: which addresses open, how they open, and the hint
of each link.
