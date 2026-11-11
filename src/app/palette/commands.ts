import {
  sendFeedbackLabel,
  sendFeedbackWords,
} from '../../../docs/mockups/src/components/feedback/feedbackCopy'
import {
  shortcutDigits,
  type ShortcutCommandId,
} from '../../shared/shortcut-commands'
import type { SettingsTab } from '../router'

/** A command of the palette: an action or a setting that a row runs. */
export interface CommandText {
  label: string
  /** More words that a search finds the command by. The row does not show them. */
  words: readonly string[]
}

/**
 * The actions that a part of the page offers while it shows, in the order
 * of the palette: the open workspace, the workspace list, and the window.
 */
export const offeredActionIds = [
  'new-session',
  'session-history',
  'go-to-all-files',
  'go-to-changes',
  'go-to-checks',
  'go-to-terminal',
  'go-to-preview',
  'go-to-desktop',
  'archive-workspace',
  'restore-workspace',
  'new-section',
  'hide-sidebar',
  'show-sidebar',
] as const

export type OfferedActionId = (typeof offeredActionIds)[number]

/**
 * The actions that the palette makes itself: those that open a page, and
 * Send feedback, which opens the Feedback dialog over each page.
 */
export type OwnActionId =
  'new-workspace' | 'create-org' | 'switch-org' | 'send-feedback'

export const actionTexts: Readonly<
  Record<OfferedActionId | OwnActionId, CommandText>
> = {
  'new-session': { label: 'New session', words: ['tab', 'agent', 'chat'] },
  'session-history': { label: 'Session history', words: ['closed', 'reopen'] },
  'go-to-all-files': { label: 'Go to All files', words: [] },
  'go-to-changes': { label: 'Go to Changes', words: [] },
  'go-to-checks': { label: 'Go to Checks', words: ['ci'] },
  'go-to-terminal': { label: 'Go to Terminal', words: [] },
  'go-to-preview': { label: 'Go to Preview', words: ['port'] },
  'go-to-desktop': { label: 'Go to Desktop', words: [] },
  'archive-workspace': { label: 'Archive workspace', words: [] },
  'restore-workspace': { label: 'Restore workspace', words: ['unarchive'] },
  'new-workspace': { label: 'New workspace', words: ['create', 'task'] },
  'new-section': { label: 'New section', words: ['group'] },
  'create-org': { label: 'Create org', words: ['new', 'team'] },
  // The row adds the name of the org to the label.
  'switch-org': { label: 'Switch to', words: ['org'] },
  'hide-sidebar': { label: 'Hide the sidebar', words: ['toggle'] },
  'show-sidebar': { label: 'Show the sidebar', words: ['toggle'] },
  'send-feedback': { label: sendFeedbackLabel, words: sendFeedbackWords },
}

/**
 * The command of the keys that runs each action, so that the key and the
 * row do the same thing. Go to Desktop has no command while the app hides
 * Desktop. A Switch to row takes the command of the place of its org, as
 * `orgCommand` gives it.
 */
export const actionCommands: Readonly<
  Record<
    OfferedActionId | Exclude<OwnActionId, 'switch-org'>,
    ShortcutCommandId | null
  >
> = {
  'new-session': 'new-session',
  'session-history': 'session-history',
  'go-to-all-files': 'go-to-all-files',
  'go-to-changes': 'go-to-changes',
  'go-to-checks': 'go-to-checks',
  'go-to-terminal': 'go-to-terminal',
  'go-to-preview': 'go-to-preview',
  'go-to-desktop': null,
  'archive-workspace': 'archive-workspace',
  'restore-workspace': 'restore-workspace',
  'new-section': 'new-section',
  'hide-sidebar': 'toggle-sidebar',
  'show-sidebar': 'toggle-sidebar',
  'new-workspace': 'new-workspace',
  'create-org': 'create-org',
  'send-feedback': 'send-feedback',
}

/**
 * The command of Switch to org 1 to 9 for the org at this place of the org
 * rail, counted from 0 at the top, or null after the ninth place.
 */
export function orgCommand(place: number): ShortcutCommandId | null {
  const digit = shortcutDigits[place]
  return digit === undefined ? null : `org-${digit}`
}

/** The tabs of the org settings, in their order, with their search words. */
export const orgSettings: readonly (CommandText & { tab: SettingsTab })[] = [
  {
    tab: 'general',
    label: 'General',
    words: ['name', 'initials', 'delete org', 'leave org'],
  },
  { tab: 'repositories', label: 'Repositories', words: ['github'] },
  {
    tab: 'cloud-computer',
    label: 'Cloud computer',
    words: ['install', 'startup script', 'env', 'build', 'sandbox'],
  },
  { tab: 'members', label: 'Members', words: ['invite', 'admin', 'role'] },
]

/**
 * The rows of the Account group of the Settings tab, in the order of the
 * Account page: tab by tab, and in each tab in the order of its sections.
 * So This Mac, which only the Mac app shows, follows Sign-in on the General
 * tab, and the Keyboard shortcuts tab ends the list. A section that the
 * page adds or moves takes the same place here.
 */
export const accountSettingIds = [
  'sign-in',
  'this-mac',
  'github',
  'agents',
  'new-workspaces',
  'keyboard-shortcuts',
] as const

/** A section of the Account page, or its Keyboard shortcuts tab. */
export type AccountSettingId = (typeof accountSettingIds)[number]

export const accountSettings: Readonly<Record<AccountSettingId, CommandText>> =
  {
    'sign-in': { label: 'Sign-in', words: ['sign out', 'account'] },
    github: { label: 'GitHub', words: ['github app', 'install'] },
    agents: { label: 'Agents', words: ['claude', 'codex', 'login', 'api key'] },
    'new-workspaces': {
      label: 'New workspaces',
      words: ['model', 'effort', 'default'],
    },
    'this-mac': {
      label: 'This Mac',
      words: ['device', 'always allow', 'commands'],
    },
    'keyboard-shortcuts': {
      label: 'Keyboard shortcuts',
      words: ['keys', 'hotkeys', 'keybindings'],
    },
  }
