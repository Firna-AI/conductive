# Shortcut model

This area holds the shortcut rules without a DOM or a network connection.
The [keyboard shortcut protocol](../../../docs/protocol/keyboard-shortcuts.md)
defines the behavior. Its [key table](../../../docs/protocol/keyboard-shortcuts-keys.md)
defines the defaults, fixed keys, and browser keys.

The caller supplies the commands that the page offers and the focus state.
It supplies visible workspace rows after collapsed sections and groups hide.
The model reads no page elements and runs no command.

For a command decision, the caller closes a willing menu first.
If the menu stays open, the caller leaves the key alone.
Otherwise, it calls `preventDefault` and `stopPropagation` before running
the command. A pass decision leaves the press alone.
A repeat decision comes for each repeat of a held key whose first press
would run a command now. The caller calls `preventDefault` and
`stopPropagation`, and runs nothing, so a held key runs its command once.

The [shortcut layer](../../shell/shortcuts/README.md) of the shell calls
`decideShortcut` for each key of the page. The palette key is one of its
commands.

The account stores canonical modifier names, such as `Alt+Meta+N`.
The key formatter gives Mac symbols or Windows and Linux key names.
Each press has one canonical key text for recording and matching.
A keypad key uses the key that it types, except a keypad digit, which keeps
its keypad name. With Num Lock off, a keypad navigation key uses its typed
name, such as `ArrowUp`.
Option keys, top-row digits, and non-Latin letters keep their physical key
rules.
The [shared contracts](../../shared/shortcuts.ts) separate an empty key list
from a null reset in a save. The [shared readers](../../shared/shortcut-read.ts)
check unknown input before the app or Worker uses it.

### Key Code

- [commands.ts](commands.ts): `shortcutCommands` supplies command groups,
  scopes, labels, and search words. Existing palette commands share their text.
- [defaults.ts](defaults.ts): `defaultShortcutKeys` supplies both keyboards.
  `commandInHost` keeps Mac window commands in the Mac app.
- [host.ts](host.ts): `detectShortcutHost` separates Chromium app windows
  from normal browser tabs. The desktop services supply the Mac app host.
- [browser-keys.ts](browser-keys.ts): `shortcutKeyAvailability` separates
  kept keys from keys that the app leaves to the browser.
- [keys.ts](keys.ts): `matchesShortcut` and `shortcutFromPress` share the
  character and physical key rules. The formatters supply visible and ARIA text.
- [keymap.ts](keymap.ts): `buildShortcutKeymap` combines defaults with
  overrides. Conflict and replacement functions prepare one atomic save.
  `firstShortcutKey` selects a usable hint for the current host.
- [decision.ts](decision.ts): `decideShortcut` returns a command, a repeat
  of a held command key, or a pass. Its context identifies modal ownership,
  menus, recording, and focus.
- [text-keys.ts](text-keys.ts): text field and terminal protection.
- [navigation.ts](navigation.ts): list steps, numbered rows, and exact
  workspace row and divider keys. Next workspace that needs input starts
  from the top of the shown rows when no shown row is open.

## Checks

Run the Node tests from the repository root:

```sh
npm run test -- src/app/shortcuts src/shared/shortcut-read.test.ts
```

Tests use the public model with supplied press and page state.
They need no DOM, clock, storage, or server.
