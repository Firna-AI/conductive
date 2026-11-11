# Port previews

The Preview tool shows the web servers of a workspace's cloud computer. Each
preview shows in a frame, with an "Open" link to a new tab. The workspace
screen shows the tool in the tools panel of the right column, and on a phone
as the Preview page, as
[the tools part](../shell/workspace/README.md#the-tools-part) says.

## Behaviour

- The tool lists the open previews from the API. It keeps the latest
  `ports.updated` report of the workspace events, with the servers that
  listen in the cloud computer. A null report means no report.
- With no preview, the tool shows the port form. "+" shows the same form
  beside the tabs of the open previews.
- The form lists each reported server that has no tab, as a button with its
  port, its name, and its folder. A click sends the same open request as a
  typed port. The buttons wait while an open runs. The field stays below
  them as the smaller Other port row. Each state of the form keeps the same
  field, so a new report keeps a typed port, its focus, and its selection.
- An empty report asks the user to start a server. Without a report, and
  when each reported server has a tab, the form shows the field alone.
- Open preview sends the port as JSON. A port that is open already shows its
  preview, with no request.
- A tab shows the port and the name of its server, cut to 10 characters,
  from the latest report. Its tooltip and its accessible name give the whole
  name and the folder. A port that the report does not name shows `Port`
  and the port. A tab row that does not fit scrolls, keeps the shown tab in
  view, and fades each end that clips tabs, with the row scroll of the
  session tabs.
- After a failed repair of the list, a notice under the form gives the age
  of the failure, and the last list stays. A newer report, also a null one,
  ends it. The notice never shows over a preview in its frame.
- The words, the tab label, and the row styles are those of the mockups:
  `previewCopy.ts` and `PortForm.module.css` in
  `docs/mockups/src/components/tools/`, and `LostUpdateRow` for the notice.
- Each preview has a tab. Tabs are links, so each preview has an address in
  the browser history. A plain click goes to the address in the page. Ctrl,
  Shift, and middle clicks keep the browser's own action.
- Reload loads the frame again. Close sends a DELETE with an empty JSON
  object, and the tab goes when the server confirms it.
- A `preview.revoked` event of the same workspace removes its preview. A
  later list does not bring it back, and neither does a new `subscribe`. An
  event of another workspace changes nothing. The preview reducer takes the
  event itself, through the
  [tool store](../terminal/README.md#workspace-events). The marker of a
  failed repair of the list reaches it as an action with its time.
- The frame and the link load the launch address of the preview. Each
  load, also a reload, gives that frame or tab its own access to the
  preview. The address holds no secret.
- The frame and the link send no referrer. The frame may not navigate the
  app's page.
- Behind a page without its own background, the frame shows what a
  browser tab shows. A page with no colour scheme shows white. A dark
  page, such as the browser's JSON view in dark mode, shows dark.
- A failed request shows its message and leaves the tool usable.

## Mount the tool

```tsx
<PreviewTool
  now={now}
  route={{ previewId, href: previewHref, navigate: goToPreview }}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>
```

- `now` gives the time for the age of the notice of a failed repair. Keep
  it stable. The shell gives the clock of the app, and the default is the
  clock of the browser.

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
- `PreviewOpenForm.tsx`: the port form, its list states, and its field.
- `ServerRows.tsx`: the buttons of the detected servers.
- `PortsNotice.tsx`: the notice of a failed repair of the list.
- `previewsState.ts`: the list, its revoked previews, the selection, the
  latest port report, and the time of a failed repair. `portFormList`
  gives what the form lists. The reducer takes the tool's actions and the
  events.
- `previewsStore.ts`: the tool store, and the action of a failed repair.
- `previewsApi.ts`: list, open, and close requests.

See [Port previews](../../docs/protocol/workspace-tools.md#port-previews),
[Listening ports](../../docs/protocol/agent-runner.md#listening-ports),
and [Access and security](../../docs/protocol/terminal-previews-and-desktop.md#port-previews).
