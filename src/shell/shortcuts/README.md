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
- A press that the model passes goes on to the page and the browser
  untouched. The model passes the repeats of a held key.
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

The palette offers the Command palette command in `PaletteProvider.tsx`:
its key opens a closed palette and closes an open one, on each page of
the signed-in app.

## Mark a terminal

The owner of a terminal gives the ref of its element, so that the
terminal keeps the keys that a program in it can read:

```tsx
const terminal = useShortcutTerminal()
return <div ref={terminal}>{/* the terminal */}</div>
```

## Key hints

`useShortcutKey(command)` gives the first key of the command that works
where the page runs, or none. `formatShortcut` and `ariaShortcut` of the
model give its text. The Search row shows the palette key this way.

## Mount

`ShortcutProvider` sits around `PaletteProvider` in `App.tsx`, and in
`AppProviders` of the test providers. It also gives `LayersContext`, the
open layers that the palette and every UI kit read.

## Checks

```sh
npm run test -- src/shell/shortcuts src/shell/palette src/shell/list src/shell/layout
```

The tests mount the whole app in happy-dom with `openPaletteTab`, which
hears the keys of the window as a browser gives them.
`shortcut-test-kit.tsx` presses keys by their key text or by their
command, records the keys that reach an element, and offers a command
from a test.

### Key Code

- [ShortcutProvider.tsx](ShortcutProvider.tsx): `ShortcutProvider`, the
  layer of the tab, and `useKeymap`, the one source of the keymap.
- [shortcut-listener.ts](shortcut-listener.ts): `handleShortcutPress`,
  which reads the page for one press, calls the model, and acts.
- [shortcut-offers.ts](shortcut-offers.ts): `ShortcutOffers`, the offered
  commands and the command that owns the open layer.
- [shortcut-context.ts](shortcut-context.ts): `useShortcutOffer`,
  `useShortcutTerminal`, and `useShortcutKey`.
- [shortcut-test-kit.tsx](shortcut-test-kit.tsx): `pressShortcut`,
  `pressCommand`, `keysHeardBy`, and `OfferedCommand`.

### Related Docs

- [Keyboard shortcuts](../../../docs/protocol/keyboard-shortcuts.md)
- [Keyboard shortcuts: the keys](../../../docs/protocol/keyboard-shortcuts-keys.md)
- [Command palette](../../../docs/protocol/command-palette.md)
