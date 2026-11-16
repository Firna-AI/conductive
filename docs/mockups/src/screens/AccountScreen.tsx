import type { Viewport } from '@mokly/mokly'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import type { RailState } from '../components/layout/OrgRail'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { useMacApp } from '../components/mac/MacApp'
// The tabs come first, so that their styles keep their place in the bundle.
import { AccountTabs } from '../components/settings/AccountTabs'
import {
  AgentsSection,
  GitHubSection,
  SignInSection,
} from '../components/settings/AccountSections'
import { DeletedOrgsSection } from '../components/settings/DeletedOrgsSection'
import { InviteCodeSection } from '../components/settings/InviteCodeSection'
import { DefaultsSection } from '../components/settings/PreferencesSections'
import { StatsTab } from './accountStats'
import { ResetShortcutsDialog } from '../components/settings/ResetShortcutsDialog'
import { ShortcutsTab } from '../components/settings/ShortcutsSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { sidebar as sidebarPart } from '../entries/components/workspaces/Sidebar.mockup'
import { account, orgList, orgs } from '../fixtures/orgs'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import type { ShortcutHost } from '../fixtures/shortcutHosts'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'
import type { AccountState, AccountView } from './accountState'
import { agentsFor } from './accountAgents'
import { defined, plainData } from '../defined'

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/**
 * The General tab: the GitHub sign-in, the GitHub App that every org
 * shares, then the invite code of the user. The orgs that the user can
 * restore come last, only while one exists.
 */
function GeneralTab(props: { state: AccountState }) {
  return (
    <>
      <SignInSection />
      <GitHubSection connected={props.state.connections === 'connected'} />
      <InviteCodeSection
        fresh={props.state.connections !== 'connected'}
        openSignUp={props.state.openSignUp === 'on'}
        state={props.state.invites}
      />
      <DeletedOrgsSection state={props.state.deletedOrgs} />
    </>
  )
}

/** The content of the tab of a state, with the keys of its host. */
function TabContent(props: {
  state: AccountView
  host: ShortcutHost
  changes: ShortcutChanges
  viewport: Viewport
}) {
  const { state } = props
  switch (state.tab) {
    case 'general':
      return <GeneralTab state={{ ...state, tab: 'general' }} />
    case 'agents':
      return <AgentsSection {...agentsFor({ ...state, tab: 'agents' })} />
    case 'preferences':
      return (
        <DefaultsSection
          fastMenu={state.modelMenu === 'open-fast'}
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
    case 'stats':
      return <StatsTab stats={state.stats} viewport={props.viewport} />
    case 'this-mac':
      return <ThisMacSection />
  }
}

/**
 * The account, in tabs. General holds the GitHub sign-in, the GitHub App,
 * and the invite code of the user. Agents holds the logins of Claude and
 * Codex that every org shares, with the share setting of each login and
 * the host of an own endpoint. Preferences holds how new
 * workspaces start: their model, and how New workspace opens. Keyboard
 * shortcuts holds the keys of the host: the Mac app, or the browser and the
 * keyboard of `state.host`. Stats holds the person's own counts. The Mac
 * app adds This Mac, with the commands
 * that always run on this Mac. The product is free, so the page shows no
 * plan and no billing, and the sandbox provider stays out of sight. With the
 * person's changes to the shortcuts, the Search row of the Mac app's
 * sidebar shows the person's key of the palette.
 */
export function AccountScreen(props: {
  state: AccountView
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
    <pagePart.Component
      subtitle={`@${account.login}`}
      {...defined({ back: mobile ? back : undefined })}
      tabs={<AccountTabs flow={mobile} host={host} tab={state.tab} />}
      title="Account"
      viewport={props.viewport}
    >
      <TabContent
        changes={changes}
        host={host}
        state={state}
        viewport={props.viewport}
      />
    </pagePart.Component>
  )
  // Reset all asks first: a dialog over the account, or a sheet on a phone.
  const dialog =
    state.tab === 'shortcuts' && state.keyChange === 'reset-all' ? (
      <ResetShortcutsDialog
        changed={Object.keys(changes).length}
        host={host}
        viewport={props.viewport}
      />
    ) : undefined
  if (mobile) {
    return (
      <mobileFrame.Component>
        {page}
        {dialog}
      </mobileFrame.Component>
    )
  }
  // The Mac app keeps the sidebar of the org beside the account.
  const sidebar = mac ? (
    <sidebarPart.Component
      moklyInstance="sidebar"
      org={orgs.acme}
      sections={plainData(workspaceSections(undefined, mac.needsInput))}
      shortcuts={changes}
      viewer={viewerMembership('admin')}
    />
  ) : undefined
  return (
    <appFrame.Component
      rail={connected ? connectedRail : firstRunRail}
      {...defined({ overlay: dialog, sidebar })}
    >
      {page}
    </appFrame.Component>
  )
}
