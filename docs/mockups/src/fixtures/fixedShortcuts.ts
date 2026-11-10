import { productName } from '../brand'
import type { Shortcut } from '../components/common/KeyChips'

/**
 * A fixed shortcut, which the app, the system, or the menus of the Mac app
 * own, so a person cannot change it. It has its keys on a Mac and on
 * Windows, and a row without keys on a keyboard does not show there.
 * `words` are more words that a search of the tab finds it by, which the
 * row does not show. `only` keeps a row to the Mac app.
 */
export type FixedSpec = {
  kind: 'fixed'
  label: string
  mac: readonly Shortcut[]
  windows: readonly Shortcut[]
  words?: readonly string[]
  only?: 'mac-app'
}

/** A fixed shortcut as the tab shows it, with the keys of one keyboard. */
export type FixedRow = {
  kind: 'fixed'
  label: string
  keys: readonly Shortcut[]
  words?: readonly string[]
}

/** A group of the tab that holds only fixed shortcuts. */
export type FixedGroupSpec = {
  label: string
  description?: string
  rows: readonly FixedSpec[]
  only?: 'mac-app'
}

/** A fixed shortcut, with the same keys on Windows unless it names them. */
export function fixed(
  label: string,
  mac: readonly Shortcut[],
  windows: readonly Shortcut[] = mac,
): FixedSpec {
  return { kind: 'fixed', label, mac, windows }
}

/** More words that find the keys of a focused divider. */
const dividerWords = ['move', 'resize', 'panel', 'sidebar', 'right column']

/**
 * The keys of a focused workspace row and of a focused divider (decision
 * 193 D). The row moves on ⌥ or Alt with no other modifier, and the divider
 * on the arrows alone or with Shift, so each shortcut with ⌘, Ctrl, or Alt
 * and Shift still runs its command there.
 */
export const focusedKeys: readonly FixedSpec[] = [
  {
    ...fixed(
      'Move a focused workspace up or down',
      ['⌥↑', '⌥↓'],
      ['Alt+↑', 'Alt+↓'],
    ),
    words: ['reorder'],
  },
  {
    ...fixed('Move a focused divider left or right', ['←', '→']),
    words: dividerWords,
  },
  {
    ...fixed(
      'Move a focused divider in bigger steps',
      ['⇧←', '⇧→'],
      ['Shift+←', 'Shift+→'],
    ),
    words: dividerWords,
  },
  {
    ...fixed('Make the panel of a focused divider narrowest or widest', [
      'Home',
      'End',
    ]),
    words: dividerWords,
  },
]

/** The menu of a focused tab of a workspace opens on ⇧F10 and on the menu key. */
export const tabMenuKeys: FixedSpec = {
  ...fixed(
    'Open the menu of a focused tab',
    ['⇧F10', 'Menu'],
    ['Shift+F10', 'Menu'],
  ),
  words: ['context', 'right-click'],
}

/**
 * The keys that the text fields of each system use to edit and to move in
 * text, which a person could record by mistake. The rows group the keys
 * that move or delete by word or by line. The Mac app adds Paste and match
 * style from its Edit menu.
 */
const textKeys: readonly FixedSpec[] = [
  fixed('Undo', ['⌘Z'], ['Ctrl+Z', 'Alt+Backspace']),
  fixed('Redo', ['⇧⌘Z'], ['Ctrl+Y', 'Ctrl+Shift+Z', 'Alt+Shift+Backspace']),
  fixed('Cut', ['⌘X'], ['Ctrl+X', 'Shift+Delete']),
  fixed('Copy', ['⌘C'], ['Ctrl+C', 'Ctrl+Insert']),
  fixed('Paste', ['⌘V'], ['Ctrl+V', 'Shift+Insert']),
  { ...fixed('Paste and match style', ['⌥⇧⌘V'], []), only: 'mac-app' },
  fixed('Paste as plain text', [], ['Ctrl+Shift+V']),
  fixed('Select all', ['⌘A'], ['Ctrl+A']),
  {
    ...fixed('Move by word', ['⌥←', '⌥→'], ['Ctrl+←', 'Ctrl+→']),
    words: ['cursor'],
  },
  {
    ...fixed(
      'Move to the start or end of a line',
      ['⌘←', '⌘→', '⌃A', '⌃E'],
      [],
    ),
    words: ['cursor'],
  },
  {
    ...fixed(
      'Move to the start or end of the text',
      ['⌘↑', '⌘↓'],
      ['Ctrl+Home', 'Ctrl+End'],
    ),
    words: ['cursor'],
  },
  fixed('Delete by word', ['⌥⌫', '⌥⌦'], ['Ctrl+Backspace', 'Ctrl+Delete']),
  fixed('Delete to the start or end of a line', ['⌘⌫', '⌘⌦', '⌃K'], []),
  fixed('Save a rename', ['Enter']),
  fixed('Cancel a rename', ['Esc']),
]

/** The groups that hold only fixed shortcuts. They close the list. */
export const fixedGroups: readonly FixedGroupSpec[] = [
  {
    label: 'Menus and palette',
    rows: [
      fixed('Move up or down', ['↑', '↓']),
      fixed('First or last item', ['Home', 'End']),
      fixed('Run the item', ['Enter']),
      fixed('Switch the palette tab', ['←', '→']),
    ],
  },
  {
    label: 'Text',
    description:
      'These shortcuts are fixed, and so are the other keys that edit or move in text.',
    rows: textKeys,
  },
  {
    label: 'Mac app',
    only: 'mac-app',
    rows: [
      fixed(`Hide ${productName}`, ['⌘H']),
      fixed('Hide others', ['⌥⌘H']),
      fixed(`Quit ${productName}`, ['⌘Q']),
      fixed('Reload', ['⌘R']),
      fixed('Force reload', ['⇧⌘R']),
      fixed('Developer tools', ['⌥⌘I']),
      fixed('Actual size', ['⌘0']),
      fixed('Zoom in', ['⌘+']),
      fixed('Zoom out', ['⌘-']),
      fixed('Full screen', ['⌃⌘F']),
      fixed('Minimize', ['⌘M']),
    ],
  },
]
