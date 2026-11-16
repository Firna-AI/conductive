# Temporary tabs

This doc holds the requirements and the decisions in force for the
temporary tabs of a workspace. It covers what opens a temporary tab, the
temporary tab of each pane, how it shows, what keeps it, and its mark in
the saved view. It belongs to
[Files and changes](workspace-tools.md#files-and-changes).
[The tab row](tab-row.md) states its place in the row, its tab menu, and
its moves. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A split panes decision number names a decision of the change that
adds [split panes](split-panes.md), as that doc says. The
[mockup catalogue](../mockups/catalogue-attachments-and-files.md) draws the
temporary tab at `app/files/temporary`.

## Terms

- **Temporary tab:** the one file or diff tab of a pane that the next
  press on another file or diff replaces, when the press uses that pane.
- **Kept tab:** a file or diff tab that is not temporary. It stays until
  the user closes it.
- **Saved view:** what one member sees in one workspace: the panes, each
  with its open tabs in their order and its shown tab, the focused pane,
  the file list, and the tool. The Worker saves it.
- **Pane:** one part of the centre column, with its own tab row. The
  **focused pane** is the pane that the user used last.
  [Split panes](split-panes.md#terms) gives both terms.

## Open a file or a diff

- Each tab row of the centre column holds at most one temporary tab
  (decision 284 B and split panes decision 5 B). Only a file or diff tab
  can be temporary.
- A press on a file or a diff without a tab opens it in the temporary tab.
  It replaces the file or the diff that the temporary tab showed. The
  temporary tab then shows.
- When the row has no temporary tab, the press opens a new one.
  [The tab row](tab-row.md#the-order) states where a new
  temporary tab opens, and that a replaced one keeps its place.
- A press on a file or a diff that has a tab shows that tab in its pane.
  The temporary tab stays as it is.
- Reason: the files that the user only looks at then take at most one tab,
  and no tab that the user chose closes. VS Code, Zed, and JetBrains work
  in this way, so most developers know it. The user chose this on
  11 November 2026.
- A limit on the number of file tabs, which closes the oldest tab, was
  rejected. A tab that the user wanted could close without a warning, and
  the row still fills up to the limit.
- A press that shows the file with no tab, until a double-click adds one,
  was rejected. After a visit to a chat, only Back or a new press would
  bring the file back.
- A reading pane in the right column, under the lists, was rejected. That
  column is narrow for code, and a phone has no right column.
- A press that replaces the file of the shown tab, as a link in a browser
  does, was rejected. It overwrites a file that the user wanted to keep.
- A press that only selects a file, with a double-click that opens it, was
  rejected. Each look at a file would then need a double-click, and it
  would still leave a tab.
- The rule holds for each press in the app that opens a file or a diff:
  - a row of All files or Changes
  - a file chip in the message field or in a sent message, as
    [File mentions](file-mentions.md#chips-of-files-and-folders) says
  - the chip of an attached file in a sent message
  - the chip of a file that a finished turn changed, which opens the diff
    of that file
  - Open the file, in the diff of a binary file
- Enter on a focused file row is a press too.
- Reason: each press follows one rule. A chip already opens its file as a
  press in All files does.
- An address that names a file or a diff without a tab also opens it in
  the temporary tab. This holds for Back, Forward, a reload, a pasted
  address, and a link that opens in a new browser tab.
- Reason: a visit by address is a look at the file too.
- On a phone, a press also opens the file or the diff in the temporary
  tab. So the presses on a phone add at most one tab to each row. A phone
  has no way to keep a file tab.
- Reason: a phone row shows only the session tabs. So the files that a
  member opens on a phone do not fill the tab rows on a computer.
- No setting turns the temporary tab off. Reason: the user asked for this
  behaviour.

## The temporary tab of each pane

- With two panes, each pane has its own temporary tab, as each editor
  group of VS Code has its own preview tab (split panes decision 5 B). So
  the centre column holds at most two temporary tabs.
- Each rule of this doc applies inside its own pane: the replace in place,
  the keep, and the check of the mark in the saved view.
- A press on a file or a diff without a tab uses the pane that shows a
  file or a diff. When no pane or both panes show one, the press uses the
  focused pane (split panes decision 3 B).
  [Where a tab opens](split-panes.md#where-a-tab-opens) gives the reason.
- The press replaces the temporary tab of that pane. When that pane has no
  temporary tab, the press opens a new one in the row of that pane.
- A press never moves, hides, or closes a tab of the other pane.
- Reason: the panes follow the editor groups of VS Code (split panes
  decision 1 C), and a press then never changes the other pane.
- One temporary tab for the workspace was not chosen. A press that goes to
  the other pane would then move that tab to the row of the other pane. So
  a press could change what the other pane shows, or close that pane.
- A press that uses the pane of the temporary tab, when no pane or both
  panes show a file, was not chosen either. It changes the rule of split
  panes decision 3 B.
- A visit by address uses the same pane as a press on that file or diff,
  as [The address](split-panes.md#the-address) says.

## The title of the tab

- The title of the temporary tab shows in italics. Nothing else on the tab
  changes.
- A screen reader hears the name of the tab, then "temporary", as in
  "README.md, temporary". The tab menu and the move messages use the name
  alone.
- Reason: the italics show the state only to the eye. The word comes after
  the name, so the name still starts with the file.

## Keep a tab

- A double-click on the temporary tab makes it a kept tab. A double-click
  on a row of All files or Changes keeps the tab that the row opens.
- A kept tab stays in its place, and its title turns upright. The next
  press on a file or a diff without a tab then opens a new temporary tab.
- Nothing new shows on the tab for a keep (decision 285 A). Reason: the
  user asked for the double-click, so the italic title stays the only mark
  of the tab.
- A Keep open button on the tab, and one in the header of the file, were
  not chosen.
- The second click of a double-click opens nothing again. The double-click
  selects no text.
- Reason: a keep adds no second entry for the same address to the history
  of the browser tab.
- A double-click on a chip keeps no tab. Reason: the user named only the
  file row and the tab. A chip in the message field also takes a
  double-click for its text.
- A keyboard user and a screen-reader user keep the tab with Keep open in
  its tab menu (decision 286 B).
  [The tab row](tab-row.md#the-tab-menu) states that menu.
- Reason: such a user cannot double-click. The tab menu is where such a
  user looks for an action of a tab.
- A second press that keeps the tab was rejected. No editor works in this
  way, and a press on the shown tab by habit would keep it.
- A keep with Enter, on the tab or on a file row, was rejected. A screen
  reader in browse mode sends a click in place of Enter.
- A command with its own key, and a menu on each file row, were not
  chosen. A rule that gives each pointer gesture on a tab an item in the
  tab menu was not chosen either.
- A move of the temporary tab to another place also keeps it, as
  [The tab row](tab-row.md#the-tab-menu) says.
- Nothing else keeps the tab. A switch between Preview and Source of a
  Markdown file keeps the state of the tab, temporary or kept. Copy,
  Download, and a scroll keep no tab.
- A keep after a time, or when the user comes back to the tab, was
  rejected. Each long look at a file would then leave a kept tab.
- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, uses the same rules for a press and a double-click. Its
  tab menu has no Keep open, as
  [The tab row](tab-row.md#read-only-workspaces) says.

## The saved view

- The saved view of each member marks the temporary tab of each pane. So
  the marks stay after a reload, and the other devices of that member load
  them.
- A mark only in the memory of the browser was rejected. A reload or a
  second window would then turn the temporary tab into a kept tab.
- A pane without a mark has no temporary tab, so each of its tabs is kept.
- The Worker reads a mark that is not valid, or that names no open file or
  diff tab of its pane, as no mark. It refuses no saved view because of a
  mark.
- Reason: a mark that does not fit then costs only the mark, not the saved
  view.
