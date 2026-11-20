# Terminal

The Terminal tool shows the terminals of a workspace, each a shell in the
cloud computer, with a row of terminal tabs. It uses xterm.js. The
workspace screen shows it in the tools panel of the right column, and on a
phone as the Terminal page, as
[the tools part](../shell/workspace/README.md#the-tools-part) says.

This folder also holds the parts that the three tools share, in
`tool-parts/`, and the development page of the three tools, in `dev/`. They
are here because Milestone 12 owns only the three tool folders. A later
change can move the shared parts to the app's shared components.

## Behaviour

- The tool reads the terminal state of the workspace. It connects only in
  the `ready` state.
- A starting or stopped sandbox shows its state. When a `workspace.updated`
  event says that the sandbox runs, a waiting tool reads the state again. A
  tool whose read still runs starts a new read too. An answer to an older
  read can't bring back a wait.
- A failed or malformed answer shows an error with Try again.
- The row of terminal tabs, the open and the close of a terminal, and the
  terminal that shows follow [Terminal tabs](terminal-tabs.md).

### The screen

- The screen uses the Graphite tokens: the surface, the ink, the monospace
  font at 12px, lines 1.6 times the font size apart, and the status colours
  for the ANSI colours. It follows a change of the colour scheme.
- A program can change and reset the colours of the screen with OSC
  sequences, also while a hidden screen waits for its first open. The
  screen applies them in order when it opens. It answers no colour
  request from before the open, because a late answer can reach the shell
  as input. A change of the colour scheme discards the colours that
  programs set before it. This holds also before the open, so the open
  applies only the later ones.
- The screen fits its box, and sends its size at the start and at each
  change. It keeps 2,000 lines of history, as tmux does in the cloud
  computer.
- A workspace from a newer image runs the
  [terminal bridge](../../worker/terminal/README.md#the-terminal-bridge),
  which passes every byte of the shell to the screen and says hello first.
  The screen reads the private messages of the bridge with its OSC handler,
  and shows none of them. It accepts the first hello of a connection, and
  later messages only with the nonce of that hello. After the hello:
  - the screen answers with its text and background colours, and sends
    them again after each change of the colour scheme;
  - it acknowledges each mark of the flow control;
  - it sends no reply of xterm.js, because tmux answers the program;
  - it sends focus reports and pastes as messages, so the bridge pastes
    through tmux with the bracketed paste marks of the program. It sends
    each mouse report as a message too, so the bridge can tell it from a
    key: a mouse report does not take the shared size;
  - it shows the size that all viewers share. The session gives the
    screen each shared size where the message comes in the output, also
    while the screen is hidden. The screen sends the size of its
    panel, counted at the normal font. A larger shared size gets a smaller
    font, down to 6px, and the panel scrolls when even that does not fit.
    A smaller one leaves empty space, with a line at its edge.
- Without a hello, as with an older image, the screen works as before. A
  mouse report in the SGR encoding then goes as input. The transport takes
  text only, so a mouse report that xterm.js sends as binary data, in the
  old X10 format, goes nowhere.
- On a phone, a key row adds Esc, Tab, Ctrl, Up, and Down. The keys keep the
  keyboard focus on the terminal. Ctrl applies to the user's next key only.
- xterm.js answers some requests of programs by itself, such as a cursor
  report, and it reports focus changes when a program asks for them. These
  replies reach the shell, but they keep a held Ctrl and count as no
  activity. The screen marks them where xterm.js makes them, so a key with
  the same bytes, such as Shift+F3, stays the user's key.
- A plain drag selects text, also while a program, such as tmux, has the
  mouse. The screen sends each plain left press to xterm.js again as a
  forced selection, with Option on a Mac and Shift elsewhere. The wheel,
  the right and middle buttons, and a press with Cmd or Ctrl still reach
  the program. On a Mac, Cmd+C copies the selection.
- Each `http` and `https` address of the output is a link, and so is a
  link that a program marks with OSC 8. A click with Cmd on a Mac, or Ctrl
  elsewhere, opens it. A touch opens it with no key. A plain click selects,
  as before.
- A link under a mouse pointer shows the underline of xterm.js and a hint
  below it, or above it on the last rows: "⌘-click to open" or "Ctrl+click
  to open". The hint of an OSC 8 link adds the host of its real address.
  A touch shows no hint.
- A click with the key on a link opens it and does not reach a program
  that has the mouse. The screen stops the press after the link part of
  xterm.js hears it, and before xterm.js sends it to the program. Off a
  link, the click still reaches the program.
- Every local address names the cloud computer, also an address with the
  app origin. An address with another scheme, a user name, or a password
  opens nothing and shows no hint.
- When the connection ends, the screen keeps its output, takes no more
  input or size, and offers Reconnect. It also turns off the mouse reports
  of the program, so a drag selects the text and shows the text cursor.
- Another workspace starts the tool again, so no input reaches the old one.

## Mount the tool

```tsx
<TerminalTool
  connect={connectTerminal}
  route={terminalRoute}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

- `connect` takes the `socketPath` of one terminal, from its entry in the
  list, and opens its decoded transport. The shell gives
  `createTerminalConnector` of `src/app/terminal-transport.ts` over
  `openSocket` of the app's event source, with the fixed `tty`
  subprotocol. It opens `socketPath` on the Worker of the app, also in the
  Mac app, and decodes the ttyd protocol into the `TerminalTransport` of the
  [shared contracts](../shared/README.md). Keep the function stable. The
  transport says how it ended: `closed` for a close of the server, and
  `lost` for a drop with no close frame, code 1006, or code 1001 or 1012.
  A lost connection connects again once by itself, as `retries` of
  `terminalRetry.ts` says. A close of the server, a failed try, and a
  `connect` that throws show Disconnected with Reconnect. Each new
  connection of a terminal writes on the same xterm.js screen, which keeps
  the old output until the new connection shows its own, as
  `screenConnection.ts` says. A source without `openSocket`, as in the
  development fake, throws. The transport takes text only. The rules for the binary mouse
  reports of xterm.js are under Behaviour.
- `route` is the `TerminalRoute` of `terminalRoute.ts`: `terminalId`, the
  terminal of the address, `saved`, the terminal of the saved view, `href`,
  the address of a tab, and `show`, which shows a terminal. `show` takes
  `push` for a press on a tab and for a new terminal, and `replace` for a
  terminal in the place of a closed one, or for the terminal of the
  address that the saved view lacks. The owner saves the terminal and
  moves the address, as
  [the tools part](../shell/workspace/tools-part.md) says.
  Keep the object stable while it names the same terminals.
- `links` is optional. It gives the app origin with the page check of the
  router, and the `open` of each `TerminalLink`: a local address with its
  port, an app page, or a web link. Without it, no link opens and no hint
  shows. The workspace screen gives it, as
  [the tools part](../shell/workspace/tools-part.md)
  says.
- `onActivity` is optional. It runs for each input of the user: keys, text,
  paste, and mouse reports. It does not run for the replies of xterm.js.
  The development page shows the number of these inputs.
- The workspace screen passes no `onActivity`. The input listener of the
  app page already counts the user's input in the terminal as activity, as
  [the web app](../app/README.md#rules-for-this-code) says. The Worker
  counts no terminal frame as activity.
- `workspace.fetch` is the app's fetch. `workspace.subscribe` is required.
  It delivers the events of the workspace in order. Keep both stable.
- `touch` selects the phone layout: 40px controls and the key row.
- `focusRequest` is optional. A new request moves the keyboard focus to
  the xterm.js screen of the shown terminal. A hidden terminal never takes
  it. A request waits until that screen opens, also across the read of
  the terminals, the mount, and the connection of the terminal. The screen
  takes it only while the focus is still on the element of the request,
  `from`, or on no element. Then it calls `onFocusDone`, and the owner
  clears the request. So a reconnect does not take the focus again. In
  StrictMode, the second screen takes the request too, because the request
  still holds until the owner clears it.
- `focusOnShow` is optional. A click on a tab and the + call it at the
  press, and call its result once their terminal shows, so the owner asks
  for the focus with the element of the press. Without it, as on a phone,
  these controls move no focus.
- `screenRef` is optional. It gets the element of the xterm.js screen,
  without the key row and the buttons of the tool, such as Reconnect. The
  workspace screen marks this element for the shortcut layer, so only the
  screen keeps the keys that a shell reads, as
  [Where a key goes](../../docs/protocol/keyboard-shortcuts.md#where-a-key-goes)
  says.
- The tool needs the Graphite tokens as `--ui-*` variables and the Firna
  theme provider, as the mockup renderer gives them. The tabs also need
  the toasts of the app, a `ToastProvider` of `@firna/ui/toast`, and the
  `OverlayHost` of `src/shell/ui/Overlay.tsx`, where the close question
  opens. The `ThemeRoot` and the frame of the app give both.
- Keep the tool mounted while another tool shows, if the shell must keep the
  connections. An unmounted tool closes its connections.
- An owner that runs the + from outside the tool keeps the terminals
  itself: `useTerminals(workspace, route)` gives the state of the tool, its
  actions, and `canOpen`, while the + takes a press. `TerminalToolView`
  takes them in place of `workspace`. The workspace screen does this for
  New terminal of the command palette, through `actions.openThen`.

## Workspace events

[Workspace events](workspace-events.md) gives how the Terminal and Preview
tools read their data and the events of their workspace, through a tool
store.

## Development page

The development page shows the three tools against the
[fake API](../test-support/README.md), with the fake terminal. Its fixture
pages stand in for a previewed app and a desktop stream. The app build does
not include it.

After the [Get started](../../README.md#get-started) setup:

1. Run `npm run dev`.
2. Open `http://127.0.0.1:5173/src/terminal/dev/tools`.

The address holds the settings: `tool` (`terminal`, `preview`, `desktop`),
`state`, `layout` (`panel`, `phone`), `scheme` (`dark`, `light`), `workspace`,
`preview`, `terminal`, and `ports`. `ports` chooses the stored report of the listening
ports: `servers`, `empty`, `unknown`, or `failed`, which adds a failed repair
3 minutes before the fake time of the Preview tool. The panel layout has the
440 × 389 size of the tools in the right column. The phone layout has the 390 × 636 size of a tool page on a
phone. The page lists each request and each call of the terminal transport,
with the terminal of its socket.

The terminal states `several`, `limit`, and `failing` start with 3, 10, and
3 terminals. In `failing`, each open and close of a terminal fails, as when
the sandbox does not answer. `older` has the software of a sandbox that
opens one shell. `terminal` names the shown terminal, as the address
`terminal/<terminalId>` does in the app, and a press on a tab moves it. The
page keeps the saved terminal itself. Each terminal has its own echo
terminal, which prints its ID after the log of the mockup. The page shows
the toasts of the app, and the close question opens over the page, or as a
sheet in the phone frame.

The buttons send fake events: revoke a preview, start the sandbox, end the
connection of the shown terminal, open a terminal and close the shown one
as another member does, and change the workspace. In the `late` state, the
terminal reads that start before the sandbox runs wait for Answer held
reads. Three buttons make the shell ask for the cursor position, turn on
focus reports, and turn on mouse reports, as tmux does. Print 300 lines
fills the history for a drag past the top edge. Bridge hello, Larger
shared size, and Smaller shared size send the messages of a fake terminal
bridge. Print link prints a link with a label, as a test reporter does
with OSC 8. These buttons leave the keyboard on the terminal. The page lists
each link that opens, in place of opening it.

## Key code

- `TerminalTool.tsx`: the tool and its states, and `TerminalToolView`, the
  tool over the terminals of its owner. `useTerminals.ts`: those terminals.
- `OpenTerminals.tsx`: the ready tool: the row of tabs, a pane for each
  terminal that the user showed, with its Disconnected bar, and the close
  question.
- `TerminalTabs.tsx`: the row of terminal tabs, the +, and the line at the
  limit. `CloseTerminalQuestion.tsx`: the question before a close.
- `terminalStore.ts`: `createTerminalStore`, which makes the tool store of
  one workspace, with its reducer, its read of the terminal state, and the
  event number of each list event.
- `terminalReadiness.ts`: the states of the tool, its reads, and its events.
- `readyTerminals.ts`: the list of a ready tool and the event number of
  that list, what it keeps for each terminal, the writes that run, and the
  place of a shown terminal that closed. It takes only a newer list, as
  [Terminal tabs](terminal-tabs.md) says.
- `terminalRoute.ts`: `TerminalRoute`, and `shownTerminal`, which picks the
  shown terminal from the route and the list.
- `useTerminalActions.ts`: the open, also from outside the tool, and the
  close, and their failure toasts. `terminalCopy.ts`: the words of the tabs.
- `TerminalScreen.tsx`: the xterm.js screen of one terminal, its
  connections, its focus request, and the key row.
- `screenConnection.ts`: `openScreen` makes the xterm.js screen of a
  terminal, which outlives each connection. The screen opens in its box
  once the box has a size. `connectScreen` connects one transport to the
  screen. It fits the screen to its box, or shows the shared size of the
  bridge.
- `xtermScreen.ts`: splits the data of xterm.js into the user's input and
  its own replies.
- `xtermColours.ts`: `keepColoursUntilOpen` keeps the colour changes that
  xterm.js parses before the screen opens, and gives them to xterm.js at
  the open. Each change of the xterm.js theme drops those from before it.
  It relies on private parts of xterm.js, as its comment says.
- `terminalLinks.ts`: the kind of a link of the terminal, from the shared
  reader `webLink` of `src/markdown/web-links.ts`, the key of a link
  click, and the hint.
- `xtermLinks.ts`: the links of xterm.js: the web links addon, the
  handler of OSC 8 links, the hint, and the stop of a link click before it
  reaches a program.
- `plainPresses.ts`: keeps plain left presses for the selection of the page
  while a program has the mouse.
- `terminalSession.ts`: connects the screen to a `TerminalTransport`, and
  speaks with the terminal bridge after its hello.
- `bridgeLink.ts`: reads the messages of the bridge with the nonce rule,
  and builds the paste message.
- `sharedSize.ts`: the font that fits a shared size into the panel.
- `terminalKeys.ts`: the bytes of the key row and of Ctrl with a key.
- `terminalTheme.ts`: the colours and the type of the screen from the tokens.
- `terminalApi.ts`: reads the terminal state and its list, and opens and
  closes a terminal.
- `tool-parts/request.ts`: JSON requests, response parsers, and errors.
- `tool-parts/workspace.ts`: the workspace of a tool, its required event
  subscription, and the filter of its workspace's events.
- `tool-parts/toolStore.ts`: `ToolStore`, which owns that subscription and
  the reads of a tool. Its `connect` starts both, and the result stops them.
- `tool-parts/ToolRoot.tsx`, `ToolButtons.tsx`, `ToolStates.tsx`: the
  dense and touch controls, and the waiting and message states.
- `dev/tools.html`: the development page. `dev/devTerminal.ts` holds its
  echo terminal and its held reads. `dev/devTerminals.ts` opens and closes
  terminals as another member does, and `dev/devRoute.ts` gives the route
  of the Terminal tool on the page.

See [the previews](../previews/README.md), [the desktop](../desktop/README.md),
[Terminal](../../docs/protocol/terminal.md),
and [Access and security](../../docs/protocol/terminal-previews-and-desktop.md#terminal).
