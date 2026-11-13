# Command palette and keys

This guide belongs to [Screens](screens.md). It gives the rules of the
command palette and of the keyboard shortcuts of the app shell. The
[command palette protocol](../../docs/protocol/command-palette.md) and the
[keyboard shortcut protocol](../../docs/protocol/keyboard-shortcuts.md)
state what they do.

- The command palette is a layer of each frame: `PaletteLayer` sits in
  the `OverlayHost` of the frame, and the open palette holds the frame
  inert, as a sheet or a dialog does. Its search field takes the focus,
  and `trapTab` keeps Tab inside. When a control that has the focus goes
  away, such as a filter after a change of the tab, the field takes the
  lost focus back. When the palette closes, the frame is active again
  before the focus goes back.
- Escape closes the palette from its own element, in the capture phase
  of React. An open menu of a filter hears Escape first, on the document,
  and stops it, so Escape closes only that menu. A press outside closes
  the desktop dialog, and Cancel closes the phone page. A change of the
  address and a sign-out close the palette too.
- The palette key is a shortcut. The
  [shortcut layer](../shell/shortcuts/README.md) hears each key through
  `AppServices.onKey`, in the capture phase and not as a passive listener,
  so a key that runs a command stops the browser's own action and reaches
  no element of the page. Every UI kit of the app notes its open menus and
  modal layers through `useMenuLayer` and `useModalLayer` of
  `../shell/ui/layers.ts`: the shell, the chat, and the members UI. A menu
  says whether it closed, and a menu whose change runs refuses. A modal
  layer has an owner: the dialog of the palette has the palette, which
  offers the palette key with that owner. The tools part marks the
  xterm.js screen of the terminal with `useShortcutTerminal`, so the
  screen keeps the keys that its shell reads, and the buttons of the
  Terminal tool keep none.
- Each other command runs from its key where the page offers it, as the
  [shortcut layer](../shell/shortcuts/README.md#the-owners-of-the-commands)
  lists the owners. `PaletteKeys` in each frame offers each command that
  the palette lists, also while the palette is closed, with the action of
  its row. So a key and its row do the same thing, also on a page without
  an org, such as the Account page. A key that would do nothing, such as
  Next tab with one tab, is not offered, so it goes on to the browser.
- The org rail offers Switch to org 1 to 9 while it shows, for each org by
  its place from the top, as its tile opens the org. So the key also opens
  the org of the page. The rail leaves out a deleted org, so no key opens
  one. A page without the rail, such as
  the phone layout, runs no org key, and the palette's Switch to rows only
  show the keys.
- The keymap of the keys and of every hint holds the changes that the
  account holds for the keyboard of the person, so a save of the Keyboard
  shortcuts tab applies at once. While the recorder of that tab shows, no
  key runs a command.
- A held key runs its command once. Its repeats go no further.
- The key hints show the first key of each command that works where the
  page runs: at the end of a row of the palette, in the Search row, and
  in the tooltip of a control that runs a command, as "New session (⌥⌘T)"
  in a Chrome tab on a Mac. Each names its key in `aria-keyshortcuts`. The
  phone layout shows no hint. The tooltip is the `title` of the control,
  because the mockups draw no tooltip of their own. The tabs of All
  files, Changes, and Checks and the Archive of the pull request bar get
  their tooltips as plain props. The drawn hint of an org tile in the rail
  ends with the key chips of the key of its org.
- `PaletteController.show` is the one way to open the palette, for the
  key and for the Search row. It opens only when no dialog or sheet of
  another owner holds the input, and when every open menu closed. The
  key closes an open palette, and does nothing while a dialog or a sheet
  of another owner is open over it, such as the sheet of a filter.
- A part of the page offers its actions to the palette while it shows,
  through `usePaletteOffer`: the workspace screen, the workspace list
  that the page shows, and the sidebar toggle of the Mac app. A row
  closes the palette first. Its action runs once the palette has left
  the page, so a field that the action opens can take the focus, and a
  question shows alone. `useRowAction` gives the action of a row, for a
  row and for the key of its command.
- The palette reads the list and the repositories of its org through
  `OrgModel.watch` while it is open, and shares those reads with the list
  of the page. So the list and the palette show the same failure, and Try
  again in either one reads the list again. The palette has no copy of
  its own. Its Try again reads again each part that failed, through
  `OrgModel.reload`.
- `AppModel.lastOrg` keeps the org that the tab opened last, in memory
  only. The Account sidebar of the Mac app and the palette on a page
  without an org read it through `keptOrg`.
- A workspace row moves on Alt with Up or Down and no other modifier,
  through `workspaceRowMove` of the shortcut model. A key with more
  modifiers, such as ⌥⌘↑, goes to its shortcut.
- While the page shows the workspace list, the keys of Open workspace 1
  to 9, Previous and Next workspace, and Next workspace that needs input
  open its rows, as their links do. They count only the rows that the list
  shows: a collapsed section and a closed Archived group add none. So the
  list keeps whether the Archived group is open. With no open row, as on
  the list page, Next workspace that needs input starts from the top.
