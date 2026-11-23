import type { Shortcut } from '../../../../src/ui/components/common/KeyChips'
import { sendFeedbackLabel } from '../../../../src/ui/components/feedback/feedbackCopy'
import {
  agentActionLabels,
  type CommandAgentAction,
} from '../../../../src/ui/components/workspace/barCopy'
import { mergeLatestCommandLabel } from '../../../../src/ui/components/workspace/mergeLatestCopy'
import { transcriptItems } from '../../../../src/ui/components/workspace/transcriptCopy'
import {
  fixed,
  fixedGroups,
  focusedButtonKeys,
  focusedKeys,
  messageKeys,
  tabMenuKeys,
  type FixedSpec,
} from './fixedShortcuts'
import { commandWords } from './shortcutWords'

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
  | 'copy-link'
  | `workspace-${Digit}`
  | 'previous-workspace'
  | 'next-workspace'
  | 'next-needs-input'
  | 'create-pull-request'
  | 'fix-checks'
  | 'resolve-conflicts'
  | 'merge-latest'
  | 'address-review'
  | 'commit-and-push'
  | 'mark-ready-for-review'
  | 'merge-pull-request'
  | 'continue-after-merge'
  | 'open-pull-request'
  | 'go-to-all-files'
  | 'go-to-changes'
  | 'go-to-checks'
  | 'go-to-terminal'
  | 'go-to-preview'
  | 'new-terminal'
  | 'new-session'
  | 'session-history'
  | 'focus-message'
  | 'attach-files'
  | 'model-picker'
  | 'next-effort'
  | 'fast-mode'
  | 'stop-agent'
  | 'copy-concise-transcript'
  | 'copy-full-transcript'

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

function command(
  id: CommandId,
  label: string,
  mac: readonly Shortcut[] = [],
): CommandSpec {
  return { kind: 'command', id, label, mac, words: commandWords[id] }
}

/** A command that only the Mac app offers. */
function macAppCommand(
  id: CommandId,
  label: string,
  mac: readonly Shortcut[] = [],
): CommandSpec {
  return { ...command(id, label, mac), only: 'mac-app' }
}

/** An agent action of the pull request bar, with the label of its button. */
function agentCommand(
  id: CommandAgentAction,
  mac: readonly Shortcut[] = [],
): CommandSpec {
  return command(id, agentActionLabels[id], mac)
}

/** The nine commands that open the org or the workspace at a place. */
function numbered(
  prefix: 'org' | 'workspace',
  label: string,
  keys: (digit: Digit) => readonly Shortcut[],
): CommandSpec[] {
  return digits.map((digit) =>
    command(`${prefix}-${digit}`, `${label} ${digit}`, keys(digit)),
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
 * to ⌃⌘/ and Stop the agent to ⌃⌘⌫. Decision 199 C of 11 November 2026 adds
 * Copy link, the actions of the pull request bar, Copy concise transcript,
 * and Copy full transcript. Firefox keeps ⇧⌘P, so Create PR also has
 * ⌥⇧⌘P, and Firefox switches the text direction of a text field on ⇧⌘X, so
 * Fix checks has ⌥⌘X. Fast mode decision 258 C of 12 November 2026 adds Fast
 * mode, the switch of the model menu, with ⇧⌘E, the key of Conductor.
 * Terminal tabs decision 3 B adds New terminal after Go to Preview, with no
 * default key: Conductor's ⌘T for a new terminal runs New session here.
 * Merge latest decision 2 A of 17 November 2026 adds Merge latest target
 * branch, with no default key. The commands that a person can change come
 * first.
 * The fixed shortcuts of a group follow them, and the groups of fixed
 * shortcuts close the list.
 */
export const shortcutSpecs: readonly GroupSpec[] = [
  {
    label: 'General',
    rows: [
      command('command-palette', 'Command palette', [['⌘', 'K']]),
      command('keyboard-shortcuts', 'Keyboard shortcuts', [['⌥', '⌘', '/']]),
      command('account-page', 'Account page', [['⌘', ',']]),
      command('create-org', 'Create org'),
      command('send-feedback', sendFeedbackLabel, [['⌥', '⌘', 'F']]),
      fixed('Close a dialog or a menu', [['Esc']]),
      focusedButtonKeys,
    ],
  },
  {
    label: 'View',
    rows: [
      command('toggle-sidebar', 'Hide or show the sidebar', [
        ['⌘', 'B'],
        ['['],
      ]),
      command('toggle-right-column', 'Hide or show the right column', [
        ['⌥', '⌘', 'B'],
        [']'],
      ]),
    ],
  },
  {
    label: 'Navigation',
    description: 'The orgs count from the top of the rail.',
    rows: [
      macAppCommand('back', 'Back', [['⌘', '[']]),
      macAppCommand('forward', 'Forward', [['⌘', ']']]),
      command('workspace-list', 'Workspace list', [['⇧', '⌘', 'H']]),
      command('previous-tab', 'Previous tab', [
        ['⌃', '⇧', 'Tab'],
        ['⇧', '⌘', '['],
        ['⌥', '⌘', '←'],
        ['⌥', '⌘', '['],
      ]),
      command('next-tab', 'Next tab', [
        ['⌃', 'Tab'],
        ['⇧', '⌘', ']'],
        ['⌥', '⌘', '→'],
        ['⌥', '⌘', ']'],
      ]),
      command('close-tab', 'Close tab', [
        ['⌘', 'W'],
        ['⌥', '⌘', 'W'],
      ]),
      command('reopen-session', 'Reopen closed session', [
        ['⇧', '⌘', 'T'],
        ['⌥', '⇧', '⌘', 'T'],
      ]),
      ...numbered('org', 'Switch to org', (digit) => [['⌃', digit]]),
      command('repositories-settings', 'Repositories settings', [
        ['⌥', '⌘', 'A'],
      ]),
      {
        ...fixed('Close the temporary tab', [['Esc']]),
        words: ['italic', 'file'],
      },
      tabMenuKeys,
    ],
  },
  {
    label: 'Workspace',
    description: 'The workspaces count from the top of the list.',
    rows: [
      command('new-workspace', 'New workspace', [
        ['⌘', 'N'],
        ['⌥', '⌘', 'N'],
      ]),
      command('new-section', 'New section'),
      command('archive-workspace', 'Archive workspace', [['⇧', '⌘', 'A']]),
      command('restore-workspace', 'Restore workspace'),
      command('copy-link', 'Copy link', [['⇧', '⌘', 'C']]),
      ...numbered('workspace', 'Open workspace', (digit) => [
        ['⌘', digit],
        ['⌥', '⌘', digit],
      ]),
      command('previous-workspace', 'Previous workspace', [
        ['⌥', '⌘', '↑'],
        ['⌃', '⌘', '↑'],
      ]),
      command('next-workspace', 'Next workspace', [
        ['⌥', '⌘', '↓'],
        ['⌃', '⌘', '↓'],
      ]),
      command('next-needs-input', 'Next workspace that needs input', [
        ['⌥', '⌘', 'L'],
      ]),
      agentCommand('create-pull-request', [
        ['⇧', '⌘', 'P'],
        ['⌥', '⇧', '⌘', 'P'],
      ]),
      agentCommand('fix-checks', [['⌥', '⌘', 'X']]),
      agentCommand('resolve-conflicts'),
      command('merge-latest', mergeLatestCommandLabel),
      agentCommand('address-review'),
      agentCommand('commit-and-push', [['⇧', '⌘', 'Y']]),
      command('mark-ready-for-review', 'Mark PR ready for review'),
      command('merge-pull-request', 'Merge PR', [['⇧', '⌘', 'M']]),
      command('continue-after-merge', 'Continue after merge'),
      command('open-pull-request', 'Open PR on GitHub', [['⇧', '⌘', 'G']]),
      command('go-to-all-files', 'Go to All files'),
      command('go-to-changes', 'Go to Changes', [['⌥', '⌘', 'U']]),
      command('go-to-checks', 'Go to Checks'),
      command('go-to-terminal', 'Go to Terminal', [['⌘', 'J']]),
      command('go-to-preview', 'Go to Preview'),
      command('new-terminal', 'New terminal'),
      ...focusedKeys,
    ],
  },
  {
    label: 'Chat',
    rows: [
      command('new-session', 'New session', [
        ['⌘', 'T'],
        ['⌥', '⌘', 'T'],
      ]),
      command('session-history', 'Session history'),
      command('focus-message', 'Focus the message field', [
        ['⌘', 'L'],
        ['⇧', '⌘', 'L'],
      ]),
      command('attach-files', 'Attach files', [['⌘', 'U']]),
      command('model-picker', 'Model picker', [['⌘', '/']]),
      command('next-effort', 'Next effort level', [['⌃', '⌘', '/']]),
      command('fast-mode', 'Fast mode', [['⇧', '⌘', 'E']]),
      command('stop-agent', 'Stop the agent', [['⌃', '⌘', '⌫']]),
      command('copy-concise-transcript', transcriptItems.concise, [
        ['⌥', '⌘', 'C'],
      ]),
      command('copy-full-transcript', transcriptItems.full),
      ...messageKeys,
    ],
  },
  ...fixedGroups,
]
