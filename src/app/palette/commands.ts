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

/** The actions that the palette makes itself, because they open a page. */
export type OwnActionId =
  'new-workspace' | 'import-from-conductor' | 'create-org' | 'switch-org'

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
  'import-from-conductor': {
    label: 'Import from Conductor',
    words: ['migrate', 'workspaces'],
  },
  'create-org': { label: 'Create org', words: ['new', 'team'] },
  // The row adds the name of the org to the label.
  'switch-org': { label: 'Switch to', words: ['org'] },
  'hide-sidebar': { label: 'Hide the sidebar', words: ['toggle'] },
  'show-sidebar': { label: 'Show the sidebar', words: ['toggle'] },
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

export const accountSettingIds = [
  'sign-in',
  'github',
  'agents',
  'new-workspaces',
  'this-mac',
] as const

/** A section of the Account page. `this-mac` shows in the Mac app only. */
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
    'this-mac': { label: 'This Mac', words: ['device', 'commands'] },
  }
