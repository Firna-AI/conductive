# Shortcut model

This area holds the shortcut rules without a DOM or a network connection.
The [keyboard shortcut protocol](../../../docs/protocol/keyboard-shortcuts.md)
defines the behavior. Its [key table](../../../docs/protocol/keyboard-shortcuts-keys.md)
defines the defaults and the browser keys,
[fixed keys and text keys](../../../docs/protocol/keyboard-shortcuts-fixed-keys.md)
defines the fixed keys, and [the hosts](../../../docs/protocol/keyboard-shortcuts-hosts.md)
defines which keys each host keeps.

The caller supplies the commands that the page offers and the focus state.
It supplies visible workspace rows after collapsed sections and groups hide.
The model reads no page elements and runs no command.

For a command decision, the caller closes a willing menu first.
If the menu stays open, the caller leaves the key alone.
Otherwise, it calls `preventDefault` and `stopPropagation` before running
the command. A stop decision closes a willing menu and consumes the press
without running a command. A pass decision leaves the press alone.
A repeat decision comes for each repeat of a held key whose first press
would run a command now. The caller calls `preventDefault` and
`stopPropagation`, and runs nothing, so a held key runs its command once.

The [shortcut layer](../../shell/shortcuts/README.md) of the shell calls
`decideShortcut` for each key of the page. The palette key is one of its
commands.

The account stores canonical modifier names, such as `Alt+Meta+N`.
The key formatter gives Mac symbols or Windows and Linux key names.
It shows a keypad digit as `Num 8`, so that it differs from the top-row 8.
Each press has one canonical key text for recording and matching.
A keypad key uses the key that it types, except a keypad digit, which keeps
its keypad name. With Num Lock off, a keypad navigation key uses its typed
name, such as `ArrowUp`.
Option keys, top-row digits, and non-Latin letters keep their physical key
rules.
While a layout switch key stays down, a restored press with Ctrl, Alt,
or Meta matches physically. The model adds each modifier that the switch took.
An unmatched restored shortcut then stops, including text keys in a text field.
Without Ctrl, Alt, or Meta after restoration, the press follows its normal rules.
It keeps its original character and modifiers, including Shift.

Composition, terminals that keep the key, frames, blocked menus, and an
active recorder still get their original event. The switch key itself passes.

Each browser table also lists its tab and address keys by system.
A Linux tab leaves Alt+digit to the browser, so org hints have no key.
Firefox on Linux keeps Ctrl+digit available for workspace commands.
Installed apps leave no key to the browser.
An unknown system on the Windows and Linux keyboard uses both systems' rules.
This includes the single-line Ctrl+U text key of Linux.
The [shared contracts](../../shared/shortcuts.ts) separate an empty key list
from a null reset in a save. The [shared readers](../../shared/shortcut-read.ts)
check unknown input before the app or Worker uses it.

### Key Code

- [commands.ts](commands.ts): `shortcutCommands` supplies command groups,
  scopes, labels, and search words. Existing palette commands share their text.
  Commands with workspace scope include Copy link, pull request actions,
  and transcript copies. Agent actions and transcript copies use the shared
  control labels.
- [defaults.ts](defaults.ts): `defaultShortcutKeys` supplies both keyboards.
  `commandInHost` keeps Mac window commands in the Mac app.
  Create PR includes a second key for Firefox tabs. Fix checks uses Alt
  instead of Firefox's text direction key. Commands without a default
  start with an empty key list and accept account overrides.
- [host.ts](host.ts): `detectShortcutHost` separates Chromium app windows
  from normal browser tabs. The desktop services supply the Mac app host.
- [browser-keys.ts](browser-keys.ts): `shortcutKeyAvailability` separates
  kept keys from keys that the app leaves to the browser.
- [keys.ts](keys.ts): `matchesShortcut` and `shortcutFromPress` share the
  character and physical key rules. The formatters supply visible and ARIA text.
- [layout-switch.ts](layout-switch.ts): `LayoutSwitchKeys` tracks switch
  codes and their modifiers. `null` means no held switch. An empty list
  means a held switch that took no modifier.
- [keymap.ts](keymap.ts): `buildShortcutKeymap` combines defaults with
  overrides. Conflict and replacement functions prepare one atomic save.
  `firstShortcutKey` selects a usable hint for the current host.
- [decision.ts](decision.ts): `decideShortcut` returns a command, a repeat,
  a stop, or a pass. Its context identifies modal ownership,
  menus, recording, and focus.
- [text-keys.ts](text-keys.ts): text field and terminal protection.
- [navigation.ts](navigation.ts): list steps, numbered rows, and exact
  workspace row and divider keys. Next workspace that needs input starts
  from the top of the shown rows when no shown row is open.

## Recorder integration

`AppServices.onKey` tracks the switch keys in its window before page events.
It adds a `layoutModifiers` snapshot to each `KeyPress`.
Key-up releases the matching code. Window blur clears every held switch.
The state survives a listener subscription change while a switch stays down.

A recorder with its own React event reads the same state with one call:

```ts
const press = {
  ...pressOf(event),
  layoutModifiers: services.onKey.layoutModifiers(),
}
```

Pass this press to `shortcutFromPress`, as the shortcut editor does.
The model restores a recorded key only when it then has Ctrl, Alt, or Meta.
Other recorded keys keep their normal character and modifiers.
The optional field on `ShortcutPress` lets callers without a switch keep
their ordinary character rules. The window listener always supplies the field.

## Checks

Run the Node tests from the repository root:

```sh
npm run test -- src/app/shortcuts src/shared/shortcut-read.test.ts
```

Tests use the public model with supplied press and page state.
They need no DOM, clock, storage, or server.
`defaults.test.ts` checks command order, defaults on both keyboards, and
text field dispatch. Its literal cases live in
[command-defaults.test-support.ts](command-defaults.test-support.ts).
`browser-keys.test.ts` checks the first and second Create PR keys in Firefox.
`keymap.test.ts` checks that the default keys have no shared owner.
