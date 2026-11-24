import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { defined } from '../../defined'
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
 * The pages of Preferences in the phone apps, one for each setting of the
 * notices of the device, because the phone apps start the tab with the
 * Notices section. The web app opens `paths.accountPreferences`.
 */
const phonePreferencesPages: Readonly<Record<NoticeSetting, string>> = {
  denied: phonePaths.noticesDenied,
  'not-now': phonePaths.noticesNotNow,
  on: phonePaths.noticesOn,
}

/**
 * The pages of the account, as tabs that link to each one: General, with
 * the sign-in, GitHub, and the invite code, Agents, with the logins of
 * Claude and Codex, Preferences, Keyboard shortcuts, and Stats.
 * Keyboard shortcuts links to the tab of the host. The Mac app adds This
 * Mac last. In the phone apps, Preferences links to the page of the
 * `notices` setting of the device. `flow` moves a tab that
 * does not fit to a second line, for a phone.
 */
export function AccountTabs(props: {
  tab: AccountTab
  host: ShortcutHost
  flow?: boolean
  phoneApp?: boolean
  notices?: NoticeSetting
}) {
  const preferences =
    props.phoneApp && props.notices
      ? phonePreferencesPages[props.notices]
      : paths.accountPreferences
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
      to: shortcutPages[props.host].tab,
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
      tabs={tabs}
      {...defined({ flow: props.flow })}
    />
  )
}
