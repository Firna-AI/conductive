# Keyboard shortcuts: fixed keys and text keys

This doc holds the requirements and the decisions in force for the fixed
keys and the text keys of the keyboard shortcuts. It belongs to
[Keyboard shortcuts](keyboard-shortcuts.md), which gives the rules and the
terms. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Fixed keys

No person can give a fixed key to a command. The fixed keys are:

- Enter, which sends, and Shift+Enter, which adds a line, as
  [The send key](create-a-workspace.md#the-send-key) says (decision 143)
- Enter with any modifier, the keypad Enter, and Space with no modifier,
  which press or choose a focused control, such as a button, a switch, or
  a menu item
- Escape, which closes a dialog, a menu, or the palette
- Up, Down, Home, End, and Enter in a menu and in the palette, and Left and
  Right on the tabs of the palette, as
  [Keys inside the palette](command-palette.md#keys-inside-the-palette)
  says
- Enter, which saves a rename, and Escape, which cancels it
- Shift+F10 and the Menu key on a focused tab, which open the tab menu, as
  [The tab row](agents-and-sessions.md#the-tab-row) says
- on a focused workspace row, Alt with Up or Down and no other modifier,
  which moves the workspace
- on a focused panel divider, Left and Right with no modifier or with
  Shift, and Home and End, which move the divider
- the text keys of each system, as [Text keys](#text-keys) lists them
- the keys of the menus of the Mac app: ⌘Q, ⌘H, ⌥⌘H, ⌘M, ⌘R, ⇧⌘R, ⌘0,
  ⌘+, ⌘-, ⌃⌘F, and ⌥⌘I

Enter with a modifier and Space are fixed on both keyboards, so that a
focused control keeps them. A recorded key that runs only where no control
has the focus was rejected, because the key would then do two things. For
example, ⌘Enter would run a command, but send an unfinished message from
the message field.

Each keyboard has one list of fixed keys, the same in every host and on
every system. So the Mac list holds the keys of the menus of the Mac app
also in a browser, and the Windows and Linux list holds the text keys of
both systems. Reason: the account holds one set of changes for each
keyboard, so a key that the person records in one host also applies in
the others. A key that the Mac app keeps for its menus, such as ⌘R, would
otherwise stop working there.

The keys of a focused row and of a focused divider match exactly
(decision 193). So a key with more modifiers, such as ⌥⌘↑, runs its command
also while a row or a divider has the focus. Reason: a click on a row
leaves the focus on it. A row that kept ⌥⌘↓ would then move the workspace
for the whole org when the person asked for the next workspace.

## Text keys

These lists hold the text keys with a modifier that a person could record
by mistake. Each other key that edits or moves in text is a text key too.

On a Mac:

- Edit: ⌘Z, ⇧⌘Z, ⌘X, ⌘C, ⌘V, ⌘A, and in the Mac app ⌥⇧⌘V.
- Delete: ⌘⌫, ⇧⌘⌫, ⌥⌫, ⇧⌥⌫, ⌃⌫, ⌘⌦, ⌥⌦, ⌃H, ⌃D, and ⌃K.
- Move and select: ⌘, ⌥, or ⇧ with an arrow, and ⌘ or ⌥ with ⇧ and an
  arrow. An arrow with both ⌘ and ⌥ is not a text key.
- Emacs keys: ⌃A, ⌃E, ⌃B, ⌃F, ⌃N, ⌃P, ⌃T, ⌃O, ⌃Y, ⌃V, and ⌃L, and ⌃A, ⌃B,
  ⌃E, ⌃F, ⌃N, ⌃P, and ⌃V with ⇧.
- Other: ⌘., ⌃⌥⌘←, ⌃⌥⌘→, and ⌃⌥⌘↓.

On Windows and Linux:

- Edit: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+X, Ctrl+C, Ctrl+V,
  Ctrl+Shift+V, Ctrl+A, Ctrl+Insert, Shift+Insert, and Shift+Delete.
- Delete: Ctrl+Backspace and Ctrl+Delete.
- Move and select: Ctrl or Shift with an arrow, Ctrl+Home, Ctrl+End, and
  each of these Ctrl keys with Shift added.
- Other: Ctrl+.
- On Windows only: Alt+Backspace and Alt+Shift+Backspace.
- On Linux only: Ctrl+Shift+Backspace, Ctrl+Shift+Delete, Ctrl+/, and
  Ctrl+Shift+U.

In a single-line text field on Linux, Ctrl+U is a text key too, as
[Keys chosen by hand](keyboard-shortcuts-keys.md#keys-chosen-by-hand) says.
[Windows and Linux](keyboard-shortcuts-keys.md#windows-and-linux) says how
Android and an unknown system count for these keys.
