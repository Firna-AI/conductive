import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import {
  AgentsSection,
  DefaultsSection,
  GitHubSection,
  SignInSection,
} from '../components/settings/AccountSections'
import { account, orgList } from '../fixtures/orgs'
import { paths } from '../paths'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['connections'],
  properties: {
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/**
 * The account: the GitHub sign-in, and what every org shares. The GitHub
 * App, the agents, and the model of new workspaces. The app pays for the
 * cloud computers, so the page shows no plan and no billing, and the
 * sandbox provider stays out of sight.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
}) {
  const connected = props.state.connections === 'connected'
  const mobile = props.viewport === 'mobile'
  const back = connected
    ? { label: 'Workspaces', to: paths.shell }
    : { label: 'Create org', to: paths.createFirstOrg }
  const page = (
    <Page
      back={mobile ? back : undefined}
      subtitle={`@${account.login}`}
      title="Account"
      viewport={props.viewport}
    >
      <SignInSection />
      <GitHubSection connected={connected} />
      <AgentsSection connected={connected} />
      <DefaultsSection />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame rail={connected ? connectedRail : firstRunRail}>{page}</AppFrame>
  )
}
