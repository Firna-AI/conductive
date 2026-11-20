import {
  BarChart3,
  Bot,
  Building2,
  Cloud,
  FolderGit2,
  Keyboard,
  KeyRound,
  Laptop,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  routes,
  type AccountTab,
  type SettingsRoute,
  type SettingsTab,
} from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'

/** A row of the list of Settings. */
export interface SettingsRow {
  key: string
  label: string
  icon: LucideIcon
  to: string
  selected: boolean
}

/** A group of the list: Account, or the settings of one org. */
export interface SettingsGroup {
  title: string
  rows: readonly SettingsRow[]
}

/** The tabs of Account settings, in their order. Only the Mac app has This Mac. */
const accountTabs: readonly {
  tab: AccountTab
  label: string
  icon: LucideIcon
}[] = [
  { tab: 'general', label: 'General', icon: UserRound },
  { tab: 'agents', label: 'Agents', icon: Bot },
  { tab: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { tab: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
  { tab: 'stats', label: 'Stats', icon: BarChart3 },
  { tab: 'this-mac', label: 'This Mac', icon: Laptop },
]

/** The tabs of the org settings, in their order. */
const orgTabs: readonly {
  tab: SettingsTab
  label: string
  icon: LucideIcon
}[] = [
  { tab: 'general', label: 'General', icon: Building2 },
  { tab: 'repositories', label: 'Repositories', icon: FolderGit2 },
  { tab: 'cloud-computer', label: 'Cloud computer', icon: Cloud },
  { tab: 'secrets', label: 'Secrets', icon: KeyRound },
  { tab: 'members', label: 'Members', icon: Users },
]

/** The name of the tab of a route, such as Agents, and its group. */
export function tabTitle(
  route: Extract<SettingsRoute, { tab: unknown }>,
  org: OrgSummary | undefined,
): { title: string; group: string } {
  if (route.screen === 'account') {
    const label = accountTabs.find((item) => item.tab === route.tab)?.label
    return { title: label ?? 'General', group: 'Account' }
  }
  const label = orgTabs.find((item) => item.tab === route.tab)?.label
  return { title: label ?? 'General', group: org?.name ?? '' }
}

/**
 * The groups of the list of Settings: Account, then the org settings of
 * `org`, when the person has one. `route` marks its row as selected. Only
 * the Mac app lists This Mac.
 */
export function settingsGroups(props: {
  route: SettingsRoute | null
  org: OrgSummary | undefined
  mac: boolean
}): SettingsGroup[] {
  const { route, org } = props
  const groups: SettingsGroup[] = [
    {
      title: 'Account',
      rows: accountTabs
        .filter((item) => props.mac || item.tab !== 'this-mac')
        .map((item) => ({
          key: `account-${item.tab}`,
          label: item.label,
          icon: item.icon,
          to: routes.accountTab(item.tab),
          selected: route?.screen === 'account' && route.tab === item.tab,
        })),
    },
  ]
  if (!org) return groups
  groups.push({
    title: org.name,
    rows: orgTabs.map((item) => ({
      key: `org-${item.tab}`,
      label: item.label,
      icon: item.icon,
      to: routes.settings(org.id, item.tab),
      selected: route?.screen === 'settings' && route.tab === item.tab,
    })),
  })
  return groups
}
