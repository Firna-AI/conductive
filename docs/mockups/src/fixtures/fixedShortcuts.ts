import { productName } from '../brand'
import type { Shortcut } from '../components/common/KeyChips'

/**
 * A fixed shortcut, which the app or the menus of the Mac app own, so a
 * person cannot change it. `words` are more words that a search of the tab
 * finds it by, which the row does not show.
 */
export type FixedRow = {
  kind: 'fixed'
  label: string
  keys: readonly Shortcut[]
  words?: readonly string[]
}

export function fixed(label: string, ...keys: Shortcut[]): FixedRow {
  return { kind: 'fixed', label, keys }
}

/** More words that find the keys of a focused divider. */
const dividerWords = ['move', 'resize', 'panel', 'sidebar', 'right column']

/**
 * The keys of a focused workspace row and of a focused divider. The row
 * moves on ⌥ with no other modifier, and the divider on the arrows alone or
 * with ⇧, so each shortcut with ⌘ still runs its command there.
 */
export const focusedKeys: readonly FixedRow[] = [
  {
    ...fixed('Move a focused workspace up or down', '⌥↑', '⌥↓'),
    words: ['reorder'],
  },
  {
    ...fixed('Move a focused divider left or right', '←', '→'),
    words: dividerWords,
  },
  {
    ...fixed('Move a focused divider in bigger steps', '⇧←', '⇧→'),
    words: dividerWords,
  },
  {
    ...fixed(
      'Make the panel of a focused divider narrowest or widest',
      'Home',
      'End',
    ),
    words: dividerWords,
  },
]

/** The groups that hold only fixed shortcuts. They close the list. */
export const fixedGroups: readonly {
  label: string
  rows: readonly FixedRow[]
}[] = [
  {
    label: 'Menus and palette',
    rows: [
      fixed('Move up or down', '↑', '↓'),
      fixed('First or last item', 'Home', 'End'),
      fixed('Run the item', 'Enter'),
      fixed('Switch the palette tab', '←', '→'),
    ],
  },
  {
    label: 'Text',
    rows: [
      fixed('Undo', '⌘Z'),
      fixed('Redo', '⇧⌘Z'),
      fixed('Cut', '⌘X'),
      fixed('Copy', '⌘C'),
      fixed('Paste', '⌘V'),
      fixed('Paste and match style', '⌥⇧⌘V'),
      fixed('Select all', '⌘A'),
      fixed('Save a rename', 'Enter'),
      fixed('Cancel a rename', 'Esc'),
    ],
  },
  {
    label: 'Mac app',
    rows: [
      fixed(`Hide ${productName}`, '⌘H'),
      fixed('Hide others', '⌥⌘H'),
      fixed(`Quit ${productName}`, '⌘Q'),
      fixed('Reload', '⌘R'),
      fixed('Force reload', '⇧⌘R'),
      fixed('Developer tools', '⌥⌘I'),
      fixed('Actual size', '⌘0'),
      fixed('Zoom in', '⌘+'),
      fixed('Zoom out', '⌘-'),
      fixed('Full screen', '⌃⌘F'),
      fixed('Minimize', '⌘M'),
    ],
  },
]
