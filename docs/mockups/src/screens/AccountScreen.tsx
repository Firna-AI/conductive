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
  type AgentLogins,
  type LoginKind,
} from '../fixtures/logins'
import { account, orgList, orgs } from '../fixtures/orgs'
import { paths } from '../paths'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['connections', 'form'],
  properties: {
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
    /**
     * The Connect form that is open. Its agent is not connected yet, and the
     * other agent is.
     */
    form: { enum: ['none', 'claude', 'codex'] },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

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
 * The account: the GitHub sign-in, and what every org shares. The GitHub
 * App, the agents, and the model of new workspaces. The product is free,
 * so the page shows no plan and no billing, and the sandbox provider stays
 * out of sight. The Mac app adds the This Mac section.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
}) {
  const { form } = props.state
  const mac = useMacApp()
  const connected = props.state.connections === 'connected'
  const openForm: OpenAgentForm | undefined =
    form === 'none'
      ? undefined
      : { agent: form, connectTo: paths.account, cancel: true }
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
      <AgentsSection form={openForm} logins={loginsFor(props.state)} />
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
