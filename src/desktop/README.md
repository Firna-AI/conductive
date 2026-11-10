# Desktop

The Desktop tool shows the live desktop of a workspace's cloud computer,
where the agents use a browser. The app hides the tool for now and keeps
this code for its return, as
[Desktop](../../docs/protocol/workspace-tools.md#desktop) says. The
workspace screen offers no Desktop tab. An address or a saved view that
names Desktop shows Terminal, as
[the tools part](../shell/workspace/README.md#the-tools-part) says. The
[tools development page](../terminal/README.md#development-page) still
shows the tool.

## Behaviour

- Each mount of the tool asks the server for a new desktop URL, past the
  browser cache.
- The frame opens the URL exactly as the server sent it, with the token in
  its fragment. It sends no referrer.
- The bar says Connecting until the frame loads, then Live.
- When the page's content security policy blocks the stream's origin, the
  tool shows its error panel with Try again, not Live. The `frame-src` of
  the policy must list the stream's host, as
  [Frame sources](../../docs/deployment.md#frame-sources) says.
- The screen keeps the 16:10 shape of the desktop, inside the width and the
  height of its panel.
- A failed request shows its message and Try again.
- The tool does not act on the end of the URL's 10 minutes. Milestone 11
  checks whether an open stream ends then.

## Mount the tool

```tsx
<DesktopTool
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

`workspace` and `touch` are the same as for the
[terminal](../terminal/README.md#mount-the-tool). Mount the tool again at
each show, so that each show reads a new desktop URL.

## Key code

- `DesktopTool.tsx`: the tool, its states, and the Live bar.
- `DesktopFrame.tsx`: the frame of the stream.
- `desktopApi.ts`: the request for a new desktop URL.

See [Workspace tools](../../docs/protocol/workspace-tools.md#desktop)
and [Access and security](../../docs/protocol/terminal-previews-and-desktop.md#desktop).
