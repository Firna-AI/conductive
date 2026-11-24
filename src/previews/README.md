# Port previews

The Preview tool shows the web servers of a workspace's cloud computer. On
a phone, `PreviewTool` is the Preview page: each preview shows in a frame,
with an "Open" link to a new tab. On desktop, `PreviewPanel` is the Preview
tool of the tools panel: the list of ports, with no bar and no frame. The
page of each port then shows in its Preview tab of the centre row, which
the workspace screen draws, as
[Preview tabs](../shell/workspace/tools-part.md#preview-tabs) says.

## The desktop tool

- `PreviewPanel` shows the port form at all times, with no "+" (decision
  290). It lists each server of the report, then each port with a Preview
  tab or an open preview that the report does not name, as `Port 8080`.
  `panelPortList` gives that list. The [services](#services) stand above
  it, and the list leaves out each port that a shown service row lists.
- A click on a port, or a typed port, calls `onShow`. The shell then shows
  the Preview tab of the port, or opens one. The row of `current`, the port
  of the shown tab, is the current one, with `aria-current`.
- Nothing in the tool ends a preview (decision 292).
- `previewOfPort` gives the preview that a tab of a port shows: the oldest
  open preview of the port.

## The phone page

- The tool lists the open previews from the API. It takes the latest
  port report and its failed repair from the workspace seed. Later
  `ports.updated` events give the servers that listen in the cloud computer.
  A null list clears the report.
- A new list read starts after the workspace seed applies. If a read
  already started, the store discards its result and reads again. The API
  leaves revoked and expired previews out of this list. The store keeps
  revokes that arrive after the cutoff, including on a kept return.
- With no preview, the tool shows the port form. "+" shows the same form
  beside the tabs of the open previews.
- The form lists each reported server that has no tab, as a button with its
  port, its name, and its folder. A click sends the same open request as a
  typed port. The buttons wait while an open runs. The field stays below
  them as the smaller Other port row. Each state of the form keeps the same
  field, so a new report keeps a typed port, its focus, and its selection.
- The [services](#services) stand above the servers of the form, also
  each service whose port has an open preview. The servers leave out each
  port that a shown service row lists.
- An empty report asks the user to start a server. Without a report, and
  when each reported server has a tab, the form shows the field alone.
- Open preview sends the port as JSON. A port that is open already shows its
  preview, with no request.
- An address of the tool can name a port, such as the link of a local
  address in chat text. The tool waits for the list and for an open that
  runs. A port that is open already then shows its preview, with no
  request. Otherwise the tool sends the open request of a typed port, and
  the form shows while it runs. Each address of a port sends at most one
  request.
- Then the address of the preview takes the place of the address of the
  port, with no new history entry, so Back does not open the port again. A
  failed open shows its message in the form, and the address of the tool
  takes the place of the address of the port. A move to another address
  before the answer keeps that address.
- A tab shows the port and the name of its server, cut to 10 characters,
  from the latest report. Its tooltip and its accessible name give the whole
  name and the folder. A port that the report does not name shows `Port`
  and the port. A tab row that does not fit scrolls, keeps the shown tab in
  view, and fades each end that clips tabs, with the row scroll of the
  session tabs.
- After a failed repair of the list, a notice under the form gives the age
  of the failure, and the last list stays. A newer report, also a null one,
  ends it. The notice never shows over a preview in its frame.
- The words, the tab label, and the row styles are shared with the mockups:
  `previewCopy.ts`, `PreviewTabs.module.css`, and `PortForm.module.css` in
  `src/ui/components/tools/`, and `LostUpdateRow` for the notice.
- Each preview has a tab. Tabs are links, so each preview has an address in
  the browser history. A plain click goes to the address in the page. Ctrl,
  Shift, and middle clicks keep the browser's own action.
- Each tab holds its Close button, after its label, with the rule of the
  session tabs: the button shows on the shown tab, on hover, and while the
  focus is in the tab. A hidden button keeps its place, so a tab keeps its
  size on hover. On a phone, a hidden button takes no place. The button's
  name is "Close" and the label of its tab, such as `Close 5173 vite`.
- Reload loads the frame again. Close sends a DELETE with an empty JSON
  object, and the tab goes when the server confirms it. The button waits
  while its request runs. A failed close shows its message under the tabs,
  with the port of the preview, also when that tab is not the shown tab.
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

## Services

[Services in the app](../../docs/protocol/services-in-the-app.md) states
the services of the Preview tool: the list above the servers, Stop,
Restart, their results, and the log view. The shell gives the tool its
`services`, a `PreviewServices` of `services/servicesPart.ts`: the store
of the workspace, and the Services part for a state of that store. The
shell draws the part in `src/shell/workspace/previews/services/`, as
[the tools part](../shell/workspace/tools-part.md) says.

- `ServicesStore` of `services/servicesStore.ts` holds the services of one
  workspace. Its `connect` is one running period of the cloud computer: it
  reads the list at once and at each report of the ports. Its end forgets
  the list, so a later period never shows the list of an earlier one.
  `watch` reads the list again after `activeWait` and at each return to the
  page while a part shows it. A hidden page reads at its return. No read
  adds activity.
- `services/servicesApi.ts` reads the list with no answer from the cache,
  sends Stop and Restart, and reads a log. A `not_found` refusal of the
  list reads as software without services, because an older Worker
  answers its unknown route so. Each other refusal stays an error.
- `services/servicesState.ts` keeps the latest answer of the period, the
  error of a read that failed before the first answer, and the controls
  that run, by the run that each names. A later read that fails keeps the
  list, with no notice. `servicesView` gives what the part shows, and
  `ownedPorts` the ports that the shown rows list.
- `control` of the store sends one Stop or Restart of the observed boot,
  service, and generation, with a new request ID. It takes no signal, so
  it reaches the server also after its view closed. Its row shows
  Stopping… or Restarting… until the answer, and a newer run of the
  service takes no control of an older one. The answer reads the list
  again. Nothing sends a control again by itself. `services/serviceAnswer.ts`
  maps the answer: a refusal of the API fails with its message, and a lost,
  unreadable, or mismatched reply is unconfirmed.
- The form takes the part in a fixed slot above the servers, so a part
  that shows or goes keeps the port field, its text, its focus, and its
  selection.
- The part takes the words, the rows, and the log view that it shares
  with the mockups: `serviceCopy.ts`, `ServiceState.tsx`,
  `ServiceList.module.css`, and `ServiceLog.module.css` in
  `src/ui/components/tools/`. It never imports the mockups'
  `ServiceList.tsx`, which draws registered Mokly parts. Each name,
  label, title, and log line shows as plain text.
- The close of a preview stops no service, and no control of a service
  ends a preview.

## The files preview

The files preview shows the files of the workspace's repository folder,
from the file server of the agent runner, as
[HTML file preview](../../docs/protocol/html-file-preview.md) says. The tab
of an HTML file shows it, as
[The tabs of HTML files](../shell/workspace/html-tabs.md) says. It is no
port preview: no list and no tab of the Preview tool holds it.

- `openFilesPreview` of `previewsApi.ts` sends `POST` to the route of the
  files preview with an empty JSON object. The reply gives the files
  preview of the workspace, with port 0, or the active one. A runner that
  announced no file server gets the error `file_server_unavailable`.
- `filesPreview.ts` holds the store of the files preview of one workspace:
  the files preview that lives, the previews that ended, whether an open
  runs, whether it is in a running period, and the count of its periods. A
  `preview.revoked` event of its ID ends it, and so does the action
  `ended`, which the shell sends at its expiry and when the cloud computer
  stops. An open that answers with a preview that ended changes nothing.
- A running period lasts while the workspace is ready and the open of the
  visit of the screen has ended, as `WorkspaceModel.opened` says. Before
  that open ends, the screen can show a saved state. The shell sends the
  action `running` at each start and each end of a running period. The
  action ends the open that runs, but keeps the files preview, so a
  Restart keeps the page that a tab shows.
- The action `disconnected`, at the end of the connection of the screen,
  forgets the files preview and the open that runs. The count of the
  periods grows at each start and each end of a running period, and at
  each end of the connection. An open answers with the count of the period
  in which it started, and an answer of an earlier period changes nothing.
  A failed open forgets the files preview too, but ends no ID, so the next
  open can answer it again.
- `PreviewFrame` takes an optional `file`: the real path, which the launch
  address names through `previewLaunchUrl`, and the file name of its
  label, which names the frame, such as "Preview of report.html".
  `OpenInNewTab` takes the same `path`. Without them, both open the root of
  the preview, as for a port.

## Mount the tool

```tsx
<PreviewTool
  now={now}
  route={{
    previewId,
    port,
    href: previewHref,
    navigate: goToPreview,
    replace: replaceAddress,
  }}
  services={previewServices}
  store={keptPreviews}
  touch={phone}
  workspace={{ orgId, workspaceId, fetch, subscribe }}
/>

<PreviewPanel
  current={shownPort}
  dispatch={keptPreviews.dispatch}
  now={now}
  onShow={showPort}
  services={previewServices}
  state={snapshot}
  tabPorts={tabPorts}
/>
```

- `now` gives the time for the age of the notice of a failed repair. Keep
  it stable. The shell gives the clock of the app, and the default is the
  clock of the browser.
- `route` comes from the app shell, which owns the addresses. `previewId` is
  the preview that the current address names, and `port` is the port that
  it names. `href` gives the address of a tab, and `navigate` goes there
  without a page load. `replace` puts the address of a preview, or of the
  tool for null, in place of the current address, with no new history
  entry. When the address names no preview, or one that is gone, the first
  tab shows.
- `store` is optional. The shell gives the previews store that it keeps
  and connects for the workspace, which the Preview tabs read too. The tool
  then connects nothing. Without it, the tool makes and connects its own.
- `workspace` and `touch` are the same as for the
  [terminal](../terminal/README.md#mount-the-tool). `workspace.subscribe` is
  required.
- `PreviewPanel` reads the snapshot of that store. `tabPorts` are the ports
  of the Preview tabs of the saved view, and `onShow` shows the tab of a
  port.
- `services` is optional on both. The shell gives the `PreviewServices`
  of `usePreviewServices`. Without it, the tool shows no services, as for
  older software.

## Key code

- `PreviewTool.tsx`: the phone page, its states, and the route seam.
- `PreviewPanel.tsx`: the desktop tool, the list of ports.
- `previewActions.ts`: the preview in the frame, the open, the close, and
  the tabs, and the open of the port of the address with its move of the
  address.
- `addressPort.ts`: `useAddressPort`, which opens the port of each address
  once.
- `PreviewToolbar.tsx`: the link tabs and the actions of a preview.
- `PreviewFrame.tsx`: the frame, its sandbox flags, and the new tab link,
  at the path of a file for the files preview.
- `filesPreview.ts`: the store of the files preview of one workspace.
- `PreviewOpenForm.tsx`: the port form, its list states, and its field.
- `ServerRows.tsx`: the buttons of the detected servers.
- `PortsNotice.tsx`: the notice of a failed repair of the list.
- `previewsState.ts`: the list, its revoked previews, the selection, the
  latest port report, and the time of a failed repair. `portFormList`
  gives what the form of a phone lists, and `panelPortList` what the
  desktop tool lists. `previewOfPort` gives the oldest preview of a port. The reducer takes the tool's actions and the
  events.
- `previewsStore.ts`: the tool store, and the action of a failed repair.
- `previewsApi.ts`: list, open, and close requests, and the open of the
  files preview.
- `services/servicesStore.ts`: `ServicesStore`, the services of one
  workspace in one running period, its reads, `watch`, `control`, and
  `readLog`. `services/servicesState.ts`: its state, `servicesView`, and
  `ownedPorts`.
- `services/servicesApi.ts`: the list, control, and log requests.
  `services/serviceReplies.ts` reads their replies into the generated
  types, and `services/serviceAnswer.ts` maps the answer of a control.
- `services/servicesPart.ts`: `PreviewServices`, which the shell gives,
  and `useServicesState`.

See [Port previews](../../docs/protocol/port-previews.md),
[Services in the app](../../docs/protocol/services-in-the-app.md),
[Listening ports](../../docs/protocol/agent-runner.md#listening-ports),
and [Access and security](../../docs/protocol/terminal-previews-and-desktop.md#port-previews).
