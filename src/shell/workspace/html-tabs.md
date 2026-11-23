# The tabs of HTML files

This guide belongs to [the workspace screen](README.md). It gives how the
shell shows the page of an HTML file in its file tab, from the files
preview of the workspace, as
[HTML file preview](../../../docs/protocol/html-file-preview.md) says. The
mockups draw the tab at `app/files/html`.

The [Files screens](../../files/README.md) draw the tab and each of its
views. The shell gives `FilePage` its `htmlPreview` prop through
`useHtmlPreview` of `previews/use-html-preview.tsx`. So the Files code
sends no preview request and imports nothing from the Preview tool.

## The files preview

- The tab keeps one files preview store for each shown workspace, beside
  the previews store. `createFilesPreviewStore` of
  [the previews](../../previews/README.md) makes it, and
  `ShownWorkspaces.filesPreview` keeps it. It holds the files preview that
  lives, the previews that ended, whether an open runs, and its running
  period. No list of the Preview tool holds it.
- `KeptConnections` connects it for the whole screen, through
  `useFilesPreviewConnection` of `previews/kept-files-preview.ts`, also
  while the sandbox does not run. A `preview.revoked` event of its ID ends
  it, and each connect gets the kept revokes first.
- It also ends at its `expiresAt`, by the clock of the app, and while the
  sandbox is stopped, failed, or archived. A Restart shows Starting and
  stops no cloud computer, so it ends nothing.
- An open that answers with a preview that ended changes nothing.
- The end of the connection of the screen forgets the files preview and
  the open that runs, as `connectPreviews` marks the list of the port
  previews for a new read. The files preview can expire, or end by a
  revoke or a stop, while no screen watches it. So the first show after a
  return opens it again, and the route answers the one that lives, or a
  new one.
- A failed open forgets the files preview too, but ends no ID. So Try
  again, a return, and the tab of another HTML file open it again.
- The workspace screen gives `KeptConnections` the value of
  `WorkspaceModel.opened`: whether the open of the visit ended. A running
  period of the store lasts while that open has ended and the workspace is
  ready. Until then, the screen can show the state that the tab saved,
  such as Ready after the cloud computer stopped while the member was
  away. So that saved state starts no running period. A running period
  ends when the workspace leaves Ready, and when the visit ends.
- Each start and each end of a running period begins a new period of the
  store, and so does each end of the connection. A new period ends the
  open that runs. A start or an end of a running period keeps the files
  preview, so a Restart keeps the page that a tab shows. An open belongs
  to the period in which it started. Its answer in a later period changes
  nothing, also no failure and no page of the tab.

## The page of the tab

- The file page calls `show` while it shows the Preview of the HTML file.
  The hook then opens the files preview once for each show, when the app
  has none. A show is the first show of the page, a visit that shows the
  tab again, as `useTabVisits` says, and Reload or Try again while the app
  has no files preview. It waits while the cloud computer does not run and
  while an open runs. One hook serves each file tab of the centre, so a
  new tab ends the show, the failure, and the page of the last one.
- For the hook, the cloud computer runs only while the screen shows Ready
  and the files preview store is in a running period. So a return that
  first shows the saved Ready state sends no open. Meanwhile the page
  shows the look of the launch page. When the visit confirms Ready, the
  hook opens the files preview. When the visit reads another state, the
  tab shows the state of the cloud computer, such as Starting.
- A running period starts, for example, when the workspace leaves Starting
  after a Restart or a resume. It also starts when the open of a visit
  confirms Ready. At each start, the hook ends a failure. Then the next
  show that it serves opens the files preview again, also while the app
  keeps one: the show that runs, or the first show after it. The open
  answers the files preview that lives.
- While the cloud computer does not run, the hook builds no page from the
  files preview, also while a Restart keeps it. A tab keeps only the page
  that it shows when Starting begins, and only while that show runs. Each
  other tab, also a tab that changes from Source to Preview, and a tab
  whose show ends, shows the state of the cloud computer until the
  workspace is ready. The hidden frames of the other tabs stay loaded.
- While the open runs, the page shows the look of the launch page. Then the
  frame loads the launch address at the path of the file, from
  `previewLaunchUrl`, and the launch page shows the same look.
- A failed open shows its message and Try again. The error
  `file_server_unavailable` shows the notice of older software. After a
  failure, the hook asks again only at the next show.
- A files preview that ends while the page shows keeps the page, with no
  Open, until the next show. A stop of the cloud computer keeps it too: the
  file page keeps the page through `keepShown`, as it keeps a file.
- Reload loads the frame again while a files preview lives and the cloud
  computer runs. Otherwise it is a show. The frame also loads again when
  `versionOf` of its file grows.
- Open is `OpenInNewTab` of the previews, at the path of the file, while a
  files preview lives and the cloud computer runs.
- Expand shows on desktop while the page shows and a files preview lives.
  It asks the `PageFrames` to expand the path. `KeptPageFrames` then shows
  the kept frame in the large window of `ExpandableFrames`, with no new
  load. The window closes at Close, at Escape, at a press on the dim
  layer, at another tab, and when the files preview ends.

## Kept frames

- On desktop, the chat keeps the frame of each HTML tab under the tab that
  shows, as it keeps the pages of the Preview tabs: `KeptPageFrames` of
  `previews/page-frames.tsx`, in the `kept` slot of the chat. `ChatArea`
  gives the tabs its `PageFrames` through `PageFramesContext`.
- Only the file page puts a page there. The hook gives it a
  `KeptPageFrame` as the frame of the page view, and the file page renders
  it only while it shows that view. The element puts the page into the
  `PageFrames` when it mounts, and hides it when it unmounts. So no tab in
  Source, and no file whose label hides a secret value or is not known
  yet, can start a frame and run the scripts of its page.
- A frame mounts at the first show of its page. It stays loaded and hidden
  while another tab, Source, or another state shows. It goes when its tab
  closes or its files preview ends. The frame that shows stays after the
  end of its files preview, because its tab keeps the page.
- The file page then keeps only its header, and the frame takes the room
  under it. A frame keeps its place in the order, because a frame that
  moves loads again.
- On a phone, the file page shows its own frame, and nothing is kept.

`previews/HtmlTabs.test.tsx`, `previews/HtmlTabKeep.test.tsx`,
`previews/HtmlTabFrames.test.tsx`, `previews/HtmlTabReturn.test.tsx`, and
`previews/HtmlTabStarting.test.tsx` mount the whole app over the fake API
and check these rules.
