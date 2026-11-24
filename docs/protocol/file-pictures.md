# Pictures in file tabs

This page belongs to [Files and changes](workspace-tools.md#files-and-changes).
It states which files a file tab shows as a picture. It also states the
size, the zoom, and the expanded view of the picture, and the cases with
no picture. Files and changes states the read limit and the header of a
file tab.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue-attachments-and-files.md) draws the
picture at `app/files/image` and its variants.

- A PNG, JPEG, GIF, or WebP file up to the read limit shows as a picture
  (decision 265 B). This holds for each image of the workspace, also one
  that All files or the chip of a sent message opens.
- The tab knows such a file by the extension of its name. Reason: the file
  reads do not give the correct media type for each of these images.
- The picture keeps its proportions, in the middle of the tab. It shows at
  its own size, or smaller, so that it fits the width and the height of the
  tab.
- A zoom bar under the picture holds Zoom out, the zoom as a percentage of
  the own size of the picture, Zoom in, Fit, and Expand. Zoom in and Zoom
  out step through fixed scales. Fit shows the whole picture again. The
  zoom goes from the fit up to eight times the own size of the picture.
- The wheel and a pinch zoom the picture about the pointer. A drag moves a
  zoomed picture, which always covers the tab on each side where it is
  larger. A double press on a fitted picture zooms it to its own size
  about the pointer, or to two times its size when it already fits at its
  own size. A double press on a zoomed picture fits it again.
- From two times its own size, the pixels of the picture show sharp, so the
  detail of a screenshot stays clear.
- On desktop, Expand shows the picture in a large window over the whole
  app, on the dim layer of a dialog, as the window of
  [an expanded Preview tab](port-previews.md). The header of the window
  names the file and holds Close. The picture fits the window as it opens,
  and it zooms as in the tab. Close, Escape, and a press on the dim layer
  close the window. A phone has no Expand, because its file page fills the
  screen already.
- Reason: Cal asked on 22 November 2026 for a zoom with the wheel and with
  a control, and for a way to expand the picture, because the detail of a
  wide screenshot was too small to read. The wheel zooms without a
  modifier key, because the tab has nothing else to scroll. These are
  design calls of 22 November 2026.
- When the browser cannot draw the bytes, the tab shows "Download this file
  to open it", with Download, as for each other binary file.
- An image over the read limit shows "Open this file in the terminal", as
  each other file over the limit does.
- The header keeps Copy and Download. Copy is off for a picture, as for
  each other binary file.
- An SVG file stays text with line numbers. Reason: its source is what a
  member edits.
- Reason: a press on a screenshot then shows its picture in the file tab,
  for each image of the workspace, with no new route. A tab with only
  Download was rejected, because a member then downloads each screenshot
  to see it.
- A read of a larger attached image from the storage of the app, and a
  picture of each attached image in its message, were not chosen. Each
  needs a new read route with its access checks, or many large reads.
