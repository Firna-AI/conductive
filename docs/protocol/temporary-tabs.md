# Temporary tabs

This doc holds the requirements and the decisions in force for the
temporary tab of a workspace. It covers what opens the temporary tab, how
it shows, what keeps it, what closes it, and its mark in the saved view.
It also covers the skill tabs in the saved view. It belongs to
[Files and changes](workspace-tools.md#files-and-changes).
[The tab row](agents-and-sessions.md#the-tab-row) states its place in the
row, its tab menu, and its moves. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A skill tab decision number, such as skill tab decision 2, names a
decision of the change that adds the [skill tabs](skill-tabs.md). The
[mockup catalogue](../mockups/catalogue-attachments-and-files.md)
draws the temporary tab at `app/files/temporary`. Its
[skill pages](../mockups/catalogue-workspace-tools.md) draw a temporary
skill tab at `app/skill-mentions/tab/temporary`.

## Terms

- **Look:** a press that opens a page to read it, such as a file, a diff,
  or a skill. A press that opens a session or the page of a port is not a
  look.
- **Temporary tab:** the one tab of the tab row that the next look at
  another file, diff, or skill replaces.
- **Kept tab:** a file, diff, or skill tab that is not temporary. It stays
  until the user closes it.
- **Saved view:** what one member sees in one workspace: the open tabs in
  their order, the shown tab, the file list, and the tool. The Worker
  saves it.

## Open a file, a diff, or a skill

- The tab row of the centre column holds at most one temporary tab
  (decision 284 B). Only a tab that a look opens can be temporary: a file,
  diff, or skill tab (skill tab decision 2 A).
- Reason: a press on a skill chip is a quick look, as a press on a file
  chip is. One temporary tab that all looks share keeps the row shortest.
  The rule covers each tab that a look opens, not a fixed list of kinds,
  so a later kind of such a tab needs no new rule.
- A kept tab for each skill was rejected, because the row then fills up. A
  second temporary tab for skills only was rejected. The row could then
  hold two temporary tabs, and Escape and Keep open would have to act on
  the one that shows (skill tab decision 2).
- A press on a file, a diff, or a skill without a tab opens it in the
  temporary tab. It replaces the file, the diff, or the skill that the
  temporary tab showed. The temporary tab then shows.
- When the row has no temporary tab, the press opens a new one.
  [The tab row](agents-and-sessions.md#the-tab-row) states where a new
  temporary tab opens, and that a replaced one keeps its place.
- A press on a file, a diff, or a skill that has a tab shows that tab. The
  temporary tab stays as it is.
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
- The rule holds for each press in the app that opens a file, a diff, or
  a skill:
  - a row of All files or Changes
  - a file chip in the message field or in a sent message, as
    [File mentions](file-mentions.md#chips-of-files-and-folders) says
  - a skill chip in the message field or in a sent message, as
    [Skill chips](skill-mentions.md#skill-chips) says
  - the chip of an attached file in a sent message
  - the chip of a file that a finished turn changed, which opens the diff
    of that file
  - Open the file, in the diff of a binary file
- Enter on a focused file row is a press too.
- Reason: each press follows one rule. A chip already opens its file as a
  press in All files does.
- An address that names a file, a diff, or a skill without a tab also
  opens it in the temporary tab. This holds for Back, Forward, a reload, a
  pasted address, and a link that opens in a new browser tab.
- Reason: a visit by address is a look at the page too.
- On a phone, a press also opens the file, the diff, or the skill in the
  temporary tab. So the presses on a phone add at most one tab to the row.
  A phone has no way to keep such a tab.
- Reason: a phone row shows only the session tabs. So the files that a
  member opens on a phone do not fill the tab row on a computer.
- No setting turns the temporary tab off. Reason: the user asked for this
  behaviour.

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
  press on a file, a diff, or a skill without a tab then opens a new
  temporary tab.
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
  [The tab row](agents-and-sessions.md#the-tab-row) states that menu.
- Reason: such a user cannot double-click. The tab menu is where such a
  user looks for an action of a tab.
- A second press that keeps the tab was rejected. No editor works in this
  way, and a press on the shown tab by habit would keep it.
- A keep with Enter, on the tab or on a file row, was rejected. A screen
  reader in browse mode sends a click in place of Enter.
- A command with its own key, and a menu on each file row with an item
  that opens the file as a kept tab, were not chosen. A rule that gives
  each pointer gesture on a tab an item in the tab menu was not chosen
  either.
- The [row menu](file-row-menu.md#the-menu) of All files and Changes holds
  no Keep open.
- A move of the temporary tab to another place also keeps it, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- Nothing else keeps the tab. A switch between Preview and Source of a
  Markdown file, an HTML file, or a skill keeps the state of the tab,
  temporary or kept. Copy, Download, and a scroll keep no tab.
- A keep after a time, or when the user comes back to the tab, was
  rejected. Each long look at a file would then leave a kept tab.
- A read-only workspace, such as an archived workspace or a workspace of a
  suspended org, uses the same rules for a press and a double-click. Its
  tab menu has no Keep open, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.

## Close the tab

- Escape closes the temporary tab while it is the shown tab, as its Close
  does. The user asked for this on 20 November 2026.
- Reason: a glance at a file then ends with one key, and the row keeps no
  tab of it.
- Escape is a [fixed key](keyboard-shortcuts-fixed-keys.md#fixed-keys), so
  no person can change it. A command with its own key in the Keyboard
  shortcuts tab was not chosen.
- The Keyboard shortcuts tab shows Escape as the fixed row Close the
  temporary tab, in the Navigation group. Reason: the tab lists each use
  of a fixed key in its own row, so a search there finds the key.
- Escape closes the tab only when nothing else on the page takes the key:
  - The focus is not in a text field, such as the message field, or in a
    terminal.
  - No menu, dialog, sheet, or popover of the sidebar is open. The first
    Escape closes that layer, and the tab stays.
  - No drag of a tab or a row is in progress. Escape ends the drag, and
    the tab stays.
  - The recorder of the Keyboard shortcuts tab does not wait for a key.
- Reason: Escape already closes these layers and ends a drag. One press
  then does one thing.
- Escape closes no kept tab, and no temporary tab that does not show.
  Reason: a kept tab is a tab that the user chose, and a tab that does not
  show is not the tab that the user looks at.
- A phone row shows only the session tabs, so Escape closes no tab on a
  phone.

## The saved view

- The saved view of each member marks which tab is temporary. So the mark
  stays after a reload, and the other devices of that member load it.
- A mark only in the memory of the browser was rejected. A reload or a
  second window would then turn the temporary tab into a kept tab.
- A saved view without a mark has no temporary tab, so each of its tabs is
  kept.
- The Worker reads a mark that is not valid, or that names no open tab of
  its kind, as no mark. It refuses no saved view because of its mark.
- Reason: a mark that does not fit then costs only the mark, not the saved
  view.
- The saved view keeps the skill tabs in fields of their own, in the view
  route and in the view that the Worker stores. `skillTabs` gives the
  agent, the name, and the place in the row of each skill tab.
  `activeSkill` gives the shown skill tab, and `temporarySkill` the
  temporary skill tab. `tabs`, `activeTab`, and `temporaryTab` never hold
  a skill tab.
- Reason: an older copy of the app, such as an older Mac app, refuses a
  view whose tabs hold a kind that it does not know. The previous Worker
  refuses a whole stored view for the same reason. So skill tabs in
  `tabs` of the stored view, as Preview tabs are, were rejected.
- A save without `skillTabs` comes from an older copy of the app. The
  Worker then keeps the stored skill tabs.
- When such a save names a temporary file or diff, the Worker closes the
  stored temporary skill tab. Reason: the row holds at most one temporary
  tab (decision 284 B).
