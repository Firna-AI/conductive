import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { defined, plainData } from '../../defined'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { paths } from '../../paths'
import { phonePaths } from '../../phonePaths'
import type { LinkTab } from '../common/LinkTabs'
import type { NoticeSetting } from '../phone/noticeSettings'
import { shortcutPages } from './shortcutPages'

/** The pages of the account. */
export type AccountTab =
  'general' | 'agents' | 'preferences' | 'shortcuts' | 'stats' | 'this-mac'

/**
 * The pages of the tabs that the phone apps open in place of the web
 * pages. Preferences opens the page of the notices setting of the device,
 * because the phone apps start the tab with the Notices section. Keyboard
 * shortcuts has no page of the phone apps yet, so the map holds none, and
 * the tab shows with no link. The other tabs open the shared pages.
 */
const phoneTabPages: {
  preferences: Readonly<Record<NoticeSetting, string>>
  shortcuts?: string
} = {
  preferences: {
    denied: phonePaths.noticesDenied,
    'not-now': phonePaths.noticesNotNow,
    on: phonePaths.noticesOn,
  },
}

/**
 * The pages of the account, as tabs that link to each one: General, with
 * the sign-in, GitHub, and the invite code, Agents, with the logins of
 * Claude and Codex, Preferences, Keyboard shortcuts, and Stats.
 * Keyboard shortcuts links to the tab of the host. The Mac app adds This
 * Mac last. In the phone apps, a tab opens its page in `phoneTabPages`,
 * such as the page of the `notices` setting of the device, or shows with
 * no link. `flow` moves a tab that does not fit to a second line, for a
 * phone.
 */
export function AccountTabs(props: {
  tab: AccountTab
  host: ShortcutHost
  flow?: boolean
  phoneApp?: boolean
  notices?: NoticeSetting
}) {
  const phone = props.phoneApp === true
  const preferences = phone
    ? props.notices && phoneTabPages.preferences[props.notices]
    : paths.accountPreferences
  const shortcuts = phone
    ? phoneTabPages.shortcuts
    : shortcutPages[props.host].tab
  const tabs: LinkTab[] = [
    {
      label: 'General',
      to: paths.account,
      selected: props.tab === 'general',
    },
    {
      label: 'Agents',
      to: paths.accountAgents,
      selected: props.tab === 'agents',
    },
    {
      label: 'Preferences',
      to: preferences,
      selected: props.tab === 'preferences',
    },
    {
      label: 'Keyboard shortcuts',
      to: shortcuts,
      selected: props.tab === 'shortcuts',
    },
    {
      label: 'Stats',
      to: paths.accountStats,
      selected: props.tab === 'stats',
    },
  ]
  if (props.host === 'mac-app') {
    tabs.push({
      label: 'This Mac',
      to: paths.thisMac,
      selected: props.tab === 'this-mac',
    })
  }
  return (
    <linkTabs.Component
      label="Account"
      moklyInstance="account-tabs"
      tabs={plainData(tabs)}
      {...defined({ flow: props.flow })}
    />
  )
}
