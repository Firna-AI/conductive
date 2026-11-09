import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  AgentsSection,
  DefaultsSection,
  GitHubSection,
  SignInSection,
  type OpenAgentForm,
} from '../components/settings/AccountSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { agentKeys, type AgentKey } from '../fixtures/agents'
import {
  accountLogins,
  loginKinds,
  type AgentLogins,
  type LoginKind,
} from '../fixtures/logins'
import { account, orgList, orgs } from '../fixtures/orgs'
import { paths } from '../paths'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['connections', 'codexLogin', 'form', 'shareChange'],
  properties: {
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
    /** The kind of the Codex login while Codex is connected. */
    codexLogin: { enum: loginKinds },
    /**
     * The Connect form that is open, and the kind that its switch selects:
     * the subscription token or the API key of Claude, or the API key or
     * the access token of Codex. Its agent is not connected yet, and the
     * other agent is.
     */
    form: {
      enum: ['none', 'claude', 'claude-api-key', 'codex', 'codex-token'],
    },
    /**
     * The last change of a share setting: none, or a change of the Claude
     * login that the app did not save.
     */
    shareChange: { enum: ['none', 'not-saved'] },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

/** The account with Claude and Codex connected, and no form open. */
export const connectedAccount: AccountState = {
  connections: 'connected',
  codexLogin: accountLogins.codex,
  form: 'none',
  shareChange: 'none',
}

type FormKey = Exclude<AccountState['form'], 'none'>

/**
 * The agent of each form and the kind that its switch selects, and where
 * Connect leads: to the account with that agent connected by that kind.
 */
const openForms: Readonly<Record<FormKey, OpenAgentForm>> = {
  claude: {
    agent: 'claude',
    kind: 'token',
    connectTo: paths.account,
    cancel: true,
  },
  'claude-api-key': {
    agent: 'claude',
    kind: 'api-key',
    connectTo: paths.account,
    cancel: true,
  },
  codex: {
    agent: 'codex',
    kind: 'api-key',
    connectTo: paths.account,
    cancel: true,
  },
  'codex-token': {
    agent: 'codex',
    kind: 'token',
    connectTo: paths.accountCodexToken,
    cancel: true,
  },
}

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/** The logins of the agents in a state, without the agent of the form. */
function loginsFor(state: AccountState): AgentLogins {
  const logins: Partial<Record<AgentKey, LoginKind>> = {}
  if (state.connections === 'not-connected') return logins
  const kinds = { ...accountLogins, codex: state.codexLogin }
  const formAgent = state.form === 'none' ? null : openForms[state.form].agent
  for (const key of agentKeys) {
    if (key !== formAgent) logins[key] = kinds[key]
  }
  return logins
}

/**
 * The account: the GitHub sign-in, and what every org shares. The GitHub
 * App, the agents with the share setting of each login, and the model of
 * new workspaces. The product is free, so the page shows no plan and no
 * billing, and the sandbox provider stays out of sight. The Mac app adds
 * the This Mac section.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
}) {
  const { form } = props.state
  const mac = useMacApp()
  const connected = props.state.connections === 'connected'
  const openForm = form === 'none' ? undefined : openForms[form]
  const mobile = props.viewport === 'mobile'
  const back = connected
    ? { label: 'Workspaces', to: paths.shell }
    : { label: 'Get started', to: paths.getStarted }
  const page = (
    <Page
      back={mobile ? back : undefined}
      subtitle={`@${account.login}`}
      title="Account"
      viewport={props.viewport}
    >
      <SignInSection />
      {mac ? <ThisMacSection /> : null}
      <GitHubSection connected={connected} />
      <AgentsSection
        form={openForm}
        logins={loginsFor(props.state)}
        shares={{
          notSaved: props.state.shareChange === 'not-saved' ? 'claude' : null,
        }}
      />
      <DefaultsSection />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  // The Mac app keeps the sidebar of the org beside the account.
  const sidebar = mac ? (
    <Sidebar
      org={orgs.acme}
      sections={workspaceSections(undefined, mac.needsInput)}
    />
  ) : undefined
  return (
    <AppFrame rail={connected ? connectedRail : firstRunRail} sidebar={sidebar}>
      {page}
    </AppFrame>
  )
}
