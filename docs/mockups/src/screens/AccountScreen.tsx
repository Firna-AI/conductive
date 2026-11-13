import type { Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  AccountTabs,
  AgentsSection,
  GitHubSection,
  SignInSection,
} from '../components/settings/AccountSections'
import { InviteCodeSection } from '../components/settings/InviteCodeSection'
import { DefaultsSection } from '../components/settings/PreferencesSections'
import { ResetShortcutsDialog } from '../components/settings/ResetShortcutsDialog'
import { ShortcutsTab } from '../components/settings/ShortcutsSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { account, orgList, orgs } from '../fixtures/orgs'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import type { ShortcutHost } from '../fixtures/shortcutHosts'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'
import type { AccountState } from './accountState'
import { agentsFor } from './accountAgents'

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/**
 * The General tab: the GitHub sign-in, the GitHub App that every org
 * shares, then the invite code of the user. The Mac app adds the This Mac
 * section.
 */
function GeneralTab(props: { state: AccountState }) {
  const mac = useMacApp()
  return (
    <>
      <SignInSection />
      {mac ? <ThisMacSection /> : null}
      <GitHubSection connected={props.state.connections === 'connected'} />
      <InviteCodeSection
        fresh={props.state.connections !== 'connected'}
        openSignUp={props.state.openSignUp === 'on'}
        state={props.state.invites}
      />
    </>
  )
}

/** The content of the tab of a state, with the keys of its host. */
function TabContent(props: {
  state: AccountState
  host: ShortcutHost
  changes: ShortcutChanges
}) {
  const { state } = props
  switch (state.tab) {
    case 'general':
      return <GeneralTab state={state} />
    case 'agents':
      return <AgentsSection {...agentsFor(state)} />
    case 'preferences':
      return (
        <DefaultsSection
          saveFailed={state.save === 'failed'}
          view={state.view}
        />
      )
    case 'shortcuts':
      return (
        <ShortcutsTab
          change={state.keyChange}
          changes={props.changes}
          host={props.host}
          search={state.shortcutSearch}
        />
      )
  }
}

/**
 * The account, in tabs. General holds the GitHub sign-in, the GitHub App,
 * and the invite code of the user. Agents holds the logins of Claude and
 * Codex that every org shares, with the share setting of each login and
 * the host of an own endpoint. Preferences holds how new
 * workspaces start: their model, and how New workspace opens. Keyboard
 * shortcuts holds the keys of the host: the Mac app, or the browser and the
 * keyboard of `state.host`. The product is free, so the page shows no plan
 * and no billing, and the sandbox provider stays out of sight. With the
 * person's changes to the shortcuts, the Search row of the Mac app's
 * sidebar shows the person's key of the palette.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
}) {
  const { state } = props
  const mac = useMacApp()
  const host: ShortcutHost = mac ? 'mac-app' : state.host
  const changes: ShortcutChanges =
    state.shortcuts === 'edited' ? editedShortcuts : {}
  const connected = state.connections === 'connected'
  const mobile = props.viewport === 'mobile'
  const back = connected
    ? { label: 'Workspaces', to: paths.shell }
    : { label: 'Get started', to: paths.getStarted }
  const page = (
    <Page
      back={mobile ? back : undefined}
      subtitle={`@${account.login}`}
      tabs={<AccountTabs flow={mobile} host={host} tab={state.tab} />}
      title="Account"
      viewport={props.viewport}
    >
      <TabContent changes={changes} host={host} state={state} />
    </Page>
  )
  // Reset all asks first: a dialog over the account, or a sheet on a phone.
  const dialog =
    state.tab === 'shortcuts' && state.keyChange === 'reset-all' ? (
      <ResetShortcutsDialog
        changed={Object.keys(changes).length}
        host={host}
        viewport={props.viewport}
      />
    ) : null
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {dialog}
      </MobileFrame>
    )
  }
  // The Mac app keeps the sidebar of the org beside the account.
  const sidebar = mac ? (
    <Sidebar
      org={orgs.acme}
      sections={workspaceSections(undefined, mac.needsInput)}
      shortcuts={changes}
      viewer={viewerMembership('admin')}
    />
  ) : undefined
  return (
    <AppFrame
      overlay={dialog}
      rail={connected ? connectedRail : firstRunRail}
      sidebar={sidebar}
    >
      {page}
    </AppFrame>
  )
}
