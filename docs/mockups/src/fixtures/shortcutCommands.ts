import type { Shortcut } from '../components/common/KeyChips'
import {
  sendFeedbackLabel,
  sendFeedbackWords,
} from '../components/feedback/feedbackCopy'
import {
  fixed,
  fixedGroups,
  focusedButtonKeys,
  focusedKeys,
  messageKeys,
  tabMenuKeys,
  type FixedSpec,
} from './fixedShortcuts'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

type Digit = (typeof digits)[number]

/** A command that a person can give their own shortcuts. */
export type CommandId =
  | 'command-palette'
  | 'keyboard-shortcuts'
  | 'account-page'
  | 'create-org'
  | 'send-feedback'
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
  | 'restore-workspace'
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
 * A command with its default keys on a Mac. `windowsKeys` holds its keys
 * on Windows and Linux. `only` keeps a command to the Mac app.
 */
export type CommandSpec = {
  kind: 'command'
  id: CommandId
  label: string
  mac: readonly Shortcut[]
  words?: readonly string[]
  only?: 'mac-app'
}

/** A group of the tab, with its commands and its fixed shortcuts. */
export type GroupSpec = {
  label: string
  description?: string
  rows: readonly (CommandSpec | FixedSpec)[]
  only?: 'mac-app'
}

/**
 * The words that a person may search for and that the label of a command
 * lacks. A command that the palette also lists has the palette's words.
 */
const commandWords: Partial<Record<CommandId, readonly string[]>> = {
  'command-palette': ['search'],
  'keyboard-shortcuts': ['keys', 'hotkeys', 'keybindings'],
  'account-page': ['settings', 'preferences'],
  'create-org': ['new', 'team'],
  'send-feedback': sendFeedbackWords,
  'previous-tab': ['session'],
  'next-tab': ['session'],
  'close-tab': ['session'],
  'reopen-session': ['tab'],
  'repositories-settings': ['github'],
  'new-workspace': ['create', 'task'],
  'new-section': ['group'],
  'restore-workspace': ['unarchive'],
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
  ...mac: Shortcut[]
): CommandSpec {
  return { kind: 'command', id, label, mac, words: commandWords[id] }
}

/** A command that only the Mac app offers. */
function macAppCommand(
  id: CommandId,
  label: string,
  key: Shortcut,
): CommandSpec {
  return { ...command(id, label, key), only: 'mac-app' }
}

/** The nine commands that open the org or the workspace at a place. */
function numbered(
  prefix: 'org' | 'workspace',
  label: string,
  keys: (digit: Digit) => Shortcut[],
): CommandSpec[] {
  return digits.map((digit) =>
    command(`${prefix}-${digit}`, `${label} ${digit}`, ...keys(digit)),
  )
}

/** The command that opens the org at a place in the rail, from 0. */
export function orgCommand(index: number): CommandId | undefined {
  const digit = digits[index]
  return digit === undefined ? undefined : `org-${digit}`
}

/**
 * The groups of the tab, with Conductor's keys as the defaults on a Mac,
 * and a second key where a browser tab keeps Conductor's key (decisions 191
 * and 192 B). The key research of 10 November 2026 moved Next effort level
 * to ⌃⌘/ and Stop the agent to ⌃⌘⌫. The commands that a person can change
 * come first. The fixed shortcuts of a group follow them, and the groups of
 * fixed shortcuts close the list.
 */
export const shortcutSpecs: readonly GroupSpec[] = [
  {
    label: 'General',
    rows: [
      command('command-palette', 'Command palette', '⌘K'),
      command('keyboard-shortcuts', 'Keyboard shortcuts', '⌥⌘/'),
      command('account-page', 'Account page', '⌘,'),
      command('create-org', 'Create org'),
      command('send-feedback', sendFeedbackLabel),
      fixed('Close a dialog or a menu', ['Esc']),
      focusedButtonKeys,
    ],
  },
  {
    label: 'View',
    rows: [
      macAppCommand('toggle-sidebar', 'Hide or show the sidebar', '⌘B'),
      command('toggle-right-column', 'Hide or show the right column', '⌥⌘B'),
    ],
  },
  {
    label: 'Navigation',
    description: 'The orgs count from the top of the rail.',
    rows: [
      macAppCommand('back', 'Back', '⌘['),
      macAppCommand('forward', 'Forward', '⌘]'),
      command('workspace-list', 'Workspace list', '⇧⌘H'),
      command('previous-tab', 'Previous tab', '⌃⇧Tab', '⇧⌘[', '⌥⌘←', '⌥⌘['),
      command('next-tab', 'Next tab', '⌃Tab', '⇧⌘]', '⌥⌘→', '⌥⌘]'),
      command('close-tab', 'Close tab', '⌘W', '⌥⌘W'),
      command('reopen-session', 'Reopen closed session', '⇧⌘T', '⌥⇧⌘T'),
      ...numbered('org', 'Switch to org', (digit) => [`⌃${digit}`]),
      command('repositories-settings', 'Repositories settings', '⌥⌘A'),
      tabMenuKeys,
    ],
  },
  {
    label: 'Workspace',
    description: 'The workspaces count from the top of the list.',
    rows: [
      command('new-workspace', 'New workspace', '⌘N', '⌥⌘N'),
      command('new-section', 'New section'),
      command('archive-workspace', 'Archive workspace', '⇧⌘A'),
      command('restore-workspace', 'Restore workspace'),
      ...numbered('workspace', 'Open workspace', (digit) => [
        `⌘${digit}`,
        `⌥⌘${digit}`,
      ]),
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
      command('next-effort', 'Next effort level', '⌃⌘/'),
      command('stop-agent', 'Stop the agent', '⌃⌘⌫'),
      ...messageKeys,
    ],
  },
  ...fixedGroups,
]
