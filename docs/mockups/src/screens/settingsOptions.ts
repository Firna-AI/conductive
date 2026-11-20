import type { SchemaProps } from '@mokly/mokly'
import {
  BarChart3,
  Bot,
  Building2,
  Cloud,
  FolderGit2,
  Keyboard,
  KeyRound,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { SettingsNavGroup } from '../components/settings/SettingsNav'
import { orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import type { AccountState } from './accountState'
import type { OrgSettingsState } from './OrgSettingsScreen'

/**
 * The options of item 1 of the settings brainstorm, which the user asked to
 * review as mockups on 17 November 2026:
 *
 * - `a`: two pages, each with its own list of sections on the left.
 * - `b`: one Settings page, with its list as a column inside the page.
 * - `c`: one Settings page, with its list in the place of the sidebar.
 * - `d`: one Settings page, in a dialog over the whole window.
 */
export const settingsOptionsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['option', 'section', 'view'],
  properties: {
    option: { enum: ['a', 'b', 'c', 'd'] },
    /** The section that the page shows. */
    section: {
      enum: [
        'account-general',
        'account-agents',
        'account-preferences',
        'account-shortcuts',
        'account-stats',
        'org-general',
        'org-repositories',
        'org-computer',
        'org-secrets',
        'org-members',
      ],
    },
    /**
     * What a phone shows: the list of sections, or one section with a way
     * back to the list. The desktop always shows the list and the section.
     */
    view: { enum: ['list', 'section'] },
  },
} as const

export type SettingsOptionsState = SchemaProps<typeof settingsOptionsSchema>
export type SettingsOption = SettingsOptionsState['option']
export type SettingsSection = SettingsOptionsState['section']

type SectionInfo = {
  label: string
  icon: LucideIcon
  group: 'account' | 'org'
  account?: AccountState['tab']
  org?: OrgSettingsState['tab']
}

/** Each section, in the order of the list. */
export const settingsSections: Readonly<Record<SettingsSection, SectionInfo>> =
  {
    'account-general': {
      label: 'General',
      icon: UserRound,
      group: 'account',
      account: 'general',
    },
    'account-agents': {
      label: 'Agents',
      icon: Bot,
      group: 'account',
      account: 'agents',
    },
    'account-preferences': {
      label: 'Preferences',
      icon: SlidersHorizontal,
      group: 'account',
      account: 'preferences',
    },
    'account-shortcuts': {
      label: 'Keyboard shortcuts',
      icon: Keyboard,
      group: 'account',
      account: 'shortcuts',
    },
    'account-stats': {
      label: 'Stats',
      icon: BarChart3,
      group: 'account',
      account: 'stats',
    },
    'org-general': {
      label: 'General',
      icon: Building2,
      group: 'org',
      org: 'general',
    },
    'org-repositories': {
      label: 'Repositories',
      icon: FolderGit2,
      group: 'org',
      org: 'repositories',
    },
    'org-computer': {
      label: 'Cloud computer',
      icon: Cloud,
      group: 'org',
      org: 'computer',
    },
    'org-secrets': {
      label: 'Secrets',
      icon: KeyRound,
      group: 'org',
      org: 'secrets',
    },
    'org-members': {
      label: 'Members',
      icon: Users,
      group: 'org',
      org: 'members',
    },
  }

/** The name of a group, as its heading shows it. */
export function groupName(group: SectionInfo['group']): string {
  return group === 'account' ? 'Account' : orgs.acme.name
}

/** The page of each option, where its rows lead on a desktop. */
const optionPaths: Readonly<Record<SettingsOption, string>> = {
  a: paths.settingsOptionA,
  b: paths.settingsOptionB,
  c: paths.settingsOptions,
  d: paths.settingsOptionD,
}

/**
 * The groups of the list. Option A lists only the sections of its own page,
 * the org settings, and links to the account as its last row.
 */
export function settingsGroups(
  state: SettingsOptionsState,
): SettingsNavGroup[] {
  const mobile = paths.settingsOptionSection
  const rows = (group: SectionInfo['group'], to: string) =>
    (Object.keys(settingsSections) as SettingsSection[])
      .filter((key) => settingsSections[key].group === group)
      .map((key) => ({
        key,
        label: settingsSections[key].label,
        icon: settingsSections[key].icon,
        to,
        selected: key === state.section,
      }))
  const to = optionPaths[state.option]
  if (state.option === 'a') {
    return [
      { title: undefined, rows: rows('org', to), touchTo: mobile },
      {
        title: undefined,
        rows: [
          {
            key: 'account',
            label: 'Account settings',
            icon: UserRound,
            to: paths.account,
            selected: false,
            leaves: true,
          },
        ],
      },
    ]
  }
  return [
    { title: 'Account', rows: rows('account', to), touchTo: mobile },
    { title: orgs.acme.name, rows: rows('org', to), touchTo: mobile },
  ]
}

/** The state of each page of the options. */
export const settingsOptionStates: Readonly<
  Record<SettingsOption | 'phone-section', SettingsOptionsState>
> = {
  a: { option: 'a', section: 'org-general', view: 'list' },
  b: { option: 'b', section: 'org-general', view: 'list' },
  c: { option: 'c', section: 'org-general', view: 'list' },
  d: { option: 'd', section: 'org-general', view: 'list' },
  'phone-section': {
    option: 'c',
    section: 'org-repositories',
    view: 'section',
  },
}
