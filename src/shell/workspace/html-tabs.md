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
  lives, the previews that ended, and whether an open runs. No list of the
  Preview tool holds it.
- `KeptConnections` connects it for the whole screen, through
  `useFilesPreviewConnection` of `previews/kept-files-preview.ts`, also
  while the sandbox does not run. A `preview.revoked` event of its ID ends
  it, and each connect gets the kept revokes first.
- It also ends at its `expiresAt`, by the clock of the app, and while the
  sandbox is stopped, failed, or archived. A Restart shows Starting and
  stops no cloud computer, so it ends nothing.
- An open that answers with a preview that ended changes nothing.

## The page of the tab

- The file page calls `show` while it shows the Preview of the HTML file.
  The hook then opens the files preview once for each show, when the app
  has none. A show is the first show of the page, a visit that shows the
  tab again, as `useTabVisits` says, and Reload or Try again while the app
  has no files preview. It waits while the sandbox does not run and while
  an open runs.
- When the workspace leaves Starting, such as after a Restart or a resume,
  the hook ends a failure and opens the files preview again, also while
  the app keeps one. The open answers the files preview that lives.
- While the open runs, the page shows the look of the launch page. Then the
  frame loads the launch address at the path of the file, from
  `previewLaunchUrl`, and the launch page shows the same look.
- A failed open shows its message and Try again. The error
  `file_server_unavailable` shows the notice of older software. After a
  failure, the hook asks again only at the next show.
- A files preview that ends while the page shows keeps the page, with no
  Open, until the next show. A stop of the cloud computer keeps it too: the
  file page keeps the page through `keepShown`, as it keeps a file.
- Reload loads the frame again while a files preview lives. Otherwise it
  is a show. The frame also loads again when `versionOf` of its file grows.
- Open is `OpenInNewTab` of the previews, at the path of the file, while a
  files preview lives.

## Kept frames

- On desktop, the chat keeps the frame of each HTML tab under the tab that
  shows, as it keeps the pages of the Preview tabs: `KeptPageFrames` of
  `previews/page-frames.tsx`, in the `kept` slot of the chat. `ChatArea`
  gives the file pages its `PageFrames` through `PageFramesContext`.
- A frame mounts at the first show of its page. It stays loaded and hidden
  while another tab, Source, or another state shows. It goes when its tab
  closes or its files preview ends. The frame that shows stays after the
  end of its files preview, because its tab keeps the page.
- The file page then keeps only its header, and the frame takes the room
  under it. A frame keeps its place in the order, because a frame that
  moves loads again.
- On a phone, the file page shows its own frame, and nothing is kept.

`previews/HtmlTabs.test.tsx` and `previews/HtmlTabKeep.test.tsx` mount the
whole app over the fake API and check these rules.
