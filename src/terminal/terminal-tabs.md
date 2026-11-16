# Terminal tabs

This guide belongs to [the terminal README](README.md). It gives the row of
terminal tabs of the Terminal tool, the writes of a terminal, and the
terminal that shows. [Terminal](../../docs/protocol/terminal.md#terminal-tabs)
states the requirements.

- The list of terminals comes with the terminal state, and each
  `terminals.updated` event replaces the whole list. An event during a
  read starts a new read, because the answer of the running read can hold
  the list from before the change. The tabs keep the order of the numbers.
- The row of tabs is above the screen, with the + at its end. It uses the
  styles of the tab row of the centre column, and of `TerminalTabs` of the
  mockups. Each tab shows its whole name, "Terminal 1" to "Terminal 10",
  also on a phone. A row that does not fit scrolls sideways, keeps the
  shown tab in view, and fades each end that clips tabs.
- Each tab is a link to the address of its terminal, which the route of
  the tool gives. A plain click shows the terminal. Another click, such as
  with Ctrl, opens the address in a new tab of the browser.
- The + opens a terminal, then shows it. At the limit of 10 terminals the +
  is off, and a line under the row says "A workspace holds up to 10
  terminals. Close one to open another."
- Each tab has a close button while the workspace has more than one
  terminal. The close asks first in the dialog of the app, which is a
  sheet on a phone. It names the terminal, and confirms with "Close
  terminal" in the danger tone. The question goes when its terminal closes
  or becomes the last one.
- A cancel gives the keyboard focus back to the close button. After a
  close that the user confirmed, the focus goes to the tab of the terminal
  that then shows, because the close button went away with its tab. A
  failed close keeps the focus on its close button.
- An open and a close that worked change the tabs at once, before their
  event. The + and the close button of a terminal turn busy while their
  write runs.
- A failed open or close shows the failure toast of the app with the
  message of the server: "The new terminal didn't open." or "Terminal 2
  didn't close.". The terminals stay as they were.
- When the shown terminal closes, also for another member, the terminal
  before it shows, or the first one. The route then follows that terminal.
- The tool shows the terminal of the address, else of the saved view. A
  saved terminal that is not in the list shows the first terminal. An
  address that names a terminal that is not in the list shows the first
  terminal too, and the tool saves nothing then. A terminal of the address
  that the saved view lacks goes into the saved view.
- Each terminal has its own connection, at the `socketPath` of its entry.
  Each terminal that the user showed stays mounted and connected while
  another one shows, so a switch shows its screen at once. A terminal that
  the user never showed opens no connection.
- Each terminal shows Disconnected with Reconnect after its own connection
  ended. Reconnect opens a new connection of that terminal only, and the
  other terminals keep theirs.
- A workspace whose software opens one shell, with `several` false, shows
  its first terminal with no row of tabs. An answer without a list, as from
  an older server, shows one terminal at the `socketPath` of the answer.
