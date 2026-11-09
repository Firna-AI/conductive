# Terminal

The Terminal tool shows a shell in the cloud computer of a workspace. It uses
xterm.js. The workspace screen shows it in the tools panel of the right
column, and on a phone as the Terminal page, as
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
- The screen uses the Graphite tokens: the surface, the ink, the monospace
  font at 12px, lines 1.6 times the font size apart, and the status colours
  for the ANSI colours. It follows a change of the colour scheme.
- The screen fits its box, and sends its size at the start and at each
  change.
- On a phone, a key row adds Esc, Tab, Ctrl, Up, and Down. The keys keep the
  keyboard focus on the terminal. Ctrl applies to the user's next key only.
- xterm.js answers some requests of programs by itself, such as a cursor
  report, and it reports focus changes when a program asks for them. These
  replies reach the shell, but they keep a held Ctrl and count as no
  activity. The screen marks them where xterm.js makes them, so a key with
  the same bytes, such as Shift+F3, stays the user's key.
- When the connection ends, the screen keeps its output, takes no more
  input or size, and offers Reconnect.
- Another workspace starts the tool again, so no input reaches the old one.

## Mount the tool

```tsx
<TerminalTool
  connect={connectTerminal}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

- `connect` opens the decoded transport of a ready terminal. The shell
  gives `createTerminalConnector` of `src/app/terminal-transport.ts` over
  `openSocket` of the app's event source. It opens `socketPath` on the
  Worker of the app, also in the Mac app, and decodes the ttyd protocol into
  the `TerminalTransport` of the
  [shared contracts](../shared/README.md). Keep the function stable. A
  transport that closes, or a `connect` that throws, shows Disconnected with
  Reconnect. A source without `openSocket`, as in the development fake,
  throws. The transport takes text only, so the tool does not send the
  mouse reports that xterm.js sends as binary data, in the old X10 format.
- `onActivity` is optional. It runs for each input of the user: keys, text,
  paste, and mouse reports. It does not run for the replies of xterm.js.
  The development page shows the number of these inputs.
- The workspace screen passes no `onActivity`. The input listener of the
  app page already counts the user's input in the terminal as activity, as
  [the web app](../app/README.md#rules-for-this-code) says. The Worker
  counts no terminal frame as activity.
- `workspace.fetch` is the app's fetch. `workspace.subscribe` is required.
  It delivers the events of the workspace in order. Keep both stable.
- `touch` selects the phone layout: 44px controls and the key row.
- The tool needs the Graphite tokens as `--ui-*` variables and the Firna
  theme provider, as the mockup renderer gives them.
- Keep the tool mounted while another tool shows, if the shell must keep the
  connection. An unmounted tool closes its connection.

## Workspace events

The Terminal and Preview tools read their data and the events of their
workspace through a tool store, `ToolStore` in `tool-parts/`. The Desktop
tool reads no events.

- The store is plain TypeScript. It holds the state of one tool of one
  workspace, and gives each action to the tool's reducer. React reads it
  with `useSyncExternalStore`, through `ToolStore.subscribe` and
  `getSnapshot`.
- `TerminalToolBody` and `PreviewToolBody` get their stores through
  `useWorkspaceStore` of [the web app](../app/README.md#data-lifecycle).
  The stable `create` is the factory of the tool: `createTerminalStore` in
  `terminalStore.ts`, or `createPreviewsStore` in
  `../previews/previewsStore.ts`. The stable `connect` calls
  `ToolStore.connect` with the `fetch` and `subscribe` of the workspace.
  Another workspace gets another store.
- The hook connects the store after the render, and stops it at unmount.
  The connection subscribes to `workspace.subscribe`, then reads the data
  that the state needs. The stop ends that subscription and aborts a read
  that has no answer. A late answer of that read changes nothing. A render
  starts no read and no subscription.
- The store passes each event of its own workspace to the reducer, as the
  `WorkspaceEvent` itself, in the order of the subscription. It drops the
  events of other workspaces. The tool's own actions, such as a request
  result, go to the same reducer.
- A subscription can deliver its stored history at once, inside the
  subscribe call. The store is already connected then, so the reducer gets
  each event of that history.
- The state gives the number of the read that it needs. An action or an
  event that changes the number, such as Try again, starts a new read and
  aborts the older one. The store checks the read one microtask after a
  change. So a burst of changes, such as a stored history, starts one read.
  An answer counts only while the state still needs its read.
- In React's StrictMode, the hook connects, stops, and connects again. The
  second subscription can deliver the history again, and the reducers
  accept a repeated event.
- A new `workspace.subscribe` or `workspace.fetch` makes the hook stop the
  store and connect it again. The store keeps its state, such as the
  revoked previews, and takes events only from the new subscription. It
  reads again only with a new `fetch`, or when the stop ended a read before
  its answer.
- The state stays the same object until an action or an event changes it,
  so React renders only after a change.

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
and `preview`. The panel layout has the 440 × 389 size of the tools in the
right column. The phone layout has the 390 × 636 size of a tool page on a
phone. The page lists each request and each call of the terminal transport.

The buttons send fake events: revoke a preview, start the sandbox, end the
terminal connection, and change the workspace. In the `late` state, the
terminal reads that start before the sandbox runs wait for Answer held
reads. Two buttons make the shell ask for the cursor position and turn on
focus reports. These two buttons leave the keyboard on the terminal.

## Key code

- `TerminalTool.tsx`: the tool and its states.
- `terminalStore.ts`: `createTerminalStore`, which makes the tool store of
  one workspace, with its reducer and its read of the terminal state.
- `terminalReadiness.ts`: the states of the tool, its reads, and its events.
- `TerminalScreen.tsx`: the xterm.js screen, its fit, and the key row.
- `xtermScreen.ts`: splits the data of xterm.js into the user's input and
  its own replies.
- `terminalSession.ts`: connects the screen to a `TerminalTransport`.
- `terminalKeys.ts`: the bytes of the key row and of Ctrl with a key.
- `terminalTheme.ts`: the colours and the type of the screen from the tokens.
- `terminalApi.ts`: reads the terminal state.
- `tool-parts/request.ts`: JSON requests, response parsers, and errors.
- `tool-parts/workspace.ts`: the workspace of a tool, its required event
  subscription, and the filter of its workspace's events.
- `tool-parts/toolStore.ts`: `ToolStore`, which owns that subscription and
  the reads of a tool. Its `connect` starts both, and the result stops them.
- `tool-parts/ToolRoot.tsx`, `ToolButtons.tsx`, `ToolStates.tsx`: the
  dense and touch controls, and the waiting and message states.
- `dev/tools.html`: the development page. `dev/devTerminal.ts` holds its
  echo terminal and its held reads.

See [the previews](../previews/README.md), [the desktop](../desktop/README.md),
[Workspaces and sandboxes](../../docs/protocol/workspace-tools.md#terminal),
and [Access and security](../../docs/protocol/terminal-previews-and-desktop.md#terminal).
