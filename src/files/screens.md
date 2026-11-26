# The screens of Files

This guide belongs to [the Files screens](README.md). It gives each
screen, its props, and the services that the shell passes to it.

## The screens

- `FilesPanel` shows the All files, Changes, and Checks tabs and lists,
  for the right column on desktop and the Files tab on a phone. The
  `checks` prop takes the Checks list of the GitHub banner screens. The
  `placeholder` prop replaces All files and Changes, for example with a
  sandbox state. The `waiting` prop replaces only a list without a saved
  copy, when its read fails with `file_unavailable`, or an unknown tree
  under the unavailable mark. A read that runs still shows its load, and
  any other failed read shows Try again. The workspace screen gives it the
  wait of a sandbox that starts, so a resume shows the saved lists and the
  first start of a new workspace shows the wait. While a report leaves out
  entries, the shared `ListNotice` gives their count from the report: at
  the top of All files, and under the summary of Changes. The summary and
  the tab of Changes count the whole change, with the omitted totals.
  A list that leaves out entries never shows the state of an empty list.
  Under the lists, the
  panel shows one notice for each failed repair, in the order of the tabs, with its age. A saved tree that
  the cloud computer could not read shows the notice of All files, with no
  age. The notices show under each of the three tabs, and they have no
  Dismiss. The `now` prop
  gives the clock of the ages. Pass a stable function. The default is
  `Date.now`. The `listKeys` prop gives the key of the command that opens
  each list, as a tooltip and a name for `aria-keyshortcuts` of its tab.
- The `rowMenu` prop of `FilesPanel` gives the items of the row menu of
  each row of All files and Changes, in groups that a line parts, from the
  real path, the kind, and the change of the row. The shell gives Add to
  chat and Copy path, so the Files code holds no item and imports nothing
  from the chat. Without the prop, no row has a menu. `useRowMenu` of the
  lists opens the menu as
  [File row menu](../../docs/protocol/file-row-menu.md) says, through
  `PointMenu`, `Sheet`, `MenuList`, and `opensMenu` of the app shell and
  `useLongPress` of the web app: a right click at the pointer, Shift and
  F10 or the Menu key below the focused row, and a long press of a finger
  in a sheet on a phone, else at the press. The row of the open menu keeps
  the fill of a hover, and the focus goes back to it as the menu closes. A
  press on an item gives the focus back to the row before the item runs,
  so an item that moves the focus, such as Add to chat, finds it on the
  row. A row whose label hides a secret value gets no item, so it opens no
  menu, as [Labels of paths](labels.md) says. The menu shows only labels:
  the name of the row titles it, and an item reads the real path only at
  its press.
- `FilePage` shows one file tab. Markdown starts rendered, and its view
  switch navigates to the same tab with the other mode. The page knows an
  image file by the name of its real path, as
  [Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
  says. While the browser reads the size of a picture, the page shows that
  the file opens. A changed picture stays on screen until the browser draws
  or refuses the new one. Bytes that the browser cannot draw offer
  Download, as a binary file does. An image file with no bytes shows that
  it is empty.
- `ZoomablePicture` shows a drawn picture over its zoom bar.
  `usePictureZoom` reads the wheel, a pinch, a drag, and a double press on
  the stage, and the pure functions of `picture-zoom.ts` place the
  picture. A stage without a size places nothing. `PictureInTab` adds
  Expand on desktop, which opens `ExpandedPicture`, a modal window in the
  overlay layer of the shell. The window has its own zoom, so the tab
  keeps its zoom.
- `FilePage` shows the tab of an HTML file, a name that ends with `.html`
  or `.htm` in any case, as [The page of an HTML file](html-page.md) says.
- `DiffPage` shows the diff of one changed file. While Changes lists the
  path, its row gives the changed lines of the header and tells a deleted
  file. A path that Changes leaves out takes both from its own diff: the
  lines from the rows of a text diff, and a deletion from a patch whose
  section headers hold a `deleted file mode` line and no `new file mode`
  line, as a change of type gives both. Each section of the patch starts at
  its `diff --git` line, and only the whole header lines of a section, before
  its first hunk, count, so no text of the file reads as a header.
- `SkillPage` shows one skill tab, with the parts of a file page, as
  [Skill tabs](../../docs/protocol/skill-tabs.md#the-view) says. The shell
  gives it the read of the text, the description from the skills list,
  the view, and the `placeholder` of a sandbox that does not run, as
  [the skill tabs](../shell/workspace/skill-tabs.md) say. Preview shows the
  Markdown body after the front matter, which `skillBody` of
  `skill-body.ts` cuts as the runner reads it. Source shows the whole
  text with its line count. The read that runs, a skill that its list no
  longer holds, a text over the limit, older software of the cloud
  computer, and a failed read with Try again each show a notice under the
  header, with the words of the shared `skillTabCopy.ts`.
- The `placeholder` prop of `FilePage` and `DiffPage` replaces the content
  of the page, for example with a sandbox state. The page then reads
  nothing, and its header offers no Download. A diff keeps its changed
  lines from Changes while Changes lists its path. With `keepShown`, a page
  that already shows its file keeps it, with Copy, and so does the page of
  an HTML file that shows in its frame. The placeholder shows only in place
  of a page with nothing to show. When the placeholder goes, the page reads
  at once.
- `FileTabItem` is the closable tab of a file or a diff, and
  `LiftedFileTab` is the copy that a drag lifts.
  [File tabs](file-tabs.md) gives their props, their names, the temporary
  tab, and the double-click of the links and the rows.

[The Markdown preview](markdown-preview.md#the-worker) gives the worker
that parses the Markdown of a preview, and what the preview shows while
it waits for the worker or when the worker fails.

[The page of an HTML file](html-page.md) gives the tab of an HTML file:
its views, the `htmlPreview` prop that the shell gives, and its read.

Each screen takes `layout`: `desktop`, or `phone` with touch targets of at
least 40 px. On a phone, a file page and a diff page link back to All
files or Changes.

Copy and Download take `targets`. Copy is off for a picture and for each
other file that is not text. The default, `browserTargets`, copies
the original text with the clipboard of the browser, with each byte order
mark of the file. The view and the line count leave out one leading mark.
Its Download reads the download route of the client, `downloadHref(path)`,
with the fetch of the browser and the session cookie. It saves the file
from memory only when the route sends it. When the route refuses the file,
the header shows that the download didn't start. The development page and
the tests inject `fetchedDownload` with the fetch of the fake API, because
the fake API serves no route that the browser can read. Pass the same
`targets` object on each render, because a new object starts new Copy and
Download states. The shell passes targets over the services of the app:
Copy uses their `copy`, and Download reads the route with the `fetch` of
the app's `ApiClient`, so the Mac app reads the file from its own Worker.

The shell supplies the design tokens as `--ui-*` CSS variables and the
`@firna/ui` theme provider, as `src/ui/theme.ts` builds them.

The links of the Markdown preview open through the link opener of the app
shell, `useTextLinks` of `../shell/ui/text-links.tsx`, which the chat uses
too. The preview asks it to open a local address as a web link. The
workspace screen gives the opener the pages of the app, on desktop and on
a phone, as
[The chat of the workspace](../shell/workspace/screen-parts.md#the-chat-of-the-workspace)
says. Outside that screen, as on the development page, each link opens a
new tab.
