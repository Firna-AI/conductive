import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import type { RailState } from '../components/layout/OrgRail'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { useMacApp } from '../../../../src/ui/components/mac/MacApp'
// The tabs come first, so that their styles keep their place in the bundle.
import { accountTabs } from '../entries/components/settings/AccountTabs.mockup'
import {
  agentsSection,
  gitHubSection,
  signInSection,
} from '../entries/components/settings/AccountSections.mockup'
import { deletedOrgsSection } from '../entries/components/settings/DeletedOrgsSection.mockup'
import {
  addFavouriteSheet,
  favouritesSection,
} from '../entries/components/settings/FavouritesSection.mockup'
import { inviteCodeSection } from '../entries/components/settings/InviteCodeSection.mockup'
import { defaultsSection } from '../entries/components/settings/PreferencesSections.mockup'
import { placedModelMenu } from '../entries/components/chat/PlacedModelMenu.mockup'
import { statsTab } from '../entries/components/screens/accountStats.mockup'
import { resetShortcutsDialog } from '../entries/components/settings/ResetShortcutsDialog.mockup'
import { shortcutsTab } from '../entries/components/settings/ShortcutsSections.mockup'
import { thisMacSection } from '../entries/components/settings/ThisMacSection.mockup'
import { workspaceSections } from '../components/workspaces/sections'
import { sidebar as sidebarPart } from '../entries/components/workspaces/Sidebar.mockup'
import { fastChoice } from '../fixtures/agents'
import { account, orgList, orgs } from '../fixtures/orgs'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import type { ShortcutHost } from '../fixtures/shortcutHosts'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'
import type { AccountState, AccountView } from './accountState'
import { agentsFor, hiddenModelsFor } from './accountAgents'
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
      <signInSection.Component moklyInstance="sign-in" />
      <gitHubSection.Component
        connected={props.state.connections === 'connected'}
        moklyInstance="github"
      />
      <inviteCodeSection.Component
        fresh={props.state.connections !== 'connected'}
        moklyInstance="invite-code"
        openSignUp={props.state.openSignUp === 'on'}
        state={props.state.invites}
      />
      <deletedOrgsSection.Component
        moklyInstance="deleted-orgs"
        state={props.state.deletedOrgs}
      />
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
      return (
        <agentsSection.Component
          moklyInstance="agents"
          {...plainData(agentsFor({ ...state, tab: 'agents' }))}
        />
      )
    case 'preferences':
      return (
        <>
          <favouritesSection.Component
            favourites={state.favourites}
            hiddenModels={hiddenModelsFor({ ...state, tab: 'preferences' })}
            moklyInstance="favourites"
            saveFailed={state.save === 'favourites-failed'}
          />
          <defaultsSection.Component
            fastMenu={state.modelMenu === 'open-fast'}
            moklyInstance="defaults"
            saveFailed={state.save === 'failed'}
            view={state.view}
          />
        </>
      )
    case 'shortcuts':
      return (
        <shortcutsTab.Component
          change={state.keyChange}
          changes={props.changes}
          host={props.host}
          moklyInstance="shortcuts"
          search={state.shortcutSearch}
        />
      )
    case 'stats':
      return (
        <statsTab.Component
          moklyInstance="stats"
          stats={state.stats}
          viewport={props.viewport}
        />
      )
    case 'this-mac':
      return <thisMacSection.Component moklyInstance="this-mac" />
  }
}

/**
 * The account, in tabs. General holds the GitHub sign-in, the GitHub App,
 * and the invite code of the user. Agents holds the logins of Claude and
 * Codex that every org shares, with the share setting of each login and
 * the host of an own endpoint. Preferences holds the favourites of the
 * model menu, then how new workspaces start: their model, and how New
 * workspace opens. Keyboard
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
      tabs={
        <accountTabs.Component
          flow={mobile}
          host={host}
          moklyInstance="account-tabs"
          tab={state.tab}
        />
      }
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
      <resetShortcutsDialog.Component
        changed={Object.keys(changes).length}
        host={host}
        moklyInstance="reset-shortcuts-dialog"
        viewport={props.viewport}
      />
    ) : undefined
  // The open menu of the default model lies above the page, at its picker.
  const modelMenu =
    state.tab === 'preferences' && state.modelMenu === 'open-fast' ? (
      <placedModelMenu.Component
        choice={fastChoice}
        moklyInstance="default-model-menu"
        placement="below"
      />
    ) : undefined
  if (mobile) {
    // A phone opens the list of Add a favourite in a sheet.
    const addSheet =
      state.tab === 'preferences' && state.favourites === 'add-open' ? (
        <addFavouriteSheet.Component
          hiddenModels={hiddenModelsFor({ ...state, tab: 'preferences' })}
          moklyInstance="add-favourite-sheet"
        />
      ) : null
    return (
      <mobileFrame.Component>
        {page}
        {dialog}
        {modelMenu}
        {addSheet}
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
  const overlay: ReactNode =
    dialog || modelMenu ? (
      <>
        {dialog}
        {modelMenu}
      </>
    ) : undefined
  return (
    <appFrame.Component
      rail={connected ? connectedRail : firstRunRail}
      {...defined({ overlay, sidebar })}
    >
      {page}
    </appFrame.Component>
  )
}
