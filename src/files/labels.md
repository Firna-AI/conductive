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
  menu and the status of the tab row, the title of the sheet of a row menu,
  the page headers, and the names that a screen reader reads.
- The real path stays the key of each row and each tab, the address, the
  read of a file or a diff, Copy, Copy path, the mention that Add to chat
  writes, and Download, which saves the file under its real name. A label
  never becomes a path.
- Every label of a page or a tab comes from the Worker. A page takes its
  label from the reply of the current read of its path. Without such a
  reply, the page takes the label of its tab, as `pageLabel` gives it. A
  tab takes the first label that it finds in this order, as `tabLabel`
  gives it:
  - The lists.
  - The last file or diff reply of its path in this page session. The
    store keeps the label of each such reply in `FilesSnapshot.readLabels`.
    A failed read gives no label, such as the read of a file over the read
    limit. So the tab and the page of a file that no list names keep its
    name after its page read it once. An example is an HTML report under
    an ignored `coverage/` folder.
  - When neither gives a label, the tab or the page shows "File", because
    the browser cannot hide a value in a real path.
- When the tree moves a folder, the real path of each entry inside it
  changes at once, and each entry keeps the label that the Worker gave it
  until an update of that entry gives a new one. The browser never joins
  two labels, because two safe parts can form a secret value. A folder that
  the tree lacks takes its name from the label of an entry inside it, or
  shows "Folder".
- One shared check, `hidesSecret` of `model/file-labels.ts`, says whether
  the label of a record hides a secret value: the label is not the real
  path. The list of `@`, the row menu, and the tab menu use it. So a row
  whose label hides a value has no item and opens no row menu, and such a
  tab has no Copy path, as
  [File row menu](../../docs/protocol/file-row-menu.md#paths-that-hide-a-secret-value)
  says. The menus show only labels, and they read the real path only at
  the press.
- The check reads the record, not only a path and a label. A folder that
  the tree lacks counts as hiding when the label of the entry that names
  it hides one, as `hidesSecret` of `TreeRow` in `model/tree-rows.ts`
  says. A tab that shows "File" counts as hiding too, as `tabHidesSecret`
  says. An entry of a moved folder keeps its old label, which is not its
  new path, so it counts as hiding until its update. So a missing or old
  label never lets a secret value through.
