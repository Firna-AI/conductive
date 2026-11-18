# Workspace events

This guide belongs to [the terminal README](README.md).

The Terminal and Preview tools read their data and the events of their
workspace through a tool store, `ToolStore` in `tool-parts/`. The Desktop
tool reads no events.

- The store is plain TypeScript. It holds the state of one tool of one
  workspace, and gives each action to the tool's reducer. React reads it
  with `useSyncExternalStore`, through `ToolStore.subscribe` and
  `getSnapshot`.
- `useTerminals` and `PreviewToolBody` get their stores through
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
- A tool whose definition has `fromEnvelope` gets the action that it gives
  for each envelope, in place of the event. So a tool can read the time of
  an event, as the Preview tool does for a failed repair of its list.
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
