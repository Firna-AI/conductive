# Labels of paths

This guide belongs to [the Files screens](README.md). It gives the label
that each screen shows in place of a real path.

A path can hold the secret value of an org env var. The Worker then sends
a label beside the real path: `name` and `displayPath` of an entry,
`displayPath` and `previousDisplayPath` of a changed file, and
`displayPath` of a file or diff reply. A label hides each secret value. The
Worker leaves `displayPath` out when it equals the real path, so a record
without one shows its real path.
[Access and security](../../docs/protocol/access-and-security.md) states
the rule.

- The screens show only labels: the rows of All files and Changes, a
  rename, the tab titles and their tooltips, the names of a tab in the tab
  menu and the status of the tab row, the page headers, and the names that
  a screen reader reads.
- The real path stays the key of each row and each tab, the address, the
  read of a file or a diff, Copy, and Download, which saves the file under
  its real name. A label never becomes a path.
- A page takes its label from its reply, or else from the lists. A tab
  takes it from the lists. A tab or a page whose file no record names
  shows "File", because the browser cannot hide a value in a real path.
- When the tree moves a folder, the real path of each entry inside it
  changes at once, and each entry keeps the label that the Worker gave it
  until an update of that entry gives a new one. The browser never joins
  two labels, because two safe parts can form a secret value. A folder that
  the tree lacks takes its name from the label of an entry inside it, or
  shows "Folder".
