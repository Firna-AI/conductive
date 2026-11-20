import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import { useMacApp } from '../components/mac/MacApp'
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
import {
  placeLabel,
  settingsGroups,
} from '../components/settings/settingsGroups'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { orgs } from '../fixtures/orgs'
import {
  editedShortcuts,
  type ShortcutChanges,
} from '../fixtures/shortcutChanges'
import type { ShortcutHost } from '../fixtures/shortcutHosts'
import { viewerMembership } from '../fixtures/members'
import type { AccountState, AccountView } from './accountState'
import { agentsFor } from './accountAgents'
import { GetStartedPage, getStartedFirstRun } from './GetStartedScreen'
import { SettingsFrame } from './settingsFrame'

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
 * The Account group of Settings, in tabs. General holds the GitHub sign-in, the GitHub App,
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
 * sidebar shows the person's key of the palette. `content` takes the place
 * of the content of the tab, for a page that draws other settings.
 */
export function AccountScreen(props: {
  state: AccountView
  viewport: Viewport
  content?: ReactNode
}) {
  const { state } = props
  const mac = useMacApp()
  const host: ShortcutHost = mac ? 'mac-app' : state.host
  const changes: ShortcutChanges =
    state.shortcuts === 'edited' ? editedShortcuts : {}
  const connected = state.connections === 'connected'
  const place = { group: 'account', tab: state.tab } as const
  // Reset all asks first: a dialog over Settings, or a sheet on a phone.
  const dialog =
    state.tab === 'shortcuts' && state.keyChange === 'reset-all' ? (
      <ResetShortcutsDialog
        changed={Object.keys(changes).length}
        host={host}
        viewport={props.viewport}
      />
    ) : null
  // Settings lies over the workspace list of Acme. At the first run the
  // person has no org yet, so it lies over Get started.
  return (
    <SettingsFrame
      below={
        connected ? undefined : (
          <GetStartedPage state={getStartedFirstRun} viewport="desktop" />
        )
      }
      dialog={dialog}
      group="Account"
      groups={settingsGroups({
        place,
        host,
        org: connected ? { name: orgs.acme.name } : undefined,
      })}
      rail={connected ? acmeRail : firstRunRail}
      sidebar={
        connected ? (
          <Sidebar
            org={orgs.acme}
            sections={workspaceSections(undefined, mac?.needsInput)}
            shortcuts={changes}
            viewer={viewerMembership('admin')}
          />
        ) : undefined
      }
      title={placeLabel(place)}
      viewport={props.viewport}
    >
      {props.content ?? (
        <TabContent
          changes={changes}
          host={host}
          state={state}
          viewport={props.viewport}
        />
      )}
    </SettingsFrame>
  )
}
