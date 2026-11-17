# The tools part

This guide belongs to [the workspace screen](README.md). It gives the
Terminal and Preview tools of the shell, the hidden Desktop tool, their
addresses, and New terminal of the command palette.

The shell gives its own Terminal and Preview tools, with the
[terminal](../../terminal/README.md) and the
[previews](../../previews/README.md). It keeps the
[Desktop tool](../../desktop/README.md) hidden, as
[Desktop](../../../docs/protocol/workspace-tools.md#desktop) says. A
`tools` part of the host takes their place. An archived workspace has no
tools.

- While the sandbox does not run, the tools show its state: starting,
  stopped, failed, or refused. On desktop the panel keeps its tabs around
  the state. A phone shows the state on the tool page. No tool mounts then,
  so no tool reads its route or opens the terminal.
- A `tools` part of the host shows only while the sandbox runs. The shell
  shows the state of the sandbox in its place.

| Address | What shows |
| ------- | ---------- |
| `terminal` | The Terminal tool, with the saved terminal or the first |
| `terminal/<terminalId>` | The Terminal tool, with that terminal. A terminal that is not in the list shows the saved one, or the first, and the address moves to it |
| `preview`, `preview/<previewId>` | The Preview tool, with that preview |
| `preview/port/<port>` | The Preview tool, which shows or opens the preview of that port |
| `desktop` | The Terminal tool, because Desktop is hidden |

- An address that names a tool shows it and saves it as `tool` of the
  view. Without one, the saved view names the tool.
- `previewPortHref` gives the address of a port. Its port is a whole
  number from 1 to 65535, with no leading zero. Another value shows the
  Preview tool with no preview and no port.
- The Preview tool shows or opens the preview of the port of the address,
  as [the previews](../../previews/README.md#behaviour) say. Then the
  address of that preview takes the place of the address of the port, with
  no new history entry. After a failed open, `preview` takes its place.
- The `desktop` address and a saved `desktop` tool show Terminal. Neither
  mounts Desktop or saves Terminal in place of the saved tool. The view
  keeps `desktop` as a valid tool.
- On desktop the panel has a tab for each tool that the app offers. A
  click saves the tool,
  and the address keeps the tab of the centre. Only a tool address follows
  the new tool. A preview tab changes the address only from a preview
  address, and otherwise picks the preview in the panel.
- On desktop, a choice of Terminal moves the keyboard focus to the shown
  terminal, as [The shell](../../../docs/protocol/terminal.md#the-shell)
  says. The `select` of `useToolSelect` runs for a click on its tab and for
  Go to Terminal of the palette or its key. It asks `terminalFocus` of the
  workspace context, a `TerminalFocus` that each workspace screen keeps.
  The request holds the element with the focus at the choice. A choice of
  another tool drops it. The tools part passes it through `TerminalPart`
  to the `focusRequest` of the Terminal tool, only while Terminal shows,
  and drops it once the terminal took it. Only the screen of the shown
  terminal takes it, also when that terminal still loads or connects. A
  phone asks for no focus, because its keyboard would cover the page.
- New terminal, the + of the terminal tabs, and a click on a terminal tab
  also move the focus on desktop (terminal tabs decision 5 D). They start
  a request with `askOnShow` of `TerminalFocus`, which keeps the element
  with the focus at the press, and ask once their terminal shows. A choice
  of another tool before that ends the wait. A terminal that took the
  request calls `done`, which ends no other wait.
- On a phone each tool that the app offers is a page of the tab bar, with
  its own address.
- The terminal and Preview each mount at their first show, then stay
  mounted and hidden while another tool shows. So the terminals keep their
  connections, and the page in the preview frame does not load again when
  the user goes back to Preview. The socket of each terminal opens at the
  `socketPath` of its entry of the terminal state, through `openSocket` of
  the app's event source, so the Mac app reaches its own Worker.
- On desktop the terminals of the workspace load while the sandbox runs,
  also before the Terminal tool shows, as [New terminal](#new-terminal)
  says. They open no connection until the tool shows a terminal. A phone
  loads them at the first show of the Terminal page.
- `useTerminalRoute` of `tools/terminal-route.ts` gives the Terminal tool
  the terminal of the address, else `terminal` of the saved view, and a
  show that saves it. From an address of the Terminal tool, also
  `desktop`, the address follows the shown terminal. From another address,
  it stays. See [the tabs](../../terminal/terminal-tabs.md).
- The mount of the Desktop tool stays for its return. It mounts at each
  show, so it reads a new desktop URL.
- The tools part marks the xterm.js screen of each terminal for the
  [shortcut layer](../shortcuts/README.md), through the `screenRef` of
  the Terminal tool. So the screen keeps the keys that its shell reads, such
  as Ctrl+K on Windows and Linux, as
  [Where a key goes](../../../docs/protocol/keyboard-shortcuts.md#where-a-key-goes)
  says. The buttons of the tool, such as Reconnect, keep no key.
- The tools part gives the terminal its links, from `useTerminalLinks` of
  `tools/terminal-links.ts`. A local address goes to `previewPortHref` of
  its port, an app page to its address in the app, and every other link to
  `openInNewTab`. The router decides which addresses of the app origin are
  pages.
- The tabs of the tools panel name the keys of Go to Terminal and Go to
  Preview in their tooltips, as the palette's Go to rows run them.
- Each tool reads its routes with the `fetch` of the org's `ApiClient`,
  and the events of the kept `ToolEvents`.

## New terminal

The command palette offers New terminal after the Go to rows, as
[Actions](../../../docs/protocol/command-palette-actions.md#actions) says.

- `TerminalPart` of `tools/TerminalPart.tsx` keeps the terminals of the
  workspace through `useTerminals` of the
  [terminal](../../terminal/README.md#mount-the-tool), and draws the
  Terminal tool over them at its first show. On desktop it mounts while
  the sandbox runs, also before that first show.
- It offers New terminal through `useNewTerminalOffer` of
  `WorkspacePaletteActions.tsx`, while the + of the terminal tabs takes a
  press: while the terminal is ready, its software opens more terminals,
  the workspace has fewer than 10, and no open runs. The row also needs
  the Go to rows, so it shows only on desktop while the right column
  shows. The palette puts it with the rows of the screen, in the order of
  the palette.
- New terminal runs the open of the +. Once the new terminal shows, it
  shows the Terminal tool where another tool showed, as Go to Terminal
  does. It shows no terminal before the open ends, so a terminal that the
  user never showed opens no connection. A failed open shows the failure
  toast of the +.
- New terminal moves the focus into the new terminal, as the + does. It
  starts its request at the run, and shows the tool with
  `select('terminal', { focus: false })`, so that the select makes no
  request of its own.
- A key that the person gives New terminal on the Keyboard shortcuts tab
  runs the row, as for each command that the palette lists. It has no
  default key.
