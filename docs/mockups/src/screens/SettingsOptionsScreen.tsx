import type { Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { SettingsNav } from '../components/settings/SettingsNav'
import { orgList, orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import {
  SectionContent,
  SettingsDialog,
  SettingsSidebar,
  SplitBody,
  WorkspaceSidebar,
} from './settingsOptionParts'
import {
  groupName,
  settingsGroups,
  settingsSections,
  type SettingsOptionsState,
} from './settingsOptions'

/**
 * A phone: the list of the sections first, then one section with a way back
 * to the list. Option A lists only the org settings and links to the
 * account. Options B, C, and D list both groups on one Settings screen.
 */
function PhoneSettings(props: { state: SettingsOptionsState }) {
  const { state } = props
  const info = settingsSections[state.section]
  if (state.view === 'section') {
    return (
      <MobileFrame>
        <Page
          back={{ label: 'Settings', to: paths.settingsOptions }}
          subtitle={groupName(info.group)}
          title={info.label}
          viewport="mobile"
        >
          <SectionContent section={state.section} viewport="mobile" />
        </Page>
      </MobileFrame>
    )
  }
  const onePage = state.option === 'a'
  return (
    <MobileFrame>
      <Page
        back={{ label: 'Workspaces', to: paths.shell }}
        subtitle={onePage ? 'Org settings' : undefined}
        title={onePage ? orgs.acme.name : 'Settings'}
        viewport="mobile"
      >
        <SettingsNav groups={settingsGroups(state)} variant="touch" />
      </Page>
    </MobileFrame>
  )
}

const acmeRail = { orgs: orgList, current: 'acme' } as const

/**
 * The options for one place for the settings of the person and of the org,
 * which item 1 of the settings brainstorm asks about:
 *
 * - A keeps the org settings and the account apart, each with a list of
 *   its sections inside the page. The org page links to the account.
 * - B makes one Settings page, with both groups in a list inside the page.
 *   The workspace sidebar stays.
 * - C makes one Settings page, whose list takes the place of the workspace
 *   sidebar. Its first row leads back to the workspaces.
 * - D shows the same list and section in a dialog over the whole window.
 */
export function SettingsOptionsScreen(props: {
  state: SettingsOptionsState
  viewport: Viewport
}) {
  const { state, viewport } = props
  if (viewport === 'mobile') return <PhoneSettings state={state} />
  const info = settingsSections[state.section]
  switch (state.option) {
    case 'a':
    case 'b':
      return (
        <AppFrame rail={acmeRail} sidebar={<WorkspaceSidebar settings />}>
          <Page
            fill
            subtitle={state.option === 'a' ? 'Org settings' : undefined}
            title={state.option === 'a' ? orgs.acme.name : 'Settings'}
            viewport={viewport}
          >
            <SplitBody state={state} viewport={viewport} />
          </Page>
        </AppFrame>
      )
    case 'c':
      return (
        <AppFrame rail={acmeRail} sidebar={<SettingsSidebar state={state} />}>
          <Page
            subtitle={groupName(info.group)}
            title={info.label}
            viewport={viewport}
          >
            <SectionContent section={state.section} viewport={viewport} />
          </Page>
        </AppFrame>
      )
    case 'd':
      return (
        <AppFrame
          overlay={<SettingsDialog state={state} viewport={viewport} />}
          rail={acmeRail}
          sidebar={<WorkspaceSidebar />}
        >
          <Page
            subtitle="Workspaces"
            title={orgs.acme.name}
            viewport={viewport}
          >
            {null}
          </Page>
        </AppFrame>
      )
  }
}
