# Terminal

The Terminal tool shows a shell in the cloud computer of a workspace. It uses
xterm.js. The workspace screen shows it in the tools panel of the right
column, and on a phone as the Terminal page. Milestone 15i mounts it and
wires it to the backend.

This folder also holds the parts that the three tools share, in
`tool-parts/`, and the development page of the three tools, in `dev/`. They
are here because Milestone 12 owns only the three tool folders. A later
change can move the shared parts to the app's shared components.

## Behaviour

- The tool reads the terminal state of the workspace. It connects only in
  the `ready` state.
- A starting or stopped sandbox shows its state. The tool reads the state
  again when a `workspace.updated` event says that the sandbox runs.
- A failed or malformed answer shows an error with Try again.
- The screen uses the Graphite tokens: the surface, the ink, the monospace
  font at 12px, lines 1.6 times the font size apart, and the status colours
  for the ANSI colours. It follows a change of the colour scheme.
- The screen fits its box, and sends its size at the start and at each
  change.
- On a phone, a key row adds Esc, Tab, Ctrl, Up, and Down. The keys keep the
  keyboard focus on the terminal. Ctrl applies to the next key only.
- When the connection ends, the screen keeps its output, takes no more
  input or size, and offers Reconnect.
- Another workspace starts the tool again, so no input reaches the old one.

## Mount the tool

```tsx
<TerminalTool
  connect={connectTerminal}
  onActivity={countTerminalInput}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

- `connect` opens the decoded transport of a ready terminal. Milestone 15i
  supplies it: a socket at `socketPath` that decodes the ttyd protocol into
  the `TerminalTransport` of the
  [shared contracts](../shared/README.md). Keep the function stable. A
  transport that closes, or a `connect` that throws, shows Disconnected with
  Reconnect.
- `onActivity` runs for each key that the user sends. The shell can count it
  as activity with the source `terminal`, at the rate that it chooses.
- `workspace.fetch` is the app's fetch. `workspace.subscribe` delivers the
  events of the workspace in order. Keep both stable.
- `touch` selects the phone layout: 44px controls and the key row.
- The tool needs the Graphite tokens as `--ui-*` variables and the Firna
  theme provider, as the mockup renderer gives them.
- Keep the tool mounted while another tool shows, if the shell must keep the
  connection. An unmounted tool closes its connection.

## Development page

The development page shows the three tools against the
[fake API](../test-support/README.md), with the fake terminal. Its fixture
pages stand in for a previewed app and a desktop stream. The app build does
not include it.

1. Put `APP_ORIGIN=http://127.0.0.1:5173` in `.dev.vars`. Without it, the
   Worker refuses the module scripts of the page.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:5173/src/terminal/dev/tools`.

The address holds the settings: `tool` (`terminal`, `preview`, `desktop`),
`state`, `layout` (`panel`, `phone`), `scheme` (`dark`, `light`), `workspace`,
and `preview`. The panel layout has the 440 × 389 size of the tools in the
right column. The phone layout has the 390 × 636 size of a tool page on a
phone. The buttons send fake events: revoke a preview, start the sandbox,
end the terminal connection, and change the workspace. The page lists each
request and each call of the terminal transport.

## Key code

- `TerminalTool.tsx`: the tool and its states.
- `TerminalScreen.tsx`: the xterm.js screen, its fit, and the key row.
- `terminalSession.ts`: connects the screen to a `TerminalTransport`.
- `terminalKeys.ts`: the bytes of the key row and of Ctrl with a key.
- `terminalTheme.ts`: the colours and the type of the screen from the tokens.
- `terminalApi.ts`: reads the terminal state.
- `tool-parts/request.ts`: JSON requests, response parsers, and errors.
- `tool-parts/workspace.ts`: the workspace of a tool and its events.
- `tool-parts/ToolRoot.tsx`, `ToolButtons.tsx`, `ToolStates.tsx`: the
  dense and touch controls, and the waiting and message states.
- `dev/tools.html`: the development page.

See [the previews](../previews/README.md), [the desktop](../desktop/README.md),
[Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md#terminal),
and [Access and security](../../docs/protocol/access-and-security.md#terminal).
