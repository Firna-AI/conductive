# File row menu

This doc holds the requirements and the decisions in force for the row
menu. It covers the items of the menu, how the menu opens and closes, the
Copy path item of a row and of a tab, and the paths whose label hides a
secret value. It belongs to
[Files and changes](workspace-tools.md#files-and-changes).
[Add to chat](file-mentions.md#add-to-chat) states where Add to chat puts
its chip, and [The tab row](agents-and-sessions.md#the-tab-row) states the
items of the tab menu. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A file row menu decision number, such as file row menu decision 1,
names the dated record of one decision of the change that adds the row
menu. The [mockup catalogue](../mockups/catalogue-attachments-and-files.md)
draws the row menu at `app/files/menu`, on desktop and on a phone.

## Terms

- **Row menu:** the menu of one row of All files or Changes. The row names
  a file or a folder.
- **Label:** the text that a screen shows for a path. It hides each exact
  copy of a secret value, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- **Real path:** the path of a file or a folder from the root of the
  repository, such as `src/app.ts`. The browser gets it beside the label.
- **Read-only workspace:** an archived workspace, or a workspace of a
  suspended org.

## The menu

- The row menu opens on each row of All files and Changes, for a file and
  for a folder. This holds on desktop and on a phone.
- The row menu holds two groups, with a line between them: Add to chat,
  then Copy path (file row menu decision 1).
- Reason: the user chose these two items. Open changes, Open file, Reveal
  in All files, and items that change files, such as Rename and Delete,
  were not chosen.
- Add to chat comes first. Reason: an action comes before a copy item, as
  Rename session comes before Copy link in the tab menu, which groups its
  items by kind (decision 188).
- No row has a button for the menu.
- Opening the menu opens no file and no diff, and the shown tab stays.
- A read-only workspace shows no rows, so no row menu opens there. An
  archived workspace has no file lists, as
  [Archive](workspace-life.md#archive) says. In a workspace of a suspended
  org, the refusal of its start takes the place of All files and Changes.

## Opening and closing

- A right click on a row opens its row menu at the pointer.
- On a focused row, Shift and F10, or the Menu key, opens the row menu
  below the row. This holds on every system.
- On a phone, a long press that ends without a move opens the row menu as
  a sheet. The title of the sheet is the name that the row shows.
- Reason: the tab menu opens in the same ways, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- Only a finger opens the menu with a long press, so a mouse can still
  select the text of a row.
- The menu of the browser does not open on a row that has a row menu.
- A click with a modifier key, or a middle click, opens the file or the
  diff of a row in a new tab of the browser.
- A row with no item opens no row menu, and the browser shows its own menu
  there. [Paths that hide a secret value](#paths-that-hide-a-secret-value)
  says which rows have no item.
- Escape, Tab, or a press outside the menu closes it. The focus then goes
  back to the row, unless the press outside moved it.
- While its menu is open, the row shows the fill of a hover, as a tab with
  an open tab menu does. On a phone, the row shows the fill under the
  sheet.

## Copy path

- The Copy path item copies the real path of its row, such as `src/app.ts`
  for a file or `src/lib` for a folder. The copy has no `./` at its start,
  no `/` at its end, and no quotes.
- Reason: the lists hold the paths from the root of the repository. The
  terminal and both agents start in the repository folder (decision 94),
  so the copied path works there as it is.
- On a row of Changes for a moved file, the copy holds the new path. On a
  row for a deleted file, it holds the path that the file had.
- The tab menu of a file or diff tab also holds the Copy path item, as
  [The tab row](agents-and-sessions.md#the-tab-row) says. It copies the
  path of the file of its tab, as the Copy path item of the row of that
  file does.
  [Paths that hide a secret value](#paths-that-hide-a-secret-value) gives
  the tabs that leave it out.
- The menu closes at the press. After the copy, a toast says "Path
  copied". When the copy fails, the toast says "The path didn't copy. Try
  again."
- Reason: the menu is closed, so a toast gives the result. The words follow
  those of [Copy link](workspace-menu.md#copy-link) in the workspace menu.
- The Copy path item works also in the Mac app.
- The Copy path item sends no request, opens no file, and starts no cloud
  computer. So it works also while the cloud computer is stopped, from the
  lists that the workspace keeps.

## Paths that hide a secret value

- A row whose label hides a secret value has no Copy path and no Add to
  chat (file row menu decision 2 A). So it opens no row menu, and the
  browser shows its own menu.
- Reason: the clipboard or the message would then hold the secret value.
  The list of `@` leaves out such an entry for the same reason, as
  [The list](file-mentions.md#the-list) says.
- Items that show as off with a reason, a copy of the real path anyway,
  and a copy with the name of the env var in place of each hidden value
  were not chosen. A copy of the label was rejected, because the copied
  text names no real file.
- All files can draw a folder that the tree lacks from the path of an entry
  inside it. Such a folder has no label of its own. It counts as hiding a
  secret value when the label of that entry hides one.
- A file or diff tab whose label hides a secret value has no Copy path in
  its tab menu. A tab that shows "File" in place of its name, because the
  browser does not know its label yet, counts as hiding a secret value
  too.
- Reason: a missing label must not let a secret value through.

## Add to chat

- Add to chat puts the chip of the file or the folder of its row into a
  message field, as [Add to chat](file-mentions.md#add-to-chat) says.
- Add to chat shows only on a row whose entry the list of `@` offers, as
  [The list](file-mentions.md#the-list) says. Reason: the message field
  turns each other mention into text.
- So a row of Changes for a deleted file has no Add to chat. Its chip would
  name a file that the branch does not hold.
- A row of Changes for a file that the tree report omits has no Add to
  chat either, because the list of `@` does not offer that file, as
  [The list](file-mentions.md#the-list) says (Cal, 23 November 2026).
- While a bar of the cloud computer takes the place of the message field,
  such as the stopped bar with Resume, no row has Add to chat. Reason: no
  field can take the chip, and Add to chat writes into the field, not into
  the draft (file row menu decision 4 A).
- Until the chat of the workspace loads, and after its load fails, no row
  has Add to chat. Copy path stays. Reason: the app does not yet know the
  session tabs, so it cannot choose the session that gets the chip. The
  user chose this rule on 16 November 2026.
- A press that acts at once while the chat loads was rejected, because it
  can start an extra session when session tabs exist. An item that waits
  for the load was not chosen either.
