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
  dialog. Over a layer of another owner, no key runs a command: the page
  under it takes no input, so the listener offers no command to the model.
- A command decision closes every open menu first. A menu that refuses,
  such as during a change that it runs, keeps the key.
- A key that runs a command goes no further: the listener calls
  `preventDefault` and `stopPropagation`, then runs the latest offer of
  the command. So the message field and the terminal never get it.
- A held key runs its command once. `AppServices.onKey` notes each
  physical key that is down whose first press the listener consumed, for
  a command or a stop. It forgets the key at its key-up, or when the
  window loses the focus.
- Each repeat of such a key goes no further: the model gives it a stop
  decision before any other rule, and the listener stops it without a run
  and closes no menu. So when the first press opens a dialog or moves the
  focus, no repeat reaches that dialog or field, and the browser does not
  act on it.
- Each other repeat of a key whose first press runs a command now goes no
  further either: the model gives it a repeat decision, and the listener
  stops it without a run. So a key that the recorder has just saved stops
  its own repeats too.
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
  the page and the browser. A repeat of a key whose first press the
  listener consumed still stops, as [How a key goes](#how-a-key-goes) says.

### The owners of the commands

| Commands | Owner |
| --- | --- |
| Command palette | `PaletteProvider.tsx` |
| Each command that the palette lists: New workspace, New section, Archive workspace, Restore workspace, the Go to rows, New terminal, Merge latest, New session, Session history, Create org, Send feedback, Repositories settings, Keyboard shortcuts, and Hide or show the sidebar | `PaletteKeys.tsx` of the palette, from the rows of `listedCommands` |
| Switch to org 1 to 9 | `OrgRail.tsx`, while the rail shows, for each org that is not deleted by its place, also the org of the page |
| Settings | `Signed` in `Shell.tsx`, on each page of the signed-in app |
| Workspace list | `OrgRoutes.tsx`, on each page of an org that is not deleted |
| Hide or show the right column | `RightColumnToggle` in `WorkspaceColumns.tsx` |
| Back, Forward | The window controls of the Mac app, while the window has a page there |
| Open workspace 1 to 9, Previous and Next workspace, Next workspace that needs input | `useListKeys` of the workspace list, while the page shows the list |
| Previous tab, Next tab, Close tab, Reopen closed session | `useTabKeys` of the tab row of the chat. A shown file tab offers its own Close tab. The shown temporary tab also offers its close to Escape, with `usePageEscape`. |
| Copy concise transcript, Copy full transcript | `useTabKeys` of the tab row of the chat, while a session tab shows, with the copy of its tab menu |
| Explain the selection | `useExplain` of the chat, while Explain shows by a selection |
| Focus the message field, Attach files, Stop the agent | The composer of the chat |
| Stop the agent, while the popover of an explanation shows | The follow-up field of the popover, while a turn of its session runs. While the composer offers it too, the latest offer runs, as above. |
| Model picker, Next effort level, Fast mode | The model picker of the composer of a session. It offers Fast mode only for a model that the model list marks as fast. |
| Copy link | `CopyLink.tsx` of the workspace header, while the label of the number shows |
| Create PR, Fix checks, Resolve conflicts, Address review, Commit and push, Merge PR, Continue after merge, Open PR on GitHub | `BarKeys` in `workspace/github/bar-keys.tsx`, beside the bar of the right column while the column shows, and beside the actions at the top of the Checks tab of a phone. Each button that takes a click offers its command, and Open PR on GitHub runs while the bar links the pull request. |

`PaletteKeys` offers each command that the palette lists, with the action
of its row, also while the palette is closed. So a key and its row do the
same thing, and the key runs only where the palette lists the row, as
[Where a command runs](../../../docs/protocol/keyboard-shortcuts.md#where-a-command-runs)
says. Each row of the palette names its command in `CommandRow.command`.
A Switch to row names the command of the place of its org, whose key it
shows, but the rail runs that key, so `listedCommands` leaves it out.
The Help group offers Send feedback on each page. Its key opens the
Feedback dialog through the same row action.

## Escape on the page

Escape is a fixed key, so no keymap holds it, and no part can offer it as
a command. A part that closes something on Escape, such as the shown
temporary tab, offers its action with `usePageEscape`:

```tsx
usePageEscape(shown && temporary ? close : null)
```

- `null` offers nothing. The key runs the `run` of the latest render.
- The press counts only when it is free as it starts: no modifier, no
  repeat, no composition, the focus on the page and not in a text field
  or a terminal, and no open menu, modal layer, or recorder. The open
  layers count as they are in the capture phase, before a handler closes
  one of them.
- The action waits for the end of the bubble phase of the window. A
  handler that takes Escape, such as the end of a drag, the close of the
  list popover, or a handler that stops the press, keeps the key. Such a
  handler calls `preventDefault`, or stops the press.
- The action stops the default action of the key.

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
  where the page runs, or none. `useShortcutHint(command)` gives its
  tokens for the key chips, its text for a tooltip, and its name for
  `aria-keyshortcuts`. The phone layout gets no hint.
  A normal Linux browser tab has no working default org key, so its org
  tiles show no key. An installed app on Linux keeps Alt+digit.
- A row of the palette ends with the key of its command, in the shared
  key chips. Its option names the key in `aria-keyshortcuts`.
- The Fast row of the model menu of a session shows the key of Fast mode
  between its label and its switch, in the same key chips, and names it in
  `aria-keyshortcuts`. The menus of New workspace, Preferences, and an
  automation show no key, because the key runs only where a session tab shows.
- The Search row shows the palette key, as ⌘K or Ctrl K.
- A control that runs a command shows the key in its tooltip, such as
  "New session (⌥⌘T)", and names it in `aria-keyshortcuts`. The icon and
  action buttons of the shell and the chat take a `shortcut` prop for
  this. `ShortcutTip` gives the tooltip to a Firna button, which takes no
  `title`, and `useAriaShortcut` names the key on it through its ref. A
  link takes `shortcutTip(label, hint)` as its `title`.
- The label of the number in the workspace header shows the key of Copy
  link in its tooltip only. The shared Copy link button takes no ref, so
  it names no key in `aria-keyshortcuts`.
- The drawn hint of an org tile in the rail shows the name of the org and
  the key chips of its key. The link names the key in
  `aria-keyshortcuts`.
- A part outside the shell, such as the tabs of the Files lists, takes the
  tooltip and the key name as plain props, from
  `shortcutLabels(label, hint)`. A part that draws the controls of several
  commands with labels of its own, such as the buttons and the links of
  the pull request bar, takes the function of `useShortcutLabelsOf()`,
  which gives them for a command and the label of its control.

## Mount

`ShortcutProvider` sits around `PaletteProvider` in `App.tsx`, and in
`AppProviders` of the test providers. It also gives `LayersContext`, the
open layers that the palette and every UI kit read.

## Checks

```sh
npm run test -- src/shell/shortcuts src/shell/palette src/shell/list src/shell/layout src/shell/workspace/WorkspaceKeys.test.tsx src/shell/workspace/CopyLink.test.tsx src/shell/workspace/github src/shell/account/shortcuts
```

The tests mount the whole app in happy-dom with `openPaletteTab`, which
hears the keys of the window as a browser gives them. The Chrome tab runs
on a Mac with the Mac keyboard and on Windows with the other keyboard,
unless its `system` option names another system, such as Linux.
`shortcut-test-kit.tsx` presses keys by their key text, by their command,
or as the hints show them in the host of the app, with `pressHintKey`. A
press can also come from another physical key, such as the / of the
keypad. It records the keys that reach an element, and offers a command
from a test. `serveShortcutChanges` gives the account of the fake API the
keys that a person recorded, such as for a command without a default key.
`PageKeys.test.tsx` and `../workspace/WorkspaceKeys.test.tsx` run a
command of each owner from its key, also the org keys of the rail and the
copy keys of the chat. `../workspace/WorkspaceKeys.test.tsx` also checks
the key at the end of the Fast row of the model menu of a session, the run
of Fast mode from its key, and a model without fast mode, where the key
goes on to the page. The tests of the pull request bar under
`../workspace/github/` and `../workspace/CopyLink.test.tsx` run the keys
of the bar and of Copy link, also where their controls do not show or
cannot take a click. `KeyHints.test.tsx` checks the hints in a browser tab
and in the phone layout, also those of the bar and of the label of the
number. `pressHintKey` presses the key of the keymap with the changes of
the account. `PageEscape.test.tsx` checks when Escape is free for the
page, and
`../workspace/files/TemporaryTabEscape.test.tsx` closes the temporary tab
with it.

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
  `useShortcutKeymap`, `useShortcutKeyOf`, and `useShortcutKey`.
- [page-escape.ts](page-escape.ts): `usePageEscape`, the Escape action of
  the page.
- [shortcut-hints.tsx](shortcut-hints.tsx): `useShortcutHint`,
  `useAriaShortcut`, `shortcutTip`, `shortcutLabels`,
  `useShortcutLabelsOf`, and `ShortcutTip`.
- [PaletteKeys.tsx](../palette/PaletteKeys.tsx): the keys of the commands
  that the palette lists.
- [bar-keys.tsx](../workspace/github/bar-keys.tsx): `BarKeys`, the keys of
  the pull request bar.
- [shortcut-test-kit.tsx](shortcut-test-kit.tsx): `pressShortcut`,
  `pressCommand`, `pressHintKey`, `serveShortcutChanges`, `keysHeardBy`,
  and `OfferedCommand`.

### Related Docs

- [Keyboard shortcuts](../../../docs/protocol/keyboard-shortcuts.md)
- [Keyboard shortcuts: the keys](../../../docs/protocol/keyboard-shortcuts-keys.md)
- [Keyboard shortcuts: fixed keys and text keys](../../../docs/protocol/keyboard-shortcuts-fixed-keys.md)
- [Keyboard shortcuts: the hosts](../../../docs/protocol/keyboard-shortcuts-hosts.md)
- [Keyboard shortcuts: the settings tab](../../../docs/protocol/keyboard-shortcuts-tab.md)
- [Command palette](../../../docs/protocol/command-palette.md)
