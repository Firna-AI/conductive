import type { Shortcut } from '../components/common/KeyChips'
import {
  fixed,
  fixedGroups,
  focusedKeys,
  type FixedRow,
} from './fixedShortcuts'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

type Digit = (typeof digits)[number]

/** A command that a person can give their own shortcuts. */
export type CommandId =
  | 'command-palette'
  | 'keyboard-shortcuts'
  | 'account-page'
  | 'create-org'
  | 'toggle-sidebar'
  | 'toggle-right-column'
  | 'back'
  | 'forward'
  | 'workspace-list'
  | 'previous-tab'
  | 'next-tab'
  | 'close-tab'
  | 'reopen-session'
  | `org-${Digit}`
  | 'repositories-settings'
  | 'new-workspace'
  | 'new-section'
  | 'archive-workspace'
  | `workspace-${Digit}`
  | 'previous-workspace'
  | 'next-workspace'
  | 'next-needs-input'
  | 'go-to-all-files'
  | 'go-to-changes'
  | 'go-to-checks'
  | 'go-to-terminal'
  | 'go-to-preview'
  | 'new-session'
  | 'session-history'
  | 'focus-message'
  | 'attach-files'
  | 'model-picker'
  | 'next-effort'
  | 'stop-agent'

/**
 * A command and its default shortcuts on a Mac. `words` are more words
 * that a search of the tab finds it by, which the row does not show.
 */
export type CommandRow = {
  kind: 'command'
  id: CommandId
  label: string
  keys: readonly Shortcut[]
  words?: readonly string[]
}

/**
 * A row of the Keyboard shortcuts tab: a command that a person can change,
 * or a fixed shortcut.
 */
export type ShortcutRow = CommandRow | FixedRow

export type ShortcutGroup = {
  label: string
  description?: string
  rows: readonly ShortcutRow[]
}

/** A command holds at most four shortcuts. */
export const shortcutLimit = 4

/**
 * The words that a person may search for and that the label of a command
 * lacks. A command that the palette also lists has the palette's words.
 */
const commandWords: Partial<Record<CommandId, readonly string[]>> = {
  'command-palette': ['search'],
  'keyboard-shortcuts': ['keys', 'hotkeys', 'keybindings'],
  'account-page': ['settings', 'preferences'],
  'create-org': ['new', 'team'],
  'previous-tab': ['session'],
  'next-tab': ['session'],
  'close-tab': ['session'],
  'reopen-session': ['tab'],
  'repositories-settings': ['github'],
  'new-workspace': ['create', 'task'],
  'new-section': ['group'],
  'go-to-checks': ['ci'],
  'go-to-preview': ['port'],
  'new-session': ['tab', 'agent', 'chat'],
  'session-history': ['closed', 'reopen'],
  'attach-files': ['upload'],
  'stop-agent': ['cancel'],
}

function command(
  id: CommandId,
  label: string,
  ...keys: Shortcut[]
): CommandRow {
  return { kind: 'command', id, label, keys, words: commandWords[id] }
}

/** The nine commands that open the org or the workspace at a place. */
function numbered(
  prefix: 'org' | 'workspace',
  label: string,
  modifier: '⌃' | '⌘',
): CommandRow[] {
  return digits.map((digit) =>
    command(`${prefix}-${digit}`, `${label} ${digit}`, `${modifier}${digit}`),
  )
}

/**
 * The groups of the tab in the Mac app, with Conductor's keys as the
 * defaults, and a second key where a browser tab keeps Conductor's key.
 * The commands that a person can change come first. The fixed shortcuts
 * of a group follow them, and the groups of fixed shortcuts close the
 * list.
 */
export const shortcutGroups: readonly ShortcutGroup[] = [
  {
    label: 'General',
    rows: [
      command('command-palette', 'Command palette', '⌘K'),
      command('keyboard-shortcuts', 'Keyboard shortcuts', '⌥⌘/'),
      command('account-page', 'Account page', '⌘,'),
      command('create-org', 'Create org'),
      fixed('Close a dialog or a menu', 'Esc'),
    ],
  },
  {
    label: 'View',
    rows: [
      command('toggle-sidebar', 'Hide or show the sidebar', '⌘B'),
      command('toggle-right-column', 'Hide or show the right column', '⌥⌘B'),
    ],
  },
  {
    label: 'Navigation',
    description: 'The orgs count from the top of the rail.',
    rows: [
      command('back', 'Back', '⌘['),
      command('forward', 'Forward', '⌘]'),
      command('workspace-list', 'Workspace list', '⇧⌘H'),
      command('previous-tab', 'Previous tab', '⌃⇧Tab', '⇧⌘[', '⌥⌘←', '⌥⌘['),
      command('next-tab', 'Next tab', '⌃Tab', '⇧⌘]', '⌥⌘→', '⌥⌘]'),
      command('close-tab', 'Close tab', '⌘W', '⌥⌘W'),
      command('reopen-session', 'Reopen closed session', '⇧⌘T', '⌥⇧⌘T'),
      ...numbered('org', 'Switch to org', '⌃'),
      command('repositories-settings', 'Repositories settings', '⌥⌘A'),
    ],
  },
  {
    label: 'Workspace',
    description: 'The workspaces count from the top of the list.',
    rows: [
      command('new-workspace', 'New workspace', '⌘N', '⌥⌘N'),
      command('new-section', 'New section'),
      command('archive-workspace', 'Archive workspace', '⇧⌘A'),
      ...numbered('workspace', 'Open workspace', '⌘'),
      command('previous-workspace', 'Previous workspace', '⌥⌘↑', '⌃⌘↑'),
      command('next-workspace', 'Next workspace', '⌥⌘↓', '⌃⌘↓'),
      command('next-needs-input', 'Next workspace that needs input', '⌥⌘L'),
      command('go-to-all-files', 'Go to All files'),
      command('go-to-changes', 'Go to Changes', '⌥⌘U'),
      command('go-to-checks', 'Go to Checks'),
      command('go-to-terminal', 'Go to Terminal', '⌘J'),
      command('go-to-preview', 'Go to Preview'),
      ...focusedKeys,
    ],
  },
  {
    label: 'Chat',
    rows: [
      command('new-session', 'New session', '⌘T', '⌥⌘T'),
      command('session-history', 'Session history'),
      command('focus-message', 'Focus the message field', '⌘L', '⇧⌘L'),
      command('attach-files', 'Attach files', '⌘U'),
      command('model-picker', 'Model picker', '⌘/'),
      command('next-effort', 'Next effort level', '⇧⌘/'),
      command('stop-agent', 'Stop the agent', '⇧⌘⌫'),
      fixed('Send', 'Enter'),
      fixed('New line', '⇧Enter'),
    ],
  },
  ...fixedGroups,
]

const rows = shortcutGroups.flatMap((group) => group.rows)

const commandRows = rows.filter(
  (row): row is CommandRow => row.kind === 'command',
)

/** The default shortcuts of a command on a Mac. */
export function defaultShortcuts(id: CommandId): readonly Shortcut[] {
  return commandRows.find((row) => row.id === id)?.keys ?? []
}

/** The command that opens the org at a place in the rail, from 0. */
export function orgCommand(index: number): CommandId | undefined {
  const digit = digits[index]
  return digit === undefined ? undefined : `org-${digit}`
}

/** The label of a command, as the tab shows it. */
export function commandLabel(id: CommandId): string {
  return commandRows.find((row) => row.id === id)?.label ?? id
}

/** The fixed shortcut that a key is, such as Hide Conductive for ⌘H. */
export function fixedLabel(shortcut: Shortcut): string | undefined {
  return rows.find((row) => row.kind === 'fixed' && row.keys.includes(shortcut))
    ?.label
}
