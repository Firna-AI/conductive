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
import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'
import { settingsLinks, type SettingsTab } from './OrgSections'
import { shortcutPages } from './shortcutPages'
import type { SettingsNavGroup } from './SettingsNav'

/** The tabs of Account settings. */
type AccountTab =
  'general' | 'agents' | 'preferences' | 'shortcuts' | 'stats' | 'this-mac'

/** The tab of Settings that shows: a tab of the account or of the org. */
export type SettingsPlace =
  { group: 'account'; tab: AccountTab } | { group: 'org'; tab: SettingsTab }

type TabInfo<Tab> = { tab: Tab; label: string; icon: LucideIcon }

/** The tabs of the account, in their order. This Mac shows in the Mac app. */
const accountTabs: readonly TabInfo<AccountTab>[] = [
  { tab: 'general', label: 'General', icon: UserRound },
  { tab: 'agents', label: 'Agents', icon: Bot },
  { tab: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { tab: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
  { tab: 'stats', label: 'Stats', icon: BarChart3 },
  { tab: 'this-mac', label: 'This Mac', icon: Laptop },
]

/** The tabs of the settings of an org, in their order. */
const orgTabs: readonly TabInfo<SettingsTab>[] = [
  { tab: 'general', label: 'General', icon: Building2 },
  { tab: 'repositories', label: 'Repositories', icon: FolderGit2 },
  { tab: 'computer', label: 'Cloud computer', icon: Cloud },
  { tab: 'agents', label: 'Agents', icon: Bot },
  { tab: 'secrets', label: 'Secrets', icon: KeyRound },
  { tab: 'members', label: 'Members', icon: Users },
]

/** The label of the tab of a place, such as Agents or Cloud computer. */
export function placeLabel(place: SettingsPlace): string {
  const tabs: readonly TabInfo<string>[] =
    place.group === 'account' ? accountTabs : orgTabs
  return tabs.find((item) => item.tab === place.tab)?.label ?? ''
}

/** The page of each tab of the account, for the keys of `host`. */
function accountLink(tab: AccountTab, host: ShortcutHost): string {
  switch (tab) {
    case 'general':
      return paths.account
    case 'agents':
      return paths.accountAgents
    case 'preferences':
      return paths.accountPreferences
    case 'shortcuts':
      return shortcutPages[host].tab
    case 'stats':
      return paths.accountStats
    case 'this-mac':
      return paths.thisMac
  }
}

/**
 * The groups of the list of Settings: Account, then the org of the page,
 * when the person has one. `org.links` gives the page of each tab of the
 * org, such as those of a suspended org. Only the Mac app has This Mac.
 */
export function settingsGroups(props: {
  place: SettingsPlace | null
  host: ShortcutHost
  org?: { name: string; links?: Readonly<Record<SettingsTab, string>> }
}): SettingsNavGroup[] {
  const { place, host, org } = props
  const account: SettingsNavGroup = {
    title: 'Account',
    rows: accountTabs
      .filter((item) => item.tab !== 'this-mac' || host === 'mac-app')
      .map((item) => ({
        key: `account-${item.tab}`,
        label: item.label,
        icon: item.icon,
        to: accountLink(item.tab, host),
        selected: place?.group === 'account' && place.tab === item.tab,
      })),
  }
  if (!org) return [account]
  const links = org.links ?? settingsLinks
  return [
    account,
    {
      title: org.name,
      rows: orgTabs.map((item) => ({
        key: `org-${item.tab}`,
        label: item.label,
        icon: item.icon,
        to: links[item.tab],
        selected: place?.group === 'org' && place.tab === item.tab,
      })),
    },
  ]
}
