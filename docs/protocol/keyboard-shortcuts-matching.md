# Keyboard shortcuts: matching a press

This doc holds the requirements and the decisions in force for how a press
on the keyboard matches the keys of the commands. It covers other keyboard
layouts, and a press while a layout switch key is down. It belongs to
[Keyboard shortcuts](keyboard-shortcuts.md), which gives the rules and the
terms. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## How a key matches

- A key without ⌥ matches by the character that it types. A key with ⌥
  matches by its physical key. Reason: on a Mac, ⌥ changes the character,
  so ⌥⌘N types no N.
- A digit matches by its physical key in the top row. Reason: French
  keyboards type digits with Shift.
- A letter or a digit whose key types another script, such as Cyrillic or
  Greek, matches by its physical key. Reason: on a Russian layout, Ctrl+K
  arrives as Ctrl+л, so every letter key would fail, also the palette key.
- A keypad key counts as the key that it types. So the keypad / with ⌘ is
  ⌘/, the keypad 8 with Num Lock off is ↑, and the keypad Enter is Enter, a
  fixed key. Reason: each press then has one key, so the conflict line,
  Replace, Reset, and the fixed keys see every key that a press can run. A
  keypad key of its own was rejected, because two keys could then run on
  one press.
- A keypad digit stays a key of the keypad, so ⌘ with the keypad 8 does
  not run Open workspace 8. Reason: a digit matches by its physical key.
- A punctuation key, such as the / of ⌘/, can sit at another place on
  another layout. The person can then record another key.
- On German and French layouts, [ and ] need AltGr, or ⌥ on a Mac. So the
  bracket keys of Previous tab and Next tab do not work there, and their
  arrow keys still work. The plain [ and ] of the two View toggles do not
  work there either, and their keys with B still work.
- [The layout switch](#the-layout-switch) gives how a key matches while a
  layout switch key is down.

## The layout switch

- A system can switch the keyboard layout on a pair of modifiers, such as
  Alt+Shift on Linux. The modifier that goes down second is then a layout
  switch key. The page does not get it as a modifier.
- So a key with both modifiers arrives as another key. For example,
  Alt+Shift+← arrives as Alt+←, which is Back in the browser. Alt+Shift+↑
  arrives as Alt+↑, which moves a focused workspace row.
- While a layout switch key is down, the app adds back the modifier that
  the layout switch key took. The press with that modifier is the restored
  key. The app matches the restored key by its physical key
  (decision 197). So Alt+Shift+1 runs Open workspace 1 in either order of
  the modifiers.
- Reason: the keys that the tab shows then work also with such a switch,
  and no press runs a wrong command or leaves the page. Changing nothing,
  and a rule that runs no shortcut while a layout switch key is down, were
  rejected for this reason. Linux keys without Alt+Shift were rejected,
  because they need a third keyboard or more than 20 new default keys.
- The physical key counts also for a letter or a punctuation key without
  ⌥. Reason: the character comes from the other layout.
- A restored key that runs no command goes no further. Neither the page
  nor the browser acts on it, also when it is a text key in a text field.
  Reason: the switch turns one key into another, such as Ctrl+Shift+Z into
  Ctrl+Z, which undoes in place of redoing.
- The app uses the restored key, its physical key, and this stop only when
  the restored key has Ctrl, Alt, or ⌘. Each other press goes on as it
  does without a layout switch key, so in a text field it types its
  character.
- Reason: a fast typist can type the next letter before the layout switch
  key is up, such as Caps Lock or the Shift of Alt+Shift. The shortcuts
  must not take that letter from the message field. Each harmful restored
  key has Ctrl, Alt, or ⌘. A stop of every press was rejected, because it
  lost typed letters.
- The physical key of a layout switch key names the modifier that it took:
  Shift, Ctrl, Alt, or Meta, which is ⌘ on a Mac. Another physical key,
  such as Caps Lock, takes no modifier. Reason: the rule then also covers a
  switch on Ctrl+Shift or on Ctrl+Alt.
- A layout switch key stays down until the key-up of its physical key, or
  until the window loses the focus. Reason: a key-up while another window
  has the focus never reaches the page.
- The press of the layout switch key itself goes on to the page and to the
  browser.
- As for a key that runs a command, an open menu closes first. The
  terminal still keeps its keys, a menu that does not close still keeps
  the key, and text composition still gets its key, as
  [Where a key goes](keyboard-shortcuts.md#where-a-key-goes) says.
- [The recorder](keyboard-shortcuts-tab.md#recording-a-key) records the
  restored key only when that key has Ctrl, Alt, or ⌘. Otherwise it records
  the press as it arrives. Reason: the person pressed that key, and the app
  matches it in the same way.
- Risk: a page cannot stop the switch. So each press of a layout switch
  key still switches the layout, and with it the language that the keys
  type.
