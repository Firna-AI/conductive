import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  AccountTabs,
  AgentsSection,
  GitHubSection,
  SignInSection,
  type OpenAgentForm,
} from '../components/settings/AccountSections'
import type { EndpointEntry } from '../components/settings/EndpointFields'
import { inviteStates } from '../components/settings/inviteCodeCopy'
import { InviteCodeSection } from '../components/settings/InviteCodeSection'
import { DefaultsSection } from '../components/settings/PreferencesSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { agentKeys, type AgentKey } from '../fixtures/agents'
import {
  accountLogins,
  endpointLogins,
  unlistedModelLogins,
  type AgentLogin,
  type AgentLogins,
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
    'ownEndpoint',
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
    /**
     * The own endpoint login: none, the open form on the own endpoint kind
     * with an empty address, with a typed address that the shared rule
     * changes before the save, or with an address that the rule refused, or
     * the logins after the connect. `unlisted` has those logins when the
     * model list of the proxy lacks a Claude model of the app. Except for
     * `none`, every connected login runs on Cal's proxy.
     */
    ownEndpoint: {
      enum: ['none', 'form', 'typed', 'refused', 'connected', 'unlisted'],
    },
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
  ownEndpoint: 'none',
  openSignUp: 'off',
}

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/** The saved logins of each state of the own endpoint login. */
function savedLogins(ownEndpoint: AccountState['ownEndpoint']): AgentLogins {
  if (ownEndpoint === 'none') return accountLogins
  return ownEndpoint === 'unlisted' ? unlistedModelLogins : endpointLogins
}

/** The logins of the agents in a state, without the agent of the form. */
function loginsFor(state: AccountState): AgentLogins {
  const logins: Partial<Record<AgentKey, AgentLogin>> = {}
  if (state.connections === 'not-connected') return logins
  const saved = savedLogins(state.ownEndpoint)
  for (const key of agentKeys) {
    const login = saved[key]
    if (login && key !== state.form) logins[key] = login
  }
  return logins
}

/** What the address field of the open own endpoint form holds in a state. */
const endpointEntries: Partial<
  Record<AccountState['ownEndpoint'], EndpointEntry>
> = { form: 'empty', typed: 'typed', refused: 'refused' }

/**
 * The Connect form that is open in a state. On the own endpoint kind, the
 * form leads to the logins on the proxy.
 */
function formFor(state: AccountState): OpenAgentForm | undefined {
  const { form, ownEndpoint } = state
  if (form === 'none') return undefined
  const endpoint = endpointEntries[ownEndpoint]
  if (endpoint) {
    return {
      agent: form,
      connectTo: paths.ownEndpointConnected,
      cancel: true,
      endpoint,
    }
  }
  return { agent: form, connectTo: paths.account, cancel: true }
}

/**
 * The General tab: the GitHub sign-in, and what every org shares, the
 * GitHub App and the agents, with the share setting of each login and the
 * host of an own endpoint, then the invite code of the user, last, so that
 * a phone shows the form of an agent near the top. The Mac app adds the
 * This Mac section.
 */
function GeneralTab(props: { state: AccountState }) {
  const mac = useMacApp()
  return (
    <>
      <SignInSection />
      {mac ? <ThisMacSection /> : null}
      <GitHubSection connected={props.state.connections === 'connected'} />
      <AgentsSection
        form={formFor(props.state)}
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
        <GeneralTab state={state} />
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
