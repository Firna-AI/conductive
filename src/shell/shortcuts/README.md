# Shortcut layer

This area holds the keyboard shortcuts of the shell: the one key listener
of the app, the commands that the parts of the page offer to the keys, the
terminals that keep their keys, and the open menus and modal layers. The
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
- The app has no recorder of keys yet, so the listener tells the model
  that nothing records.

## The keymap

`useKeymap` in `ShortcutProvider.tsx` is the one place where the keymap
comes from. The listener and every key hint read it there. It holds the
default keys of the keyboard of the person. The changes that a person
saves in the account do not apply yet.

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
  a key that would do nothing goes on to the page and the browser.

### The owners of the commands

| Commands | Owner |
| --- | --- |
| Command palette | `PaletteProvider.tsx` |
| Each command that the palette lists: New workspace, New section, Archive workspace, the Go to rows, New session, Session history, Create org, Switch to org 1 to 9, Repositories settings, and Hide or show the sidebar | `PaletteKeys.tsx` of the palette, from the rows of `listedCommands` |
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
- A row of the palette ends with the key of its command, in the key chips
  of the mockups. Its option names the key in `aria-keyshortcuts`.
- The Search row shows the palette key, as ⌘K or Ctrl K.
- A control that runs a command shows the key in its tooltip, such as
  "New session (⌥⌘T)", and names it in `aria-keyshortcuts`. The icon and
  action buttons of the shell and the chat take a `shortcut` prop for
  this. `ShortcutTip` gives the tooltip to a Firna button, which takes no
  `title`, and `useAriaShortcut` names the key on it through its ref. A
  link takes `shortcutTip(label, hint)` as its `title`.
- The org tiles of the rail keep their drawn hint with the name of the
  org, and name their key only in `aria-keyshortcuts`.

## Mount

`ShortcutProvider` sits around `PaletteProvider` in `App.tsx`, and in
`AppProviders` of the test providers. It also gives `LayersContext`, the
open layers that the palette and every UI kit read.

## Checks

```sh
npm run test -- src/shell/shortcuts src/shell/palette src/shell/list src/shell/layout src/shell/workspace/WorkspaceKeys.test.tsx
```

The tests mount the whole app in happy-dom with `openPaletteTab`, which
hears the keys of the window as a browser gives them.
`shortcut-test-kit.tsx` presses keys by their key text, by their command,
or as the hints show them in the host of the app, with `pressHintKey`. It
records the keys that reach an element, and offers a command from a test.
`PageKeys.test.tsx` and `../workspace/WorkspaceKeys.test.tsx` run a
command of each owner from its key. `KeyHints.test.tsx` checks the hints
in a browser tab and in the phone layout.

### Key Code

- [ShortcutProvider.tsx](ShortcutProvider.tsx): `ShortcutProvider`, the
  layer of the tab, and `useKeymap`, the one source of the keymap.
- [shortcut-listener.ts](shortcut-listener.ts): `handleShortcutPress`,
  which reads the page for one press, calls the model, and acts.
- [shortcut-offers.ts](shortcut-offers.ts): `ShortcutOffers`, the offered
  commands and the command that owns the open layer.
- [shortcut-context.ts](shortcut-context.ts): `useShortcutOffer`,
  `useShortcutOffers`, `useShortcutTerminal`, and `useShortcutKey`.
- [shortcut-hints.tsx](shortcut-hints.tsx): `useShortcutHint`,
  `useAriaShortcut`, `shortcutTip`, and `ShortcutTip`.
- [PaletteKeys.tsx](../palette/PaletteKeys.tsx): the keys of the commands
  that the palette lists.
- [shortcut-test-kit.tsx](shortcut-test-kit.tsx): `pressShortcut`,
  `pressCommand`, `pressHintKey`, `keysHeardBy`, and `OfferedCommand`.

### Related Docs

- [Keyboard shortcuts](../../../docs/protocol/keyboard-shortcuts.md)
- [Keyboard shortcuts: the keys](../../../docs/protocol/keyboard-shortcuts-keys.md)
- [Command palette](../../../docs/protocol/command-palette.md)
