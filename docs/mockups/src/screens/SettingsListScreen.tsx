import type { Viewport } from '@mokly/mokly'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { settingsGroups } from '../components/settings/settingsGroups'
import { SettingsNav } from '../components/settings/SettingsNav'
import { orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import { AccountScreen } from './AccountScreen'
import { accountGeneral } from './accountState'

/**
 * The first screen of Settings on a phone: the tabs of the account, then
 * the tabs of the org, in two lists. Each row opens its tab as a screen of
 * its own, with Settings as the way back. A desktop has no such screen, so
 * its address opens Account › General in the Settings dialog.
 */
export function SettingsListScreen(props: { viewport: Viewport }) {
  if (props.viewport === 'desktop') {
    return <AccountScreen state={accountGeneral} viewport="desktop" />
  }
  return (
    <MobileFrame>
      <Page
        back={{ label: 'Workspaces', to: paths.shell }}
        title="Settings"
        viewport="mobile"
      >
        <SettingsNav
          groups={settingsGroups({
            place: null,
            host: 'chrome-mac',
            org: { name: orgs.acme.name },
          })}
          variant="touch"
        />
      </Page>
    </MobileFrame>
  )
}
