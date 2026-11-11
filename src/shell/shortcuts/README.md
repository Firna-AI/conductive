# Shortcut layer

This area holds the keyboard shortcuts of the shell: the one key listener
of the app, the commands that the parts of the page offer to the keys, the
terminals that keep their keys, the recorder of the Keyboard shortcuts tab,
and the open menus and modal layers. The
[shortcut model](../../app/shortcuts/README.md) decides each key. This
layer reads the page, asks the model, and acts on the decision. The
[keyboard shortcut protocol](../../../docs/protocol/keyboard-shortcuts.md)
gives the rules.

## How a key goes

- `AppServices.onKey` hears each press in the capture phase of the window,
  before an element of the page hears it.
- The listener reads the page at each press: the focus, the open layers,
  the offered commands, the keymap, the keyboard, and the host. Then it
  calls `decideShortcut`.
- The focus is a terminal when the press comes from inside an element that
  `useShortcutTerminal` marks. A `textarea` and an editable element, such
  as the message field, are text fields. An input of a text type is a
  single-line text field. Everything else is the page.
- The page never hears a key of a port preview or the live desktop,
  because their frames come from another origin.
- While a dialog or a sheet is open, only the command whose offer names
  that layer can run, such as the palette key over the palette's own
  dialog. A layer of another owner keeps every key: the page under it
  takes no input, so the listener offers no command to the model.
- A command decision closes every open menu first. A menu that refuses,
  such as during a change that it runs, keeps the key.
- A key that runs a command goes no further: the listener calls
  `preventDefault` and `stopPropagation`, then runs the latest offer of
  the command. So the message field and the terminal never get it.
- A held key runs its command once. Each repeat of a key whose first
  press runs a command now goes no further either: the model gives it a
  repeat decision, and the listener stops it without a run.
- A press that the model passes goes on to the page and the browser
  untouched.
- A layout switch key passes untouched. While it stays down, the model
  restores a press that then has Ctrl, Alt, or Meta and matches it physically.
  A restored shortcut that runs no command goes no further, also in a text field.
  Other presses follow their normal rules, including plain and Shift-only typing.
  This stop closes willing menus first. A menu that refuses keeps the key.
  Composition, protected terminal keys, frames, and recorders still keep
  their original events.
- While the recorder of the [Keyboard shortcuts tab](../account/shortcuts/README.md)
  shows, it waits for a key, so the listener tells the model that a
  recorder records, and no key runs a command. The recorder marks itself
  with `useShortcutRecorder`, and takes the keys that reach it.
  Its own event gets `layoutModifiers: services.onKey.layoutModifiers()`
  before the editor calls `shortcutFromPress`, so it records the restored
  key. This reads the same window state that the listener uses.

## The keymap

`useKeymap` in `ShortcutProvider.tsx` is the one place where the keymap
comes from. The listener, every key hint, and the Keyboard shortcuts tab
read it there, the tab through `useShortcutKeymap`. It holds the keys of
the keyboard of the person: the defaults, with the changes that the
account holds for that keyboard. A save of the tab changes the account,
so the keys and the hints follow it at once. Before the account loads,
each command has its default keys.

## Offer a command

A part of the page offers each command that its control runs, while it
shows:

```tsx
useShortcutOffer('command-palette', ready ? toggle : null, controller)
```

- `null` offers nothing. A key runs the `run` of the latest render.
- The third argument is the owner of the dialog or the sheet that the
  command opens, as `useModalLayer` and `useLayerFocus` note it. The key
  of that command still runs while only that layer is open.
- When two parts offer the same command, the latest offer runs it.
- `useShortcutOffers(list)` offers a list of commands, such as one for
  each row of a list. It offers again only when the list of commands
  changes.
- A part offers a command only while its control would do something. So
  without a held layout switch, a key that would do nothing goes on to
  the page and the browser.

### The owners of the commands

| Commands | Owner |
| --- | --- |
| Command palette | `PaletteProvider.tsx` |
| Each command that the palette lists: New workspace, New section, Archive workspace, Restore workspace, the Go to rows, New session, Session history, Create org, Send feedback, Repositories settings, Keyboard shortcuts, and Hide or show the sidebar | `PaletteKeys.tsx` of the palette, from the rows of `listedCommands` |
| Switch to org 1 to 9 | `OrgRail.tsx`, while the rail shows, for each org by its place, also the org of the page and a deleted org |
| Account page | `Signed` in `Shell.tsx`, on each page of the signed-in app |
| Workspace list | `OrgRoutes.tsx`, on each page of an org that is not deleted |
| Hide or show the right column | `RightColumnToggle` in `WorkspaceColumns.tsx` |
| Back, Forward | The window controls of the Mac app, while the window has a page there |
| Open workspace 1 to 9, Previous and Next workspace, Next workspace that needs input | `useListKeys` of the workspace list, while the page shows the list |
| Previous tab, Next tab, Close tab, Reopen closed session | `useTabKeys` of the tab row of the chat. A shown file tab offers its own Close tab. |
| Focus the message field, Attach files, Stop the agent | The composer of the chat |
| Model picker, Next effort level | The model picker of the composer |

`PaletteKeys` offers each command that the palette lists, with the action
of its row, also while the palette is closed. So a key and its row do the
same thing, and the key runs only where the palette lists the row, as
[Where a command runs](../../../docs/protocol/keyboard-shortcuts.md#where-a-command-runs)
says. Each row of the palette names its command in `CommandRow.command`.
A Switch to row names the command of the place of its org, whose key it
shows, but the rail runs that key, so `listedCommands` leaves it out.
The Help group offers Send feedback on each page. It has no default key.
An assigned key opens the Feedback dialog through the same row action.

## Mark a terminal

The owner of a terminal gives the ref of the element where a program
reads the keys, so that the terminal keeps the keys that the program can
read. For the Terminal tool, that is the xterm.js screen, through the
`screenRef` of `TerminalTool`. Its buttons, such as Reconnect, keep no
key.

```tsx
const terminal = useShortcutTerminal()
return <TerminalTool screenRef={terminal} {...props} />
```

## Key hints

- `useShortcutKey(command)` gives the first key of the command that works
  where the page runs, or none. `useShortcutHint(command)` gives its text
  and its name for `aria-keyshortcuts`. The phone layout gets no hint.
  A normal Linux browser tab has no working default org key, so its org
  tiles show no key. An installed app on Linux keeps Alt+digit.
- A row of the palette ends with the key of its command, in the key chips
  of the mockups. Its option names the key in `aria-keyshortcuts`.
- The Search row shows the palette key, as ⌘K or Ctrl K.
- A control that runs a command shows the key in its tooltip, such as
  "New session (⌥⌘T)", and names it in `aria-keyshortcuts`. The icon and
  action buttons of the shell and the chat take a `shortcut` prop for
  this. `ShortcutTip` gives the tooltip to a Firna button, which takes no
  `title`, and `useAriaShortcut` names the key on it through its ref. A
  link takes `shortcutTip(label, hint)` as its `title`.
- The drawn hint of an org tile in the rail shows the name of the org and
  the key chips of its key. The link names the key in
  `aria-keyshortcuts`.
- A part outside the shell, such as the tabs of the Files lists and the
  Archive of the pull request bar, takes the tooltip and the key name as
  plain props, from `shortcutLabels(label, hint)`.

## Mount

`ShortcutProvider` sits around `PaletteProvider` in `App.tsx`, and in
`AppProviders` of the test providers. It also gives `LayersContext`, the
open layers that the palette and every UI kit read.

## Checks

```sh
npm run test -- src/shell/shortcuts src/shell/palette src/shell/list src/shell/layout src/shell/workspace/WorkspaceKeys.test.tsx src/shell/account/shortcuts
```

The tests mount the whole app in happy-dom with `openPaletteTab`, which
hears the keys of the window as a browser gives them. The Chrome tab runs
on a Mac with the Mac keyboard and on Windows with the other keyboard,
unless its `system` option names another system, such as Linux.
`shortcut-test-kit.tsx` presses keys by their key text, by their command,
or as the hints show them in the host of the app, with `pressHintKey`. A
press can also come from another physical key, such as the / of the
keypad. It records the keys that reach an element, and offers a command
from a test.
`PageKeys.test.tsx` and `../workspace/WorkspaceKeys.test.tsx` run a
command of each owner from its key, also the org keys of the rail.
`KeyHints.test.tsx` checks the hints in a browser tab and in the phone
layout. `pressHintKey` presses the key of the keymap with the changes of
the account.

### Key Code

- [ShortcutProvider.tsx](ShortcutProvider.tsx): `ShortcutProvider`, the
  layer of the tab, and `useKeymap`, the one source of the keymap, with
  the changes of the account.
- [shortcut-listener.ts](shortcut-listener.ts): `handleShortcutPress`,
  which reads the page for one press, calls the model, and acts.
- [shortcut-offers.ts](shortcut-offers.ts): `ShortcutOffers`, the offered
  commands and the command that owns the open layer.
- [shortcut-context.ts](shortcut-context.ts): `useShortcutOffer`,
  `useShortcutOffers`, `useShortcutTerminal`, `useShortcutRecorder`,
  `useShortcutKeymap`, and `useShortcutKey`.
- [shortcut-hints.tsx](shortcut-hints.tsx): `useShortcutHint`,
  `useAriaShortcut`, `shortcutTip`, `shortcutLabels`, and `ShortcutTip`.
- [PaletteKeys.tsx](../palette/PaletteKeys.tsx): the keys of the commands
  that the palette lists.
- [shortcut-test-kit.tsx](shortcut-test-kit.tsx): `pressShortcut`,
  `pressCommand`, `pressHintKey`, `keysHeardBy`, and `OfferedCommand`.

### Related Docs

- [Keyboard shortcuts](../../../docs/protocol/keyboard-shortcuts.md)
- [Keyboard shortcuts: the keys](../../../docs/protocol/keyboard-shortcuts-keys.md)
- [Keyboard shortcuts: the settings tab](../../../docs/protocol/keyboard-shortcuts-tab.md)
- [Command palette](../../../docs/protocol/command-palette.md)
