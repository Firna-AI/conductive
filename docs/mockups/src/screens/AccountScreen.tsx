import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { ImportSection } from '../components/conductor-import/ImportSection'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  AccountTabs,
  AgentsSection,
  GitHubSection,
  SignInSection,
  type OpenAgentForm,
} from '../components/settings/AccountSections'
import { inviteStates } from '../components/settings/inviteCodeCopy'
import { InviteCodeSection } from '../components/settings/InviteCodeSection'
import { DefaultsSection } from '../components/settings/PreferencesSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { agentKeys, type AgentKey } from '../fixtures/agents'
import {
  accountLogins,
  type AgentLogins,
  type LoginKind,
} from '../fixtures/logins'
import { account, orgList, orgs } from '../fixtures/orgs'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tab',
    'connections',
    'form',
    'view',
    'save',
    'shareChange',
    'invites',
    'openSignUp',
  ],
  properties: {
    /**
     * The tab: General, with the sign-in and the connections, or
     * Preferences. Each tab has its own address.
     */
    tab: { enum: ['general', 'preferences'] },
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
    /**
     * The Connect form that is open. Its agent is not connected yet, and the
     * other agent is.
     */
    form: { enum: ['none', 'claude', 'codex'] },
    /** How New workspace opens on a computer: as the page, or as a dialog. */
    view: { enum: ['page', 'dialog'] },
    /**
     * The save of the last change on Preferences: saved, or failed. A failed
     * save shows its error, and the choice keeps its saved value.
     */
    save: { enum: ['saved', 'failed'] },
    /**
     * The invite code of the user: invites left, sign-ups paused, every
     * invite used, or turned off by an operator.
     */
    invites: { enum: inviteStates },
    /**
     * Open sign-up: an operator turned off the waitlist, and sign-ups are
     * not paused, so anyone can sign up without an invite.
     */
    openSignUp: { enum: ['off', 'on'] },
    /**
     * The last change of a share setting: none, or a change of the Claude
     * login that the app did not save.
     */
    shareChange: { enum: ['none', 'not-saved'] },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

/** The General tab of a connected account, with no form open. */
export const accountGeneral: AccountState = {
  tab: 'general',
  connections: 'connected',
  form: 'none',
  view: 'page',
  save: 'saved',
  shareChange: 'none',
  invites: 'left',
  openSignUp: 'off',
}

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/** The logins of the agents in a state, without the agent of the form. */
function loginsFor(state: AccountState): AgentLogins {
  const logins: Partial<Record<AgentKey, LoginKind>> = {}
  if (state.connections === 'not-connected') return logins
  for (const key of agentKeys) {
    const login = accountLogins[key]
    if (login && key !== state.form) logins[key] = login
  }
  return logins
}

/**
 * The General tab: the GitHub sign-in, and what every org shares, the
 * GitHub App and the agents, then the invite code of the user, last, so
 * that a phone shows the form of an agent near the top. The Mac app adds
 * the This Mac section, and the import from Conductor, which reads the
 * data of this Mac. `importTo` is the screen of Choose workspaces.
 */
function GeneralTab(props: { state: AccountState; importTo?: string | null }) {
  const { form } = props.state
  const mac = useMacApp()
  const openForm: OpenAgentForm | undefined =
    form === 'none'
      ? undefined
      : { agent: form, connectTo: paths.account, cancel: true }
  return (
    <>
      <SignInSection />
      {mac ? <ThisMacSection /> : null}
      {mac ? <ImportSection to={props.importTo} /> : null}
      <GitHubSection connected={props.state.connections === 'connected'} />
      <AgentsSection
        form={openForm}
        logins={loginsFor(props.state)}
        shares={{
          notSaved: props.state.shareChange === 'not-saved' ? 'claude' : null,
        }}
      />
      <InviteCodeSection
        fresh={props.state.connections !== 'connected'}
        openSignUp={props.state.openSignUp === 'on'}
        state={props.state.invites}
      />
    </>
  )
}

/**
 * The account, in two tabs. General holds the GitHub sign-in, what every
 * org shares, and the invite code of the user. Preferences holds how new workspaces start: their model, and
 * how New workspace opens. The product is free, so the page shows no plan
 * and no billing, and the sandbox provider stays out of sight.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
  /**
   * The screen of Choose workspaces in the Mac app, for a step of the
   * import. Null keeps it static. Without it, the button opens the
   * question of the first import.
   */
  importTo?: string | null
}) {
  const { state } = props
  const mac = useMacApp()
  const connected = state.connections === 'connected'
  const mobile = props.viewport === 'mobile'
  const back = connected
    ? { label: 'Workspaces', to: paths.shell }
    : { label: 'Get started', to: paths.getStarted }
  const page = (
    <Page
      back={mobile ? back : undefined}
      subtitle={`@${account.login}`}
      tabs={<AccountTabs tab={state.tab} />}
      title="Account"
      viewport={props.viewport}
    >
      {state.tab === 'general' ? (
        <GeneralTab importTo={props.importTo} state={state} />
      ) : (
        <DefaultsSection
          saveFailed={state.save === 'failed'}
          view={state.view}
        />
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  // The Mac app keeps the sidebar of the org beside the account.
  const sidebar = mac ? (
    <Sidebar
      org={orgs.acme}
      sections={workspaceSections(undefined, mac.needsInput)}
      viewer={viewerMembership('admin')}
    />
  ) : undefined
  return (
    <AppFrame rail={connected ? connectedRail : firstRunRail} sidebar={sidebar}>
      {page}
    </AppFrame>
  )
}
