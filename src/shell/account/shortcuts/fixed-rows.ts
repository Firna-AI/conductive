import { productName } from '../../../../docs/mockups/src/brand'
import type { ShortcutCommand } from '../../../app/shortcuts/commands'
import {
  readShortcutKeyText,
  type ShortcutKeyboard,
  type ShortcutKeyText,
} from '../../../shared/shortcut-key'

/**
 * A fixed key as the Keyboard shortcuts tab lists it: a key that the app,
 * the system, or a menu of the Mac app owns, so that no person can give it
 * to a command. Each keyboard has its own keys, and a row without keys on
 * a keyboard does not show there. `words` are more words that the search
 * finds the row by. `only` keeps a row to the Mac app.
 */
export interface FixedRow {
  readonly label: string
  readonly keys: Readonly<Record<ShortcutKeyboard, readonly ShortcutKeyText[]>>
  readonly words: readonly string[]
  readonly only?: 'mac-app'
}

/** A group of the tab that holds only fixed keys. */
export interface FixedGroup {
  readonly label: string
  /** The line under the title, in place of "Fixed shortcut" on each row. */
  readonly description: string
  readonly rows: readonly FixedRow[]
  readonly only?: 'mac-app'
}

/** A fixed row, with the same keys on both keyboards unless it names them. */
function fixed(
  label: string,
  mac: readonly string[],
  other: readonly string[] = mac,
  words: readonly string[] = [],
): FixedRow {
  return {
    label,
    keys: {
      mac: mac.map(readShortcutKeyText),
      other: other.map(readShortcutKeyText),
    },
    words,
  }
}

/** More words that find the keys of a focused divider. */
const dividerWords = [
  'move',
  'resize',
  'panel',
  'sidebar',
  'right column',
  'split',
  'tools',
]

/**
 * The fixed rows that follow the commands of a group: Escape and the keys
 * that press a focused button, the menu of a focused tab, the keys of a
 * focused workspace row and of a focused divider, and the keys of the
 * message field. Enter is fixed with every modifier, but only the rows of
 * the message field list Enter with one: Send with ⌘Enter or Ctrl+Enter,
 * and New line with Shift+Enter. So the recorder names another, such as
 * ⇧⌘Enter, only as fixed.
 */
export const commandGroupRows: Readonly<
  Partial<Record<ShortcutCommand['group'], readonly FixedRow[]>>
> = {
  General: [
    fixed('Close a dialog or a menu', ['Escape']),
    fixed('Press a focused button', ['Enter', 'Space'], undefined, [
      'click',
      'toggle',
      'checkbox',
      'switch',
    ]),
  ],
  Navigation: [
    fixed(
      'Open the menu of a focused tab',
      ['Shift+F10', 'ContextMenu'],
      undefined,
      ['context', 'right-click'],
    ),
  ],
  Workspace: [
    fixed(
      'Move a focused workspace up or down',
      ['Alt+ArrowUp', 'Alt+ArrowDown'],
      undefined,
      ['reorder'],
    ),
    fixed(
      'Move a focused divider',
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
      undefined,
      dividerWords,
    ),
    fixed(
      'Move a focused divider in bigger steps',
      [
        'Shift+ArrowLeft',
        'Shift+ArrowRight',
        'Shift+ArrowUp',
        'Shift+ArrowDown',
      ],
      undefined,
      dividerWords,
    ),
    fixed(
      'Make the panel of a focused divider smallest or largest',
      ['Home', 'End'],
      undefined,
      dividerWords,
    ),
  ],
  Chat: [
    fixed('Send', ['Enter', 'Meta+Enter'], ['Enter', 'Ctrl+Enter']),
    fixed('New line', ['Shift+Enter']),
  ],
}

/**
 * The text keys of each system that a person could record by mistake. The
 * rows group the keys that move or delete by word or by line. The Mac app
 * adds Paste and match style from its Edit menu.
 */
const textRows: readonly FixedRow[] = [
  fixed('Undo', ['Meta+Z'], ['Ctrl+Z', 'Alt+Backspace']),
  fixed(
    'Redo',
    ['Shift+Meta+Z'],
    ['Ctrl+Y', 'Ctrl+Shift+Z', 'Alt+Shift+Backspace'],
  ),
  fixed('Cut', ['Meta+X'], ['Ctrl+X', 'Shift+Delete']),
  fixed('Copy', ['Meta+C'], ['Ctrl+C', 'Ctrl+Insert']),
  fixed('Paste', ['Meta+V'], ['Ctrl+V', 'Shift+Insert']),
  {
    ...fixed('Paste and match style', ['Alt+Shift+Meta+V'], []),
    only: 'mac-app',
  },
  fixed('Paste as plain text', [], ['Ctrl+Shift+V']),
  fixed('Select all', ['Meta+A'], ['Ctrl+A']),
  fixed(
    'Move by word',
    ['Alt+ArrowLeft', 'Alt+ArrowRight'],
    ['Ctrl+ArrowLeft', 'Ctrl+ArrowRight'],
    ['cursor'],
  ),
  fixed(
    'Move to the start or end of a line',
    ['Meta+ArrowLeft', 'Meta+ArrowRight', 'Ctrl+A', 'Ctrl+E'],
    [],
    ['cursor'],
  ),
  fixed(
    'Move to the start or end of the text',
    ['Meta+ArrowUp', 'Meta+ArrowDown'],
    ['Ctrl+Home', 'Ctrl+End'],
    ['cursor'],
  ),
  fixed(
    'Delete by word',
    ['Alt+Backspace', 'Alt+Delete'],
    ['Ctrl+Backspace', 'Ctrl+Delete'],
  ),
  fixed(
    'Delete to the start or end of a line',
    ['Meta+Backspace', 'Meta+Delete', 'Ctrl+K'],
    [],
  ),
  fixed('Save a rename', ['Enter']),
  fixed('Cancel a rename', ['Escape']),
]

/** The line of a group whose every key is fixed. */
const fixedLine = 'These shortcuts are fixed.'

/** The groups that hold only fixed keys. They close the list. */
export const fixedGroups: readonly FixedGroup[] = [
  {
    label: 'Menus and palette',
    description: fixedLine,
    rows: [
      fixed('Move up or down', ['ArrowUp', 'ArrowDown']),
      fixed('First or last item', ['Home', 'End']),
      fixed('Run the item', ['Enter']),
      fixed('Switch the palette tab', ['ArrowLeft', 'ArrowRight']),
    ],
  },
  {
    label: 'Text',
    description:
      'These shortcuts are fixed, and so are the other keys that edit or move in text.',
    rows: textRows,
  },
  {
    label: 'Mac app',
    description: fixedLine,
    only: 'mac-app',
    rows: [
      fixed(`Hide ${productName}`, ['Meta+H'], []),
      fixed('Hide others', ['Alt+Meta+H'], []),
      fixed(`Quit ${productName}`, ['Meta+Q'], []),
      fixed('Reload', ['Meta+R'], []),
      fixed('Force reload', ['Shift+Meta+R'], []),
      fixed('Developer tools', ['Alt+Meta+I'], []),
      fixed('Actual size', ['Meta+0'], []),
      fixed('Zoom in', ['Meta++'], []),
      fixed('Zoom out', ['Meta+-'], []),
      fixed('Full screen', ['Ctrl+Meta+F'], []),
      fixed('Minimize', ['Meta+M'], []),
    ],
  },
]
