# Port previews

The Preview tool shows the web servers of a workspace's cloud computer. Each
preview shows in a frame, with an "Open in new tab" link. The workspace
screen shows the tool in the tools panel of the right column, and on a phone
as the Preview page, as
[the tools part](../shell/workspace/README.md#the-tools-part) says.

## Behaviour

- The tool lists the open previews from the API. It does not discover ports.
- With no preview, the tool asks for a port. Open preview sends the port as
  JSON. A port that is open already shows its preview, with no request.
- "+" shows the same form beside the tabs of the open previews.
- Each preview has a tab. Tabs are links, so each preview has an address in
  the browser history. A plain click goes to the address in the page. Ctrl,
  Shift, and middle clicks keep the browser's own action.
- Reload loads the frame again. Close sends a DELETE with an empty JSON
  object, and the tab goes when the server confirms it.
- A `preview.revoked` event of the same workspace removes its preview. A
  later list does not bring it back, and neither does a new `subscribe`. An
  event of another workspace changes nothing. The preview reducer takes the
  event itself, through the
  [tool store](../terminal/README.md#workspace-events).
- The frame and the link load the launch address of the preview. Each
  load, also a reload, gives that frame or tab its own access to the
  preview. The address holds no secret.
- The frame and the link send no referrer. The frame may not navigate the
  app's page.
- A failed request shows its message and leaves the tool usable.

## Mount the tool

```tsx
<PreviewTool
  route={{ previewId, href: previewHref, navigate: goToPreview }}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

- `route` comes from the app shell, which owns the addresses. `previewId` is
  the preview that the current address names. `href` gives the address of a
  tab, and `navigate` goes there without a page load. When the address names
  no preview, or one that is gone, the first tab shows.
- `workspace` and `touch` are the same as for the
  [terminal](../terminal/README.md#mount-the-tool). `workspace.subscribe` is
  required.

## Key code

- `PreviewTool.tsx`: the tool, its states, and the route seam.
- `PreviewToolbar.tsx`: the link tabs and the actions of a preview.
- `PreviewFrame.tsx`: the frame, its sandbox flags, and the new tab link.
- `PreviewOpenForm.tsx`: the port form.
- `previewsState.ts`: the list, its revoked previews, and the selection. Its
  reducer takes the tool's actions and the revoke events.
- `previewsApi.ts`: list, open, and close requests.

See [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md#port-previews)
and [Terminal and previews](../../docs/protocol/terminal-and-previews.md#port-previews).
