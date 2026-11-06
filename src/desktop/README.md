# Desktop

The Desktop tool shows the live desktop of a workspace's cloud computer,
where the agents use a browser. The workspace screen shows it in the tools
panel of the right column, and on a phone as the Desktop page. Milestone 15i
mounts it and wires it to the backend.

## Behaviour

- Each mount of the tool asks the server for a new desktop URL, past the
  browser cache.
- The frame opens the URL exactly as the server sent it, with the token in
  its fragment. It sends no referrer.
- The bar says Connecting until the frame loads, then Live.
- The screen keeps the 16:10 shape of the desktop, inside the width and the
  height of its panel.
- A failed request shows its message and Try again.
- The tool does not act on the end of the URL's 10 minutes. Milestone 11
  checks whether an open stream ends then.

## Mount the tool

```tsx
<DesktopTool touch={phone} workspace={{ orgId, workspaceId, fetch }} />
```

`workspace` and `touch` are the same as for the
[terminal](../terminal/README.md#mount-the-tool).

## Key code

- `DesktopTool.tsx`: the tool, its states, and the Live bar.
- `DesktopFrame.tsx`: the frame of the stream.
- `desktopApi.ts`: the request for a new desktop URL.

See [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md#desktop)
and [Access and security](../../docs/protocol/access-and-security.md#desktop).
