# Keyboard shortcuts: the settings tab

This doc holds the requirements and the decisions in force for the
Keyboard shortcuts tab of the Account page, where a person changes the keys
of the commands. It belongs to [Keyboard shortcuts](keyboard-shortcuts.md),
which gives the rules and the terms. A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.
The [mockup catalogue](../mockups/catalogue.md) draws the tab at
`app/account/shortcuts` in a browser, and at `mac-app/shortcuts` in the Mac
app.

## Where the tab shows

- The Account page has a third tab, Keyboard shortcuts, after General and
  Preferences. Its address is `/account/shortcuts`.
- The tab shows in every host and in every layout. Reason: the phone
  layout also serves a narrow desktop window, which has a keyboard. A tab
  that hides on a phone was rejected for that reason.
- The Keyboard shortcuts command opens the tab. The Keyboard shortcuts row
  of the [Settings](command-palette.md#settings) tab of the palette opens
  it too.
- The tab shows the keys of the keyboard of this device, with the changes
  of the person. A Mac shows the Mac keys. Windows and Linux show the
  Windows and Linux keys.
- Keys as JSON text on this tab were rejected, because file formats stay
  out of the main settings screen.

## The rows

- The tab lists each command with its keys, in the groups General, View,
  Navigation, Workspace, and Chat.
- The tab also lists the
  [fixed keys](keyboard-shortcuts-keys.md#fixed-keys). In each group, the
  commands come first. The fixed keys of the group follow, each with
  "Fixed shortcut".
- Three groups hold only fixed keys, and they close the list: Menus and
  palette, Text, and Mac app. Each group says once, under its title, that
  its keys are fixed.
- Menus and palette and Mac app say "These shortcuts are fixed." The Text
  group lists the text keys that a person could record by mistake. It says
  "These shortcuts are fixed, and so are the other keys that edit or move
  in text."
- Navigation says "The orgs count from the top of the rail." Workspace says
  "The workspaces count from the top of the list."
- A browser leaves out the rows and the group that only the Mac app has:
  Hide or show the sidebar, Back, Forward, Paste and match style, and the
  Mac app group.
- Each key of a row is a button that records a new key in its place.
- A row without a key shows Add shortcut. A row with one, two, or three
  keys shows + after its keys, because a command holds at most four keys.
  Add shortcut and + record one more key.
- Each key shows as its keyboard prints it, such as ⌥⌘/ on a Mac and
  Ctrl+Shift+T on Windows and Linux. Enter, Esc, Space, and Tab show as
  words.

## The lines

- The first line under the search field says "Select a shortcut to change
  it."
- The next line says which keys the terminal keeps, as
  [Where a key goes](keyboard-shortcuts.md#where-a-key-goes) says. On a
  Mac it says "Keys without ⌘ go to the terminal while it has the focus."
  On Windows and Linux it says "Every key goes to the terminal while it
  has the focus."
- In a normal tab, a key that does not work there is dimmed. Such a key is
  a kept key, or a key that the app leaves to that browser on that system,
  as [Hosts](keyboard-shortcuts.md#hosts) says. For example, a Chrome tab
  on Linux dims Alt+1 to Alt+9.
- One more line then names where the dimmed keys work: in the Mac app on a
  Mac, and in the app that the browser installs when the browser is Chrome
  or Edge.
- For example, a Chrome tab on a Mac says "Dimmed keys work in the Mac app
  or in Conductive installed from Chrome." A Firefox tab on a Mac says
  "Dimmed keys work in the Mac app."
- Off a Mac, a browser that installs no app says "Dimmed keys work in
  Conductive installed from Chrome or Edge."
- A person can change a dimmed key, because it works in the other hosts.
- The Mac app and an installed app dim no key.

## Search

- A search field at the top of the tab finds rows (decision 195). Its empty
  field says "Search shortcuts".
- A row matches when each word of the query is in its label or in its
  search words, by the rules of the [Search](command-palette.md#search) of
  the palette. Fixed rows match too.
- The tab then shows only the rows that match, in their order. A group
  without such a row hides.
- A search without a match says `Nothing matches “<query>”`, and under it
  "Try a command name, such as Close tab."
- Reason: the two searches of the app then agree. A search by keys was
  rejected, because a text field has no clear way to enter a key such as ⌘
  or ⌥. The conflict line already names the command that has a recorded
  key.

## Recording a key

- A press on a key records a new key in its place. A press on Add shortcut
  or on + records one more key.
- [The layout switch](keyboard-shortcuts-matching.md#the-layout-switch)
  gives the key that the recorder records while a layout switch key is
  down.
- The recorder says "Press the keys" until the person presses a key.
- Escape cancels the recording, and so does Cancel. The row then keeps its
  keys.
- A plain Tab and Shift+Tab move the focus out of the recorder, to Remove
  and Cancel, so the recorder does not take them. Reason: a keyboard user
  must be able to leave the recorder, and a plain Tab shortcut would take
  the key that moves the focus on every page. Tab with a modifier records
  as any key does.
- While the recorder replaces a key, it also offers Remove. Remove takes
  that key off the command, and saves at once. A command can lose every
  key this way.
- The recorder does not take a fixed key. The row then names that fixed
  key, as in "Hide Conductive always uses ⌘H." The recorder then waits for
  another key.
- When several fixed rows share the key, such as Enter or Esc, or no row
  lists it, such as ⇧⌘Enter, the row says only that the key is fixed, as in
  "⇧⌘Enter is a fixed shortcut."
- Each recorded key saves at once, as a change on the Preferences tab does.

## Conflicts

- When a recorded key belongs to another command that can run in the same
  place, the row names that command, as in "Model picker uses ⌘/.". The row
  then offers only Replace and Cancel.
- Replace moves the key to this command, and takes it from the other
  command, in one save.
- Cancel keeps the keys of both commands.

## Reset

- A changed row shows Reset. Reset gives the command its default keys on
  this keyboard again.
- When another command now holds a default key of the command, Reset shows
  the conflict line of that key, with Replace and Cancel, as a recorded key
  does. Replace then resets the command and takes the key from the other
  command, in one save.
- While this keyboard has a change, the tab shows Reset all.
- Reset all asks first, because nothing brings the changes back. The
  question says "Reset all shortcuts?", with Cancel and Reset all.
- Its text says "3 commands get their default shortcuts again, wherever you
  use Conductive on a Mac.", with the number of changed commands. On
  Windows and Linux it ends with "on Windows or Linux".
- Reset all gives every command its default keys on this keyboard, in one
  save. The changes of the other keyboard stay.

## Save errors

- A failed save shows its error on the row, as in "⇧⌘P wasn't saved. Try
  again.". The row keeps its saved keys.
- The error names what failed. A failed Reset says "Model picker wasn't
  reset. Try again." on its row. A failed removal says "⌘/ wasn't removed.
  Try again." on its row. A failed Reset all says "The shortcuts weren't
  reset. Try again." under Reset all.
