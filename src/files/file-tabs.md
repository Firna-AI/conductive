# File tabs

This guide belongs to [the Files screens](README.md). It gives the tab of a
file or a diff, its names, the temporary tab, and the double-click of the
links and the rows.
[Temporary tabs](../../docs/protocol/temporary-tabs.md) states the
requirements of the temporary tab. The shell keeps the mark of the
temporary tab in the saved view, as
[the Files part](../shell/workspace/screen-parts.md#the-files-part) says.

## The tab

- `FileTabItem` is the closable tab of a file or a diff, as a list item
  for the tab row of the centre column on desktop. `onClose` asks the
  shell to close the tab. It takes the tab styles of the mockups'
  `WorkspaceTabs`, as the session tabs do. `item` takes more props of its
  list item, and `close` props of the wrapper of its Close button, such as
  the handlers, the classes, and the ref of the drag and of the tab menu of
  the row. `link` takes the ref of its link, which the row uses to give
  the tab the focus back after a move from the tab menu. `FilesLink` takes
  that `ref`. They are plain element props, so the Files code imports
  nothing from the chat.
- With `temporary`, the tab is the temporary tab. Its title shows in
  italics, with `.temporary` of the mockups' `WorkspaceTabs`. Nothing else
  on the tab changes. The `aria-label` of its link gives its name, then
  "temporary", as in "README.md, temporary". This holds for a file tab and
  for a diff tab, so a screen reader hears the state. Keep the label:
  Chrome puts a space between the title and a hidden text after it, as in
  "README.md , temporary".
- `LiftedFileTab` is the copy of the tab that a drag lifts above the page:
  its icon and its whole file name, with no link and no Close. With
  `temporary`, it keeps the italics.
- `fileTabName(tab, label)` is the name of the tab, as a screen reader
  reads it: the file name of the label, or "File", with "changes" after
  the name of a diff. The tab row names the tab by it in its tab menu and
  its status. It never adds "temporary", so the tab menu and the move
  messages use the name alone.

## The double-click

- Each link of the screens is a `FilesLink`. A double-click on it
  navigates once: its second click opens nothing again, so the history of
  the browser tab gets one entry. The second press of the mouse selects no
  text.
- A press of Enter counts no click, so each press of Enter navigates.
- `onDoubleClick` of a `FilesLink` runs at a plain double-click, with no
  modifier key. A file row of All files, a row of Changes, and a file tab
  give it `keep` of the navigation. The keep names the tab that the link
  opens. The shell keeps that tab when it is the temporary tab, and moves
  no address.
