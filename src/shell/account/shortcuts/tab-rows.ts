import { productName } from '../../../../docs/mockups/src/brand'
import { matchRank, searchWords } from '../../../app/palette/matcher'
import { shortcutKeyAvailability } from '../../../app/shortcuts/browser-keys'
import {
  shortcutCommands,
  type ShortcutCommand,
} from '../../../app/shortcuts/commands'
import { commandInHost } from '../../../app/shortcuts/defaults'
import type { ShortcutHost } from '../../../app/shortcuts/host'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import { commandGroupRows, fixedGroups, type FixedRow } from './fixed-rows'

/**
 * A row of the Keyboard shortcuts tab: a command that a person can change,
 * or a fixed key with its keys on the keyboard of the device.
 */
type TabRow =
  | { readonly kind: 'command'; readonly command: ShortcutCommand }
  | {
      readonly kind: 'fixed'
      readonly label: string
      readonly words: readonly string[]
      readonly keys: readonly ShortcutKeyText[]
    }

export interface TabGroup {
  readonly label: string
  /** The line under the title, such as how the orgs count. */
  readonly description?: string
  /** Every row is fixed, so the group says so once, and no row does. */
  readonly fixed: boolean
  readonly rows: readonly TabRow[]
}

/** The groups of the commands, in the order of Conductor. */
const commandGroups: readonly ShortcutCommand['group'][] = [
  'General',
  'View',
  'Navigation',
  'Workspace',
  'Chat',
]

const groupLines: Readonly<Partial<Record<ShortcutCommand['group'], string>>> =
  {
    Navigation: 'The orgs count from the top of the rail.',
    Workspace: 'The workspaces count from the top of the list.',
  }

/** The fixed rows that the host shows, with the keys of the keyboard. */
function fixedRows(
  rows: readonly FixedRow[],
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): TabRow[] {
  return rows.flatMap((row) => {
    const keys = row.keys[keyboard]
    if (keys.length === 0) return []
    if (row.only === 'mac-app' && host.kind !== 'mac-app') return []
    return [{ kind: 'fixed', label: row.label, words: row.words, keys }]
  })
}

/**
 * The groups of the tab in a host, with the keys of the keyboard of the
 * device. In each group of commands, the fixed keys of the group follow
 * the commands. The groups of fixed keys close the list. A browser leaves
 * out the rows and the group that only the Mac app has.
 */
export function shortcutGroups(
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): TabGroup[] {
  const commands = commandGroups.map((label) => ({
    label,
    description: groupLines[label],
    fixed: false,
    rows: [
      ...shortcutCommands
        .filter(
          (command) =>
            command.group === label && commandInHost(command.id, host),
        )
        .map((command): TabRow => ({ kind: 'command', command })),
      ...fixedRows(commandGroupRows[label] ?? [], keyboard, host),
    ],
  }))
  const fixed = fixedGroups
    .filter((group) => group.only !== 'mac-app' || host.kind === 'mac-app')
    .map((group) => ({
      label: group.label,
      description: group.description,
      fixed: true,
      rows: fixedRows(group.rows, keyboard, host),
    }))
  return [...commands, ...fixed].filter((group) => group.rows.length > 0)
}

/** The texts of a row that the search looks at: its label and its words. */
function rowTexts(row: TabRow): readonly string[] {
  return row.kind === 'command'
    ? [row.command.label, ...row.command.words]
    : [row.label, ...row.words]
}

/**
 * The groups with the rows that the query matches, in their order. A row
 * matches as a row of the palette does: each word of the query is in its
 * label or in its words. A group without such a row hides. An empty query
 * matches every row.
 */
export function matchingGroups(
  query: string,
  groups: readonly TabGroup[],
): TabGroup[] {
  const words = searchWords(query)
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => matchRank(words, rowTexts(row)) !== null,
      ),
    }))
    .filter((group) => group.rows.length > 0)
}

/**
 * The label of the one fixed row of the keyboard that holds the key, or
 * none when several rows share it, such as Enter, or when no row lists it,
 * such as ⌃T. The recorder names such a key only as fixed. A row that only
 * the Mac app lists names its key in a browser too, such as Hide
 * Conductive for ⌘H, because each keyboard has one list of fixed keys.
 */
export function fixedKeyLabel(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
): string | undefined {
  const rows = [
    ...Object.values(commandGroupRows).flat(),
    ...fixedGroups.flatMap((group) => group.rows),
  ]
  const holders = rows.filter((row) => row.keys[keyboard].includes(key))
  return holders.length === 1 ? holders[0]?.label : undefined
}

/**
 * The label of a command, also of a command that this host does not show,
 * such as Hide or show the sidebar in a browser.
 */
export function commandLabel(id: ShortcutCommandId): string {
  return (
    shortcutCommands.find((command) => command.id === id)?.label ??
    'Another command'
  )
}

/** The browsers that install the app in its own window. */
const installers = { chrome: 'Chrome', edge: 'Edge' } as const

/**
 * Where the dimmed keys of a normal browser tab work, or none in another
 * host: in the Mac app on a Mac, and in the app that Chrome or Edge
 * installs. A browser that installs no app names Chrome and Edge off a Mac.
 */
export function dimmedKeysLine(
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): string | undefined {
  if (host.kind !== 'browser-tab') return undefined
  const installer =
    host.browser === 'chrome' || host.browser === 'edge'
      ? installers[host.browser]
      : undefined
  const places = [
    keyboard === 'mac' ? 'the Mac app' : undefined,
    installer ? `${productName} installed from ${installer}` : undefined,
  ].filter((place) => place !== undefined)
  if (places.length === 0) {
    return `Dimmed keys work in ${productName} installed from Chrome or Edge.`
  }
  return `Dimmed keys work in ${places.join(' or in ')}.`
}

/** The names of the browsers, for a key that a browser keeps in a tab. */
const browserNames = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
  unknown: 'the browser',
} as const

/** The browser where a key does not work in this tab, so the key is dimmed. */
export function keptBy(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): string | undefined {
  if (host.kind !== 'browser-tab') return undefined
  return shortcutKeyAvailability(key, keyboard, host) === 'available'
    ? undefined
    : browserNames[host.browser]
}
